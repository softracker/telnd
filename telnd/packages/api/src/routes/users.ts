import { Hono } from 'hono';
import { appendFileSync } from 'node:fs';
import { prisma } from '@telnd/database';
import { authMiddleware, requireAdmin, hasPermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { updateAccountSchema, changePasswordSchema, twoFactorEnableSchema, twoFactorDisableSchema } from '@telnd/validation';
import { sendPasswordResetEmail, isSmtpConfigured } from '../lib/email';
import { deleteRecoveryCodes, rotateRecoveryCodes, unusedRecoveryCodeCount } from '../lib/recoveryCodes';
import { issuePasswordToken, discardPasswordToken, adminUrl } from '../lib/passwordTokens';
import { getIp } from '../lib/getIp';
import { backfillSessionLocations } from '../lib/geoLocation';
import { generateTotpSecret, otpauthUri, verifyTotp } from '../lib/totp';
import {
  clearOtp,
  getSmsGateway,
  maskEmail,
  maskPhone,
  sendOtpToUser,
  smsSendFailure,
  toBdSmsNumber,
  twoFactorPolicyRequired,
  verifyOtp,
} from '../lib/twoFactor';

type UsersEnv = {
  Variables: {
    user: any;
    userId: string;
    validatedData: any;
    admin: any;
    token: string;
  };
};

export const userRoutes = new Hono<UsersEnv>();

userRoutes.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      candidateProfile: true,
      companyOwner: true,
    },
  });

  if (!user) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' },
    }, 404);
  }

  // passwordHash and the TOTP secret never round-trip to the client.
  const { passwordHash, twoFactorSecret, ...safeUser } = user;

  return c.json({ success: true, data: safeUser });
});

// Own-account management: change name / email / phone (password changes are
// intentionally not handled here). The phone number is what SMS 2FA codes
// are delivered to — empty string clears it.
userRoutes.patch('/me', authMiddleware, validate(updateAccountSchema), async (c) => {
  const userId = c.get('userId') as string;
  const body = c.get('validatedData');

  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }

  if (body.email) {
    const existing = await prisma.user.findFirst({
      where: { email: body.email, NOT: { id: userId } },
    });
    if (existing) {
      return c.json({
        success: false,
        error: { code: 'CONFLICT', message: 'An account with this email already exists' },
      }, 409);
    }
  }

  const data: Record<string, unknown> = {};
  if (body.firstName !== undefined) data.firstName = body.firstName;
  if (body.lastName !== undefined) data.lastName = body.lastName;
  if (body.email !== undefined) data.email = body.email;
  // Empty string is normalized to null so "remove photo" and "already empty"
  // end up in the same stored state.
  if (body.avatar !== undefined) data.avatar = body.avatar || null;
  if (body.phone !== undefined) {
    const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null;
    if (phone) {
      const existing = await prisma.user.findFirst({
        where: { phone, NOT: { id: userId } },
      });
      if (existing) {
        return c.json({
          success: false,
          error: { code: 'CONFLICT', message: 'An account with this phone number already exists' },
        }, 409);
      }
    }
    data.phone = phone;
    // A number change invalidates any OTP already sent to the old one.
    if (phone !== current.phone) clearOtp(userId);
  }

  const user = await prisma.user.update({ where: { id: userId }, data });
  // passwordHash and the TOTP secret never round-trip to the client.
  const { passwordHash, twoFactorSecret, ...safeUser } = user;

  return c.json({ success: true, data: safeUser });
});

// Audit trail for panel admins only — a candidate changing their own
// credentials is not an admin action.
async function logSelfService(c: any, user: any, action: string, details?: unknown) {
  if (user?.role !== 'ADMIN') return;
  await prisma.adminAction.create({
    data: {
      adminId: user.id,
      action,
      targetType: 'user',
      targetId: user.id,
      details: (details as any) ?? undefined,
      ipAddress: getIp(c),
      userAgent: c.req.header('user-agent') || undefined,
    },
  });
}

// ============================================
// Security (self-service): password + trusted devices
// ============================================

