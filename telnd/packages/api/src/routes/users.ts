import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '@telnd/database';
import { authMiddleware, requireAdmin, hasPermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { updateAccountSchema, changePasswordSchema, twoFactorEnableSchema, twoFactorDisableSchema, twoFactorRecoveryRotateSchema } from '@telnd/validation';
import { sendPasswordResetEmail, isSmtpConfigured } from '../lib/email';
import { deleteRecoveryCodes, rotateRecoveryCodes, unusedRecoveryCodeCount } from '../lib/recoveryCodes';
import { issuePasswordToken, discardPasswordToken, adminUrl } from '../lib/passwordTokens';
import { getIp } from '../lib/getIp';
import { backfillSessionLocations } from '../lib/geoLocation';
import { clearPinAttempts, hashPin, normalizePin, pinPolicyRequired, requirePinApproval, verifySecurityPin } from '../lib/securityPin';
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
// are delivered to — empty string clears it. §14.53 split the identifiers:
// PORTAL sessions are refused below (they move through My Account's
// verified Sign-in-methods flows instead), while ADMIN sessions — the
// admin panel's Account page — keep the password-gated email/phone change
// (#6) — see the re-auth gate below.
// Profile update — also the re-auth gate for email/phone changes (#6), so
// the bucket counts password guesses: a stolen session can't brute-force
// currentPassword past the same 5/min the other credential checks use.
userRoutes.patch('/me', authMiddleware, rateLimit('user.profileUpdate'), validate(updateAccountSchema), async (c) => {
  const userId = c.get('userId') as string;
  const body = c.get('validatedData');

  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }

  // Would this request move a sign-in identifier? Both comparisons run
  // against the STORED values with the same normalization the write below
  // applies, so an unchanged field (or a phone "change" to the number it
  // already has) never trips the password gate. Clearing the phone counts
  // as a change — a hijacked session must not be able to silently drop the
  // number SMS 2FA codes are delivered to either.
  const nextPhone =
    body.phone !== undefined && typeof body.phone === 'string' && body.phone.trim()
      ? body.phone.trim()
      : null;
  const emailChanging = body.email !== undefined && body.email !== current.email;
  const phoneChanging = body.phone !== undefined && nextPhone !== current.phone;

  // §14.53, portal half: user sessions can no longer move identifiers
  // through here AT ALL — a portal phone must prove itself by OTP (My
  // Account's verified add flow), and a portal email the same, so an
  // unproven number can never reach a sign-in door and a passwordless
  // (phone or social) account isn't deadlocked behind a re-auth it can't
  // answer. The admin panel's own Account page keeps its password-gated
  // change below: ADMIN rows live behind the panel's email+password+2FA
  // door and never sign in by phone, so this path is theirs alone. The
  // refusal happens before the password gate — the answer is about
  // policy, not a credential the caller could retry.
  if ((emailChanging || phoneChanging) && current.role !== 'ADMIN') {
    return c.json({
      success: false,
      error: {
        code: 'IDENTIFIERS_READ_ONLY',
        message: 'Email and phone can only be changed from Sign-in methods in My Account.',
      },
    }, 403);
  }

  // Re-auth gate (#6): without it a stolen session could swap the email to
  // an attacker-controlled address, request a password reset there and take
  // the account over — or repoint `phone` so the SMS 2FA codes arrive on
  // the attacker's handset. Both identifiers therefore require the current
  // password, bcrypt-verified server-side. 401 (not 403/400) so the client
  // can tell "prove yourself again" apart from a plain validation error and
  // re-prompt. An invite that was never accepted has no passwordHash, so
  // there is nothing to verify against — same rejection, fail closed.
  // Name/avatar-only edits never reach this branch.
  if (emailChanging || phoneChanging) {
    const provided = body.currentPassword as string | undefined;
    if (!provided || !current.passwordHash) {
      return c.json({
        success: false,
        error: {
          code: 'REAUTH_REQUIRED',
          message: 'Enter your current password to change your sign-in email or phone.',
        },
      }, 401);
    }
    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(provided, current.passwordHash);
    if (!valid) {
      return c.json({
        success: false,
        error: {
          code: 'REAUTH_REQUIRED',
          message: 'Enter your current password to change your sign-in email or phone.',
        },
      }, 401);
    }
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
  if (body.email !== undefined) {
    data.email = body.email;
    // A moved address is an unconfirmed address: keep the fresh inbox from
    // inheriting the old one's "verified" badge until the new one proves it
    // receives mail at that destination (#6).
    if (emailChanging) data.isEmailVerified = false;
  }
  // Empty string is normalized to null so "remove photo" and "already empty"
  // end up in the same stored state.
  if (body.avatar !== undefined) data.avatar = body.avatar || null;
  if (body.phone !== undefined) {
    const phone = nextPhone;
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
    // A number change invalidates any OTP already sent to the old one…
    if (phone !== current.phone) {
      clearOtp(userId);
      // …and the NEW number never inherits the old one's proof (§14.53):
      // it arrived here with only a password behind it, so it must not
      // stay a phone-login identifier until an OTP has seen it. For
      // admin rows that changes nothing they use — SMS 2FA delivery
      // reads `phone`, not the flag — while portal phone doors (which
      // never reach this branch anymore) would refuse it anyway.
      data.isPhoneVerified = false;
    }
  }

  const user = await prisma.user.update({ where: { id: userId }, data });
  // Any reset link still pointing at the OLD address dies with the change,
  // so it can't be redeemed against the new identity (#6).
  if (emailChanging) await discardPasswordToken(userId, 'reset');
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
  rateLimit('user.changePassword'),
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
  rateLimit('user.regeneratePassword'),
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

// ── Security PIN (§14.44) — screen lock + sensitive-action approval ──────

// State for the Security page card and the lock screen: has one been set,
// and is one demanded (per-account by a super admin, or globally by the
// `pinPolicy` Setting).
userRoutes.get('/me/pin', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const token = c.get('token') as string;
  const [row, policy, session] = await Promise.all([
    prisma.adminUser.findUnique({
      where: { userId },
      select: { pinHash: true, pinRequired: true, role: { select: { permissions: true } } },
    }),
    pinPolicyRequired(),
    prisma.session.findUnique({ where: { token }, select: { lockedAt: true } }),
  ]);
  return c.json({
    success: true,
    data: {
      pinSet: Boolean(row?.pinHash),
      enforcedByAdmin: Boolean(row?.pinRequired),
      policyRequired: policy,
      canManagePolicy: hasPermission(row?.role, '*'),
      // Whether the session row is frozen right now (#33): the layout's
      // teardown reads it so a cleared storage flag cannot walk in — not
      // even for a frame before the first API call trips the guard.
      screenLocked: Boolean(session?.lockedAt),
    },
  });
});

// Set the PIN — only possible while none exists (a forgotten one comes off
// through an admin's reset, never silently replaced here, so a hijacked
// session can't swap the credential it doesn't know).
userRoutes.post(
  '/me/pin',
  authMiddleware,
  rateLimit('user.pin'),
  validate(z.object({ pin: z.string() })),
  async (c) => {
    const userId = c.get('userId') as string;
    const pin = normalizePin((c.get('validatedData') as { pin: string }).pin);
    if (!pin) {
      return c.json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'A security PIN must be exactly 4 digits.' },
      }, 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (user?.role !== 'ADMIN') {
      return c.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Security PINs are an admin-panel feature.' },
      }, 403);
    }
    const row = await prisma.adminUser.findUnique({ where: { userId } });
    if (!row) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Admin profile not found.' },
      }, 404);
    }
    if (row.pinHash) {
      return c.json({
        success: false,
        error: {
          code: 'PIN_EXISTS',
          message: 'A security PIN is already set. Ask an admin with permission to reset it first.',
        },
      }, 409);
    }

    await prisma.adminUser.update({
      where: { id: row.id },
      data: { pinHash: await hashPin(pin), pinSetAt: new Date(), pinAttempts: 0, pinWindowStart: null },
    });
    await clearPinAttempts(userId);
    await logSelfService(c, user, 'SECURITY_PIN_SET');
    return c.json({ success: true, data: { pinSet: true } });
  },
);

// Turn the PIN off — self-service, but only while nothing demands it (a
// super admin's per-account requirement or the global pinPolicy must be
// released first), and only through the approval gate: a hijacked session
// must not be able to silently drop the credential its own sensitive
// actions are gated behind. The requirement check runs before the gate on
// purpose — a doomed request should not walk the user through the modal
// to be told "release the requirement first" afterwards. Neither check
// writes, logs or mails anything when it rejects.
userRoutes.delete(
  '/me/pin',
  authMiddleware,
  rateLimit('user.pin'),
  async (c) => {
    const userId = c.get('userId') as string;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (user?.role !== 'ADMIN') {
      return c.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Security PINs are an admin-panel feature.' },
      }, 403);
    }
    const row = await prisma.adminUser.findUnique({ where: { userId } });
    if (!row) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Admin profile not found.' },
      }, 404);
    }
    if (!row.pinHash) {
      return c.json({
        success: false,
        error: { code: 'PIN_NOT_SET', message: 'No security PIN is set for this account.' },
      }, 404);
    }
    if (row.pinRequired || (await pinPolicyRequired())) {
      return c.json({
        success: false,
        error: {
          code: 'PIN_ENFORCED',
          message: 'Your security PIN is required for your account — release the requirement first.',
        },
      }, 403);
    }

    const pinGate = await requirePinApproval(c);
    if (pinGate) return pinGate;

    await prisma.adminUser.update({
      where: { id: row.id },
      data: { pinHash: null, pinSetAt: null, pinAttempts: 0, pinWindowStart: null },
    });
    await clearPinAttempts(userId);
    await logSelfService(c, user, 'SECURITY_PIN_CLEARED');
    return c.json({ success: true, data: { pinSet: false } });
  },
);