// Active sessions, newest first — the "logged in devices" list on the
// Security page. The caller's own row is flagged so the UI can mark "This
// device" and never offer to revoke it. Device info predating IP/user-agent
// capture comes back null and renders as "Not recorded". Sessions that have
// an IP but no stored geolocation get it resolved here once (backfilled
// after the feature shipped) so the list shows city/country + flag.
userRoutes.get('/me/sessions', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const token = c.get('token') as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastLoginAt: true, lastLoginLocation: true, lastLoginCountryCode: true },
  });
  const sessions = await prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      token: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      location: true,
      countryCode: true,
    },
  });

  // Best-effort backfill; failures just leave the location empty.
  try {
    await backfillSessionLocations(sessions);
  } catch {
    /* ignore */
  }

  return c.json({
    success: true,
    data: {
      lastLoginAt: user?.lastLoginAt ?? null,
      lastLoginLocation: user?.lastLoginLocation ?? null,
      lastLoginCountryCode: user?.lastLoginCountryCode ?? null,
      sessions: sessions.map((s) => ({
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        location: s.location,
        countryCode: s.countryCode,
        isCurrent: s.token === token,
      })),
    },
  });
});

// Revoke one other device's session — deleting the row makes the auth
// middleware reject that device on its very next request.
userRoutes.delete('/me/sessions/:id', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const token = c.get('token') as string;
  const id = c.req.param('id');

  const session = await prisma.session.findFirst({ where: { id, userId } });
  if (!session) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } }, 404);
  }
  if (session.token === token) {
    return c.json({
      success: false,
      error: { code: 'CURRENT_SESSION', message: 'The current device cannot be signed out from this list.' },
    }, 400);
  }

  await prisma.session.delete({ where: { id } });
  await logSelfService(c, c.get('user'), 'REVOKE_SESSION');
  return c.json({ success: true, data: { revoked: 1 } });
});

// "Sign out of all other devices" — every session except the caller's own.
userRoutes.delete('/me/sessions', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const token = c.get('token') as string;

  const result = await prisma.session.deleteMany({
    where: { userId, NOT: { token } },
  });
  if (result.count > 0) {
    await logSelfService(c, c.get('user'), 'REVOKE_OTHER_SESSIONS', { revoked: result.count });
  }
  return c.json({ success: true, data: { revoked: result.count } });
});

// Change own password: the current one must be proven first; the new one is
// bcrypt-hashed server-side and never leaves the API. Rate-limited so the
// "current password" field can't be brute-forced from a stolen session.
userRoutes.post(
  '/me/change-password',
  authMiddleware,
  rateLimit({ windowMs: 60000, max: 5 }),
  validate(changePasswordSchema),
  async (c) => {
    const userId = c.get('userId') as string;
    const body = c.get('validatedData') as { currentPassword: string; newPassword: string };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
    }
    if (!user.passwordHash) {
      return c.json({
        success: false,
        error: { code: 'NO_PASSWORD', message: 'This account does not sign in with a password.' },
      }, 400);
    }

    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) {
      return c.json({
        success: false,
        error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Your current password is incorrect.' },
      }, 400);
    }

    // Re-submitting the current password is not a change: reject it as a
    // validation error — never a quiet 200, which would report "success"
    // to the admin AND revoke the other devices for no reason. Runs before
    // the transaction, so a rejected attempt revokes nothing.
    if (body.newPassword === body.currentPassword) {
      return c.json({
        success: false,
        error: { code: 'SAME_PASSWORD', message: 'Your new password must be different from your current password.' },
      }, 400);
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 12);

    // A password change revokes every OTHER sign-in: all other sessions go,
    // and so do other devices' refresh tokens — /api/auth/refresh trusts its
    // row alone, so one left alive would outlive the change exactly like it
    // used to outlive a link-based reset (§14.34). This device keeps both
    // its session and its own refresh cookie; with no cookie in the request
    // nothing can be exempted, so all refresh tokens are revoked (fail
    // closed — the changer is only re-authenticated at the next refresh).
    const currentRefresh = (c.req.header('Cookie') || '')
      .split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('telnd_admin_refresh_token='))
      ?.slice('telnd_admin_refresh_token='.length);

    const revoked = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      const sessions = await tx.session.deleteMany({
        where: { userId, NOT: { token: c.get('token') as string } },
      });
      const refreshes = await tx.refreshToken.deleteMany({
        where: { userId, ...(currentRefresh ? { NOT: { token: currentRefresh } } : {}) },
      });
      return { sessions: sessions.count, refreshes: refreshes.count };
    });

    await logSelfService(c, user, 'CHANGE_PASSWORD', {
      revokedOtherSessions: revoked.sessions,
      revokedOtherRefreshTokens: revoked.refreshes,
    });
    return c.json({ success: true, data: {} });
  },
);

// Self-service regeneration — the mirror of the super-admin's regenerate for
// others, now link-based: a single-use reset link (60-minute expiry, stored
// only as a hash) goes to this admin's OWN confirmed address instead of a
// temporary password, so no credential ever travels over email. Email-first:
// a failed send discards the fresh token and leaves the current password
// untouched. The signed-in session survives; the link is what unlocks a new
// password from any device.
userRoutes.post(
  '/me/regenerate-password',
  authMiddleware,
  requireAdmin,
  rateLimit({ windowMs: 60000, max: 5 }),
  async (c) => {
    const user = c.get('user');

    if (!user.email) {
      return c.json({
        success: false,
        error: { code: 'NO_EMAIL', message: 'This account has no email address, so a reset link cannot be delivered.' },
      }, 400);
    }

    const raw = await issuePasswordToken(user.id, 'reset');
    const emailed = await sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      resetUrl: adminUrl(`/reset-password?token=${raw}`),
      expiresLabel: '60 minutes',
    });

    if (!emailed) {
      // Email-first: a link nobody received must not stay live.
      await discardPasswordToken(user.id, 'reset');
      return c.json({
        success: false,
        error: {
          code: 'EMAIL_FAILED',
          message: 'The reset link could not be emailed, so the current password was left unchanged. Check the SMTP settings and try again.',
        },
      }, 502);
    }

    await logSelfService(c, user, 'REGENERATE_SELF_PASSWORD', { email: user.email });
    return c.json({ success: true, data: { email: user.email } });
  },
);

// ============================================
// Two-factor authentication (self-service — Security page)
// ============================================

// Current state: what's on, what's pending, whether SMS is even usable
// (phone on file + gateway configured), and who is allowed to turn it off
// (a required account can only be released by whoever required it).
userRoutes.get('/me/2fa', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }

  const [policyRequired, adminRole, gateway, emailReady, recoveryLeft] = await Promise.all([
    twoFactorPolicyRequired(),
    prisma.adminUser.findUnique({ where: { userId }, include: { role: true } }),
    getSmsGateway(),
    isSmtpConfigured(),
    unusedRecoveryCodeCount(userId),
  ]);

  // TEMPORARY DIAGNOSTIC: exactly what this request read and replied, so a
  // stale-UI report can be checked against what the browser actually got.
  try {
    appendFileSync(
      '/tmp/opencode/telnd_2fa_get.log',
      `${new Date().toISOString()} user=${userId.slice(0, 8)} dbEnabled=${user.twoFactorEnabled} replied=${user.twoFactorEnabled} ua=${(c.req.header('user-agent') || '-').slice(0, 40)}\n`,
    );
  } catch {
    // Never let diagnostics break the endpoint.
  }

  return c.json({
    success: true,
    data: {
      enabled: user.twoFactorEnabled,
      method: user.twoFactorMethod,
      // A secret generated by a setup that was never verified — the UI can
      // resume that enrollment instead of starting over.
      pendingSetup: !user.twoFactorEnabled && Boolean(user.twoFactorSecret),
      hasPhone: Boolean(user.phone),
      phoneMasked: maskPhone(user.phone),
      smsAvailable: Boolean(toBdSmsNumber(user.phone)),
      smsConfigured: gateway.configured,
      emailMasked: maskEmail(user.email),
      emailAvailable: Boolean(user.email),
      emailConfigured: emailReady,
      enforcedByAdmin: user.twoFactorEnforced,
      policyRequired,
      canDisable: user.twoFactorEnabled && !user.twoFactorEnforced && !policyRequired,
      canManagePolicy: hasPermission(adminRole?.role, '*'),
      // How many unused recovery codes are still in the set — the card
      // shows the count and nudges a regenerate once they run out.
      recoveryCodesRemaining: recoveryLeft,
    },
  });
});