// Verify the PIN for the lock screen (and the approval modal's pre-check).
// 5 wrong tries in 15 minutes locks further attempts.
userRoutes.post(
  '/me/pin/verify',
  authMiddleware,
  rateLimit('user.pinVerify'),
  validate(z.object({ pin: z.string() })),
  async (c) => {
    const userId = c.get('userId') as string;
    const pin = normalizePin((c.get('validatedData') as { pin: string }).pin);
    if (!pin) {
      return c.json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'A security PIN must be exactly 4 digits.' },
      }, 400);
    }

    const result = await verifySecurityPin(userId, pin);
    if (result.ok) return c.json({ success: true, data: { valid: true } });
    if (result.reason === 'NOT_SET') {
      return c.json({
        success: false,
        error: { code: 'PIN_NOT_SET', message: 'No security PIN is set for this account.' },
      }, 404);
    }
    if (result.reason === 'LOCKED') {
      return c.json({
        success: false,
        error: { code: 'PIN_LOCKED', message: 'Too many wrong PIN attempts. Try again in 15 minutes.' },
      }, 429);
    }
    return c.json({
      success: false,
      error: { code: 'PIN_INVALID', message: 'Your security PIN is incorrect.' },
    }, 403);
  },
);

// First half of authenticator-app enrollment: mint a secret (2FA stays off
// until the code below is verified) and hand back the QR payload.
userRoutes.post('/me/2fa/setup', authMiddleware, rateLimit('user.twoFactorSetup'), async (c) => {
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
userRoutes.post('/me/2fa/send', authMiddleware, rateLimit('user.twoFactorSend'), async (c) => {
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
  rateLimit('user.twoFactorEnable'),
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
      const result = verifyOtp(userId, body.code, 'setup');
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
// 2FA is on; 3/min so a refresh loop can't churn out sets. Because it burns
// the victim's backups, it also demands a live code from the enrolled
// factor (#19) — a stolen session alone cannot destroy the old set.
userRoutes.post(
  '/me/2fa/recovery-codes',
  authMiddleware,
  rateLimit('user.twoFactorRecovery'),
  validate(twoFactorRecoveryRotateSchema),
  async (c) => {
    const userId = c.get('userId') as string;
    const body = c.get('validatedData') as { code: string };
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorMethod: true, twoFactorSecret: true },
    });
    if (!user) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
    }
    if (!user.twoFactorEnabled) {
      return c.json({
        success: false,
        error: { code: 'TWO_FACTOR_NOT_ENABLED', message: 'Turn on two-factor authentication first.' },
      }, 400);
    }

    // Proof of the factor itself: TOTP against the stored secret, or the
    // OTP the Security page sent with purpose 'verify' for an already
    // enabled account (see POST /me/2fa/send) for sms/email. Anything else
    // — missing, wrong, or a method with no verifiable material — fails
    // closed on the same error the disable route uses.
    let verified = false;
    if (user.twoFactorMethod === 'totp' && user.twoFactorSecret) {
      verified = verifyTotp(user.twoFactorSecret, body.code);
    } else if (user.twoFactorMethod === 'sms' || user.twoFactorMethod === 'email') {
      verified = verifyOtp(userId, body.code, 'verify').ok;
    }
    if (!verified) {
      return c.json({
        success: false,
        error: { code: 'VERIFICATION_FAILED', message: 'Enter the verification code from your two-factor method.' },
      }, 400);
    }

    const recoveryCodes = await rotateRecoveryCodes(userId);
    await logSelfService(c, c.get('user'), 'TWO_FACTOR_RECOVERY_CODES_REGENERATED', {});
    return c.json({ success: true, data: { recoveryCodes } });
  },
);

// Turn 2FA off: a LIVE code for the enrolled factor is the only proof —
// the account password alone must not do it (#37), or a session + password
// attacker could switch off the very barrier standing in their way.
// Disabled means wiped — re-enrolling starts from a fresh secret. Blocked
// while a super admin's per-account demand or the global policy is in force.
userRoutes.post(
  '/me/2fa/disable',
  authMiddleware,
  rateLimit('user.twoFactorDisable'),
  validate(twoFactorDisableSchema),
  async (c) => {
    const userId = c.get('userId') as string;
    const body = c.get('validatedData') as { code: string };
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

    // Proof of the enrolled factor ONLY (#37): TOTP against the stored
    // secret, or the OTP stamped with purpose 'verify' by /me/2fa/send for
    // an already-enabled account. No password fallback — possession of the
    // session and the sign-in password is exactly what 2FA must outlast.
    let verified = false;
    if (user.twoFactorMethod === 'totp' && user.twoFactorSecret) {
      verified = verifyTotp(user.twoFactorSecret, body.code);
    } else if (user.twoFactorMethod === 'sms' || user.twoFactorMethod === 'email') {
      verified = verifyOtp(userId, body.code, 'verify').ok;
    }
    if (!verified) {
      return c.json({
        success: false,
        error: { code: 'VERIFICATION_FAILED', message: 'Enter the verification code from your two-factor method.' },
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