// First half of authenticator-app enrollment: mint a secret (2FA stays off
// until the code below is verified) and hand back the QR payload.
userRoutes.post('/me/2fa/setup', authMiddleware, rateLimit({ windowMs: 60000, max: 5 }), async (c) => {
  const userId = c.get('userId') as string;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }
  if (user.twoFactorEnabled) {
    return c.json({
      success: false,
      error: { code: 'TWO_FACTOR_ALREADY_ENABLED', message: 'Two-factor authentication is already enabled.' },
    }, 409);
  }

  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });
  return c.json({
    success: true,
    data: { otpauthUri: otpauthUri({ secret, account: user.email || user.phone || 'admin' }), secret },
  });
});

// Deliver an OTP (enrollment proof or disable confirmation — the code is
// single-use either way). The body names the channel while enrolling; an
// already-enabled account derives it from the stored method.
userRoutes.post('/me/2fa/send', authMiddleware, rateLimit({ windowMs: 60000, max: 4 }), async (c) => {
  const userId = c.get('userId') as string;
  const body = await c.req.json().catch(() => null);
  const requested = body && typeof body === 'object' ? (body as { method?: unknown }).method : undefined;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true, twoFactorMethod: true },
  });

  const channel: 'sms' | 'email' =
    requested === 'sms' || requested === 'email'
      ? requested
      : user?.twoFactorEnabled && user.twoFactorMethod === 'email'
        ? 'email'
        : 'sms';

  // Enable panels send before 2FA is on (the email then says "setting
  // up"); a code requested on an already-protected account is a
  // confirmation instead, so it stays context-neutral.
  const result = await sendOtpToUser(userId, channel, user?.twoFactorEnabled ? 'verify' : 'setup');
  if (result.ok) return c.json({ success: true, data: { sent: true } });

  const failure = smsSendFailure(result);
  if (failure.retryAfterSec) c.header('Retry-After', String(failure.retryAfterSec));
  return c.json({ success: false, error: { code: failure.code, message: failure.message } }, failure.status);
});

// Turn 2FA on: prove the chosen factor works before it starts guarding
// sign-ins. The flag and method only flip on a correct code.
userRoutes.post(
  '/me/2fa/enable',
  authMiddleware,
  rateLimit({ windowMs: 60000, max: 10 }),
  validate(twoFactorEnableSchema),
  async (c) => {
    const userId = c.get('userId') as string;
    const body = c.get('validatedData') as { method: 'totp' | 'sms' | 'email'; code: string };
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
    }
    if (user.twoFactorEnabled) {
      return c.json({
        success: false,
        error: { code: 'TWO_FACTOR_ALREADY_ENABLED', message: 'Two-factor authentication is already enabled.' },
      }, 409);
    }

    let ok = false;
    let otpReason: string | null = null;
    if (body.method === 'totp') {
      if (!user.twoFactorSecret) {
        return c.json({
          success: false,
          error: { code: 'SETUP_REQUIRED', message: 'Set up your authenticator app first, then enter the code.' },
        }, 400);
      }
      ok = verifyTotp(user.twoFactorSecret, body.code);
    } else {
      const result = verifyOtp(userId, body.code);
      ok = result.ok;
      if (!result.ok) otpReason = result.reason;
    }

    if (!ok) {
      if (otpReason === 'EXPIRED' || otpReason === 'NO_OTP') {
        return c.json({ success: false, error: { code: 'OTP_EXPIRED', message: 'That code has expired. Send a new one.' } }, 400);
      }
      if (otpReason === 'TOO_MANY_ATTEMPTS') {
        return c.json({ success: false, error: { code: 'OTP_TOO_MANY_ATTEMPTS', message: 'Too many incorrect codes. Send a new one.' } }, 400);
      }
      return c.json({ success: false, error: { code: 'INVALID_CODE', message: 'Incorrect code. Please try again.' } }, 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorMethod: body.method,
        // Only TOTP keeps a shared secret; SMS and email keep none.
        twoFactorSecret: body.method === 'totp' ? user.twoFactorSecret : null,
      },
    });
    await logSelfService(c, c.get('user'), 'TWO_FACTOR_ENABLED', { method: body.method });
    // The first (and only) showing of the recovery codes — plaintext rides
    // in this response, storage keeps hashes.
    const recoveryCodes = await rotateRecoveryCodes(userId);
    return c.json({ success: true, data: { enabled: true, method: body.method, recoveryCodes } });
  },
);

// Regenerate the recovery-code set: every previously saved code is deleted
// in the process, which is what makes this a revocation as well as a
// refill. The plaintext appears only in this response. Available whenever
// 2FA is on; 3/min so a refresh loop can't churn out sets.
userRoutes.post(
  '/me/2fa/recovery-codes',
  authMiddleware,
  rateLimit({ windowMs: 60000, max: 3 }),
  async (c) => {
    const userId = c.get('userId') as string;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true } });
    if (!user) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
    }
    if (!user.twoFactorEnabled) {
      return c.json({
        success: false,
        error: { code: 'TWO_FACTOR_NOT_ENABLED', message: 'Turn on two-factor authentication first.' },
      }, 400);
    }
    const recoveryCodes = await rotateRecoveryCodes(userId);
    await logSelfService(c, c.get('user'), 'TWO_FACTOR_RECOVERY_CODES_REGENERATED', {});
    return c.json({ success: true, data: { recoveryCodes } });
  },
);

// Turn 2FA off: a live code for the current factor OR the account password
// proves possession (whichever the operator still has in hand). Disabled
// means wiped — re-enrolling starts from a fresh secret. Blocked while a
// super admin's per-account demand or the global policy is in force.
userRoutes.post(
  '/me/2fa/disable',
  authMiddleware,
  rateLimit({ windowMs: 60000, max: 10 }),
  validate(twoFactorDisableSchema),
  async (c) => {
    const userId = c.get('userId') as string;
    const body = c.get('validatedData') as { code?: string; password?: string };
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
    }
    if (!user.twoFactorEnabled) {
      return c.json({
        success: false,
        error: { code: 'TWO_FACTOR_NOT_ENABLED', message: 'Two-factor authentication is not enabled.' },
      }, 400);
    }

    const policyRequired = await twoFactorPolicyRequired();
    if (user.twoFactorEnforced || policyRequired) {
      return c.json({
        success: false,
        error: {
          code: 'TWO_FACTOR_REQUIRED',
          message: user.twoFactorEnforced
            ? 'Two-factor authentication is required for this account by an administrator.'
            : 'Two-factor authentication is required for all admin accounts and cannot be turned off.',
        },
      }, 403);
    }

    let verified = false;
    if (body.code) {
      if (user.twoFactorMethod === 'totp' && user.twoFactorSecret) {
        verified = verifyTotp(user.twoFactorSecret, body.code);
      } else if (user.twoFactorMethod === 'sms' || user.twoFactorMethod === 'email') {
        verified = verifyOtp(userId, body.code).ok;
      }
    }
    if (!verified && body.password && user.passwordHash) {
      const bcrypt = await import('bcryptjs');
      verified = await bcrypt.compare(body.password, user.passwordHash);
    }
    if (!verified) {
      return c.json({
        success: false,
        error: { code: 'VERIFICATION_FAILED', message: 'The verification code or password is incorrect.' },
      }, 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorMethod: null, twoFactorSecret: null },
    });
    clearOtp(userId);
    // Codes are meaningless without the second factor — they die with it.
    await deleteRecoveryCodes(userId);
    await logSelfService(c, c.get('user'), 'TWO_FACTOR_DISABLED', {});
    return c.json({ success: true, data: {} });
  },
);

userRoutes.get('/me/applications', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId },
    include: {
      applications: {
        include: { job: { include: { company: true } } },
        orderBy: { appliedAt: 'desc' },
      },
    },
  });

  return c.json({
    success: true,
    data: (profile as any)?.applications || [],
  });
});
