import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { signupSchema, loginSchema, resetPasswordSchema, checkResetTokenSchema, twoFactorVerifySchema } from '@telnd/validation';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { authMiddleware } from '../middleware/auth';
import { sign, verify } from 'hono/jwt';
import { randomUUID } from 'node:crypto';
import { getLockoutState, isCurrentlyLockedOut, getRetryAfterSeconds, recordFailedAttempt, resetLockout, getFailedCount } from '../lib/loginLockout';
import { getIp } from '../lib/getIp';
import { attachLoginLocation } from '../lib/geoLocation';
import { checkPasswordToken, findUsablePasswordToken } from '../lib/passwordTokens';
import { isSmtpConfigured } from '../lib/email';
import { consumeRecoveryCode, rotateRecoveryCodes, unusedRecoveryCodeCount } from '../lib/recoveryCodes';
import { generateTotpSecret, otpauthUri, verifyTotp } from '../lib/totp';
import {
  countVerifyAttempt,
  clearVerifyAttempts,
  getSmsGateway,
  maskEmail,
  maskPhone,
  sendOtpToUser,
  smsSendFailure,
  toBdSmsNumber,
  twoFactorPolicyRequired,
  verifyOtp,
} from '../lib/twoFactor';

type AuthEnv = {
  Variables: {
    validatedData: any;
    user: any;
    jwtPayload: unknown;
  };
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
}

// Every token carries a fresh jti. Without it, two tokens signed in the
// same second for the same user are byte-identical (HS256 over an
// identical payload — exp only has second granularity), and the second
// insert dies on Session.token's unique constraint: a 500 on a
// double-clicked sign-in or a second device logging in at once. Tokens
// minted before this change (no jti) still verify.
const signAccess = (userId: string, role: string) =>
  sign(
    { sub: userId, jti: randomUUID(), role, type: 'access', exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 },
    getJwtSecret(),
  );
const signRefresh = (userId: string) =>
  sign(
    { sub: userId, jti: randomUUID(), type: 'refresh', exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 },
    getJwtSecret(),
  );

function setAuthCookie(c: any, name: string, value: string, maxAgeSeconds: number) {
  const isSecure = process.env.NODE_ENV === 'production';
  c.header('Set-Cookie', `${name}=${value}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax; HttpOnly${isSecure ? '; Secure' : ''}`, { append: true });
}

/**
 * Everything a *completed* sign-in does once credentials (and 2FA, when
 * enabled) have been proven: session + refresh rows, auth cookies, the
 * background location resolve and the last-login stamp. Returns the exact
 * payload the login endpoint has always responded with — the 2FA verify
 * route reuses it so both paths end identically.
 */
async function issueSession(c: any, user: any, ip: string) {
  const token = await signAccess(user.id, user.role);
  const refreshToken = await signRefresh(user.id);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      // Captured so the Security page can show Last login / Trusted devices.
      // "unknown" (no forwarding headers, e.g. local dev) is stored as null
      // and rendered as "Not recorded" instead of a fake address.
      ipAddress: ip === 'unknown' ? null : ip,
      userAgent: c.req.header('user-agent') || null,
    },
  });

  // Resolve the sign-in's city/country in the background (Security page
  // shows it with a flag) — never blocks or fails the login response.
  void attachLoginLocation(user.id, session.id, ip);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Include the admin panel role + permissions so the admin UI can show the
  // role badge and gate buttons without an extra request.
  const adminUser = await prisma.adminUser.findUnique({
    where: { userId: user.id },
    include: { role: true },
  });

  setAuthCookie(c, 'telnd_admin_token', token, 7 * 24 * 60 * 60);
  setAuthCookie(c, 'telnd_admin_refresh_token', refreshToken, 30 * 24 * 60 * 60);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      adminRole:
        adminUser && adminUser.isActive
          ? { name: adminUser.role.name, permissions: adminUser.role.permissions }
          : null,
    },
  };
}

export const authRoutes = new Hono<AuthEnv>();

authRoutes.post('/signup', rateLimit({ windowMs: 60000, max: 5 }), validate(signupSchema), async (c) => {
  const data = c.get('validatedData');
  const ip = getIp(c);

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: data.email },
        ...(data.phone ? [{ phone: data.phone }] : []),
      ],
    },
  });

  if (existingUser) {
    return c.json({
      success: false,
      error: {
        code: 'USER_EXISTS',
        message: 'An account with this email already exists',
      },
    }, 409);
  }

  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      passwordHash,
    },
  });

  const token = await signAccess(user.id, user.role);
  const refreshToken = await signRefresh(user.id);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      // Same device capture as login — the Security page's "Logged in
      // devices" list includes sessions created at signup.
      ipAddress: ip === 'unknown' ? null : ip,
      userAgent: c.req.header('user-agent') || null,
    },
  });
  void attachLoginLocation(user.id, session.id, ip);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  setAuthCookie(c, 'telnd_admin_token', token, 7 * 24 * 60 * 60);
  setAuthCookie(c, 'telnd_admin_refresh_token', refreshToken, 30 * 24 * 60 * 60);

  return c.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
    },
  }, 201);
});

authRoutes.post('/login', rateLimit({ windowMs: 60000, max: 10 }), validate(loginSchema), async (c) => {
  const data = c.get('validatedData');
  const identifier = data.email ?? data.phone;
  const ip = getIp(c);

  if (!identifier) {
    return c.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Email or phone required' } }, 400);
  }

  // Step 1: Check lockout BEFORE any DB lookup
  const lockoutState = await getLockoutState(identifier);
  if (isCurrentlyLockedOut(lockoutState)) {
    const retryAfter = getRetryAfterSeconds(lockoutState);
    c.header('Retry-After', String(retryAfter));
    return c.json({
      success: false,
      error: {
        code: 'ACCOUNT_LOCKED',
        message: 'Too many failed attempts. Please try again later.',
        retryAfter,
      },
    }, 429);
  }

  // Step 2: If 2+ failed attempts, require Turnstile CAPTCHA
  const failedCount = getFailedCount(lockoutState);
  if (failedCount >= 2) {
    // Check if CAPTCHA is enabled in settings
    let captchaEnabled = false;
    try {
      const captchaSetting = await prisma.setting.findUnique({ where: { key: 'captcha' } });
      if (captchaSetting) {
        const val = captchaSetting.value as any;
        captchaEnabled = val?.enabled === true;
      }
    } catch {
      // If settings unavailable, skip CAPTCHA check (fail open)
    }

    if (captchaEnabled && data.turnstileToken) {
      // Verify Turnstile token with Cloudflare
      const secretKey = process.env.TURNSTILE_SECRET_KEY;
      if (secretKey) {
        try {
          const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              secret: secretKey,
              response: data.turnstileToken,
            }),
          });
          const result = await resp.json() as { success: boolean };
          if (!result.success) {
            return c.json({
              success: false,
              error: { code: 'CAPTCHA_FAILED', message: 'CAPTCHA verification failed. Please try again.' },
            }, 400);
            }
        } catch {
          // Turnstile API unreachable — fail open
        }
      }
    } else if (captchaEnabled && !data.turnstileToken) {
      // CAPTCHA enabled but no token provided
      return c.json({
        success: false,
        error: { code: 'CAPTCHA_REQUIRED', message: 'CAPTCHA verification is required.' },
      }, 400);
    }
  }

  // Step 3: Look up user
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(data.email ? [{ email: data.email }] : []),
        ...(data.phone ? [{ phone: data.phone }] : []),
      ],
    },
  });

  if (!user) {
    await recordFailedAttempt(identifier, ip);
    return c.json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    }, 401);
  }

  // Step 4: Check if account is active
  if (!user.isActive) {
    return c.json({
      success: false,
      error: { code: 'ACCOUNT_DEACTIVATED', message: 'Your account has been deactivated. Please contact support.' },
    }, 403);
  }

  // Step 5: Verify credentials
  if (data.password) {
    if (!user.passwordHash) {
      await recordFailedAttempt(identifier, ip);
      return c.json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      }, 401);
    }
    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      await recordFailedAttempt(identifier, ip);
      return c.json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      }, 401);
    }
  }

  // Step 6: Success — reset lockout completely
  await resetLockout(identifier);

  // Step 7: Two-factor gate. An enabled second factor stops the sign-in
  // here — no session exists yet, only a 10-minute pending token in its
  // own cookie, and the /2fa screen takes over. With 2FA not set up yet
  // but required (global policy or a super admin's per-account demand),
  // the same gate opens on the enrollment screen instead: the operator
  // must finish setup before this account gets in.
  let needsEnrollment = false;
  if (!user.twoFactorEnabled) {
    // The policy lookup only matters while nothing is set up yet.
    needsEnrollment = user.twoFactorEnforced || (await twoFactorPolicyRequired());
  }
  if (user.twoFactorEnabled || needsEnrollment) {
    const pending = await sign(
      {
        sub: user.id,
        jti: randomUUID(),
        type: '2fa-pending',
        purpose: user.twoFactorEnabled ? '2fa' : '2fa-enroll',
        exp: Math.floor(Date.now() / 1000) + 10 * 60,
      },
      getJwtSecret(),
    );
    setAuthCookie(c, 'telnd_2fa_pending', pending, 10 * 60);
    return c.json({
      success: true,
      data: {
        requires2FA: true,
        requires2FAEnrollment: needsEnrollment,
        method: user.twoFactorEnabled ? user.twoFactorMethod : null,
      },
    });
  }

  const payload = await issueSession(c, user, ip);
  return c.json({ success: true, data: payload });
});

// ── Two-factor challenge (the /2fa screen) ───────────────────────────────
// Sign-in above stops at the gate and leaves `telnd_2fa_pending`; these
// routes run entirely on that cookie — no session exists yet.

async function readPendingTwoFactor(c: any): Promise<{ userId: string; purpose: '2fa' | '2fa-enroll' } | null> {
  const cookieHeader: string = c.req.header('Cookie') || '';
  const pending = cookieHeader
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('telnd_2fa_pending='))
    ?.split('=')
    .slice(1)
    .join('=');
  if (!pending) return null;
  try {
    const payload = await verify(pending, getJwtSecret(), 'HS256');
    if (!payload || !payload.sub || payload.type !== '2fa-pending') return null;
    const user = await prisma.user.findUnique({ where: { id: payload.sub as string } });
    // A suspended or deleted account loses its challenge mid-flight.
    if (!user || !user.isActive) return null;
    return { userId: user.id, purpose: payload.purpose === '2fa-enroll' ? '2fa-enroll' : '2fa' };
  } catch {
    return null;
  }
}

function clearPendingCookie(c: any) {
  c.header('Set-Cookie', 'telnd_2fa_pending=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly', { append: true });
}

function challengeExpired(c: any) {
  return c.json({
    success: false,
    error: { code: 'CHALLENGE_EXPIRED', message: 'Your sign-in attempt expired. Please sign in again.' },
  }, 401);
}

// What the /2fa screen renders on load: challenge vs. forced enrollment,
// the enrolled method, masked delivery addresses for SMS/email, and
// whether each channel is even an option right now.
authRoutes.post('/2fa/challenge', rateLimit({ windowMs: 60000, max: 30 }), async (c) => {
  const pending = await readPendingTwoFactor(c);
  if (!pending) return challengeExpired(c);
  const user = await prisma.user.findUnique({ where: { id: pending.userId } });
  if (!user) return challengeExpired(c);

  const [gateway, emailReady, recoveryLeft] = await Promise.all([
    getSmsGateway(),
    isSmtpConfigured(),
    // Only an enrolled challenge can spend one — an enrollment screen has
    // no set yet.
    pending.purpose === '2fa' ? unusedRecoveryCodeCount(user.id) : Promise.resolve(0),
  ]);
  return c.json({
    success: true,
    data: {
      requiresEnrollment: pending.purpose === '2fa-enroll',
      method: pending.purpose === '2fa' ? user.twoFactorMethod : null,
      phoneMasked: maskPhone(user.phone),
      smsAvailable: Boolean(toBdSmsNumber(user.phone)),
      smsConfigured: gateway.configured,
      emailMasked: maskEmail(user.email),
      emailAvailable: Boolean(user.email),
      emailConfigured: emailReady,
      recoveryCodesAvailable: recoveryLeft > 0,
    },
  });
});

// First half of authenticator-app enrollment: mint a fresh secret (stored
// with 2FA still off) and hand back the QR payload. Only the verification
// below flips the flag, so an abandoned attempt changes nothing.
authRoutes.post('/2fa/challenge/setup', rateLimit({ windowMs: 60000, max: 5 }), async (c) => {
  const pending = await readPendingTwoFactor(c);
  if (!pending) return challengeExpired(c);
  if (pending.purpose !== '2fa-enroll') {
    return c.json({
      success: false,
      error: { code: 'ALREADY_ENROLLED', message: 'Two-factor authentication is already set up for this account.' },
    }, 409);
  }
  const user = await prisma.user.findUnique({ where: { id: pending.userId } });
  if (!user) return challengeExpired(c);

  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret } });
  return c.json({
    success: true,
    data: {
      otpauthUri: otpauthUri({ secret, account: user.email || user.phone || 'admin' }),
      secret,
    },
  });
});

// Deliver the OTP — SMS or email — used both by the enrollment screens and
// by an enrolled OTP-method challenge (send + resend). An enrolled account
// always delivers to its stored method; an enrollment screen says which
// factor it is setting up in the body.
authRoutes.post('/2fa/challenge/send', rateLimit({ windowMs: 60000, max: 4 }), async (c) => {
  const pending = await readPendingTwoFactor(c);
  if (!pending) return challengeExpired(c);

  let channel: 'sms' | 'email' = 'sms';
  if (pending.purpose === '2fa') {
    const user = await prisma.user.findUnique({ where: { id: pending.userId }, select: { twoFactorMethod: true } });
    if (!user) return challengeExpired(c);
    channel = user.twoFactorMethod === 'email' ? 'email' : 'sms';
  } else {
    const body = await c.req.json().catch(() => null);
    if (body && typeof body === 'object' && (body as { method?: unknown }).method === 'email') {
      channel = 'email';
    }
  }

  // An active challenge is mid-sign-in; enrollment is the setup step.
  const result = await sendOtpToUser(pending.userId, channel, pending.purpose === '2fa' ? 'signin' : 'setup');
  if (result.ok) return c.json({ success: true, data: { sent: true } });

  const failure = smsSendFailure(result);
  if (failure.retryAfterSec) c.header('Retry-After', String(failure.retryAfterSec));
  return c.json({ success: false, error: { code: failure.code, message: failure.message } }, failure.status);
});

// Second half — verify the code and *then* complete the sign-in. Enrollment
// ends by flipping twoFactorEnabled on before the session is issued.
authRoutes.post('/2fa/challenge/verify', rateLimit({ windowMs: 60000, max: 12 }), validate(twoFactorVerifySchema), async (c) => {
  const pending = await readPendingTwoFactor(c);
  if (!pending) return challengeExpired(c);
  const body = c.get('validatedData');
  const user = await prisma.user.findUnique({ where: { id: pending.userId } });
  if (!user) return challengeExpired(c);

  // Brute-force cap per account (5 wrong tries → restart the sign-in),
  // layered on top of the per-IP rate limit above.
  if (countVerifyAttempt(user.id).blocked) {
    clearVerifyAttempts(user.id);
    clearPendingCookie(c);
    c.header('Retry-After', '900');
    return c.json({
      success: false,
      error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many incorrect codes. Please sign in again.' },
    }, 429);
  }

  let method: string;
  let ok = false;
  let otpReason: string | null = null;

  if (body.recoveryCode) {
    // The enrolled account's escape hatch: a single-use recovery code when
    // the method itself is gone (phone wiped, mailbox locked out,
    // authenticator uninstalled). Unknown, spent and malformed codes all
    // answer the same way, the attempt cap above already counted this try,
    // and a successful spend flows into the shared tail exactly like a
    // normal verify — including the backfill when it was the last one.
    if (pending.purpose !== '2fa') {
      return c.json({
        success: false,
        error: {
          code: 'RECOVERY_UNAVAILABLE',
          message: 'Recovery codes are created when two-factor authentication is set up. Enter the code from your method instead.',
        },
      }, 400);
    }
    const spent = await consumeRecoveryCode(user.id, body.recoveryCode);
    if (!spent) {
      return c.json({
        success: false,
        error: { code: 'INVALID_CODE', message: 'That recovery code is invalid or has already been used.' },
      }, 400);
    }
    method = 'recovery';
    ok = true;
  } else if (pending.purpose === '2fa') {
    // Already enrolled: the stored method decides what counts.
    method = user.twoFactorMethod || '';
    if (method === 'totp') {
      ok = Boolean(user.twoFactorSecret) && verifyTotp(user.twoFactorSecret!, body.code);
    } else if (method === 'sms' || method === 'email') {
      const result = verifyOtp(user.id, body.code);
      ok = result.ok;
      if (!result.ok) otpReason = result.reason;
    } else {
      return c.json({
        success: false,
        error: { code: 'TWO_FACTOR_UNAVAILABLE', message: 'Two-factor authentication is misconfigured for this account. Contact an administrator.' },
      }, 400);
    }
  } else {
    // Forced enrollment: the screen says which factor it just set up.
    method = body.method || '';
    if (method === 'totp') {
      if (!user.twoFactorSecret) {
        return c.json({
          success: false,
          error: { code: 'SETUP_REQUIRED', message: 'Set up your authenticator app first, then enter the code.' },
        }, 400);
      }
      ok = verifyTotp(user.twoFactorSecret, body.code);
    } else if (method === 'sms' || method === 'email') {
      const result = verifyOtp(user.id, body.code);
      ok = result.ok;
      if (!result.ok) otpReason = result.reason;
    } else {
      return c.json({
        success: false,
        error: { code: 'INVALID_METHOD', message: 'Choose an authenticator app, SMS codes, or email codes.' },
      }, 400);
    }
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

  clearVerifyAttempts(user.id);

  // A fresh set of recovery codes exists from the moment 2FA turns on —
  // this response is the only time they appear in plaintext, so the screen
  // must offer a save step before the session proceeds.
  let recoveryCodes: string[] | undefined;
  if (pending.purpose === '2fa-enroll') {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorMethod: method,
        // Only TOTP keeps a shared secret; SMS and email keep none.
        twoFactorSecret: method === 'totp' ? user.twoFactorSecret : null,
      },
    });
    if (user.role === 'ADMIN') {
      try {
        await prisma.adminAction.create({
          data: {
            adminId: user.id,
            action: 'TWO_FACTOR_ENABLED',
            targetType: 'user',
            targetId: user.id,
            details: { method },
            ipAddress: getIp(c),
            userAgent: c.req.header('user-agent') || undefined,
          },
        });
      } catch {
        // Audit must never fail the request itself.
      }
    }
    recoveryCodes = await rotateRecoveryCodes(user.id);
  } else if ((await unusedRecoveryCodeCount(user.id)) === 0) {
    // Backfill on an ordinary sign-in: an account enrolled before recovery
    // codes existed, or one whose last code was just spent above. Handing
    // a fresh set now is the right moment — the save screen shows once.
    recoveryCodes = await rotateRecoveryCodes(user.id);
  }

  clearPendingCookie(c);
  const payload = await issueSession(c, user, getIp(c));
  return c.json({ success: true, data: recoveryCodes ? { ...payload, recoveryCodes } : payload });
});

// Dry-run of an emailed set-password link. The reset page calls this the
// moment it opens so an expired or already-spent link says so up front —
// not after someone has typed a password and pressed submit. Never spends
// the token; the real validation still happens on the consume route below.
// 60/min on its own per-path bucket: a dead link costs one call (the page
// remembers verdicts per tab), and a reload loop on a *live* link may exhaust
// it — falling back to the form, which is the correct state for that link.
authRoutes.post('/reset-password/check', rateLimit({ windowMs: 60000, max: 60 }), validate(checkResetTokenSchema), async (c) => {
  const body = c.get('validatedData');
  const status = await checkPasswordToken(body.token, ['reset', 'invite']);
  if (status === 'valid') {
    return c.json({ success: true, data: {} });
  }
  if (status === 'expired') {
    return c.json({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'This link has expired. Ask your administrator to send a new one.' },
    }, 400);
  }
  return c.json({
    success: false,
    error: { code: 'TOKEN_INVALID', message: 'This link is invalid or has expired. Ask your administrator to send a new one.' },
  }, 400);
});

// Consume a reset/invite link and set the new password. Single-use is
// enforced inside one transaction: the token row is deleted alongside the
// new hash, and every session is revoked — the next sign-in must use the
// new password. The only way to receive such a link is a super admin's
// regenerate action, an admin invite, or the Security page while signed in —
// there is deliberately no unauthenticated "forgot password" entry point.
authRoutes.post('/reset-password', rateLimit({ windowMs: 60000, max: 5 }), validate(resetPasswordSchema), async (c) => {
  const body = c.get('validatedData');
  const row = await findUsablePasswordToken(body.token, ['reset', 'invite']);
  if (!row) {
    return c.json({
      success: false,
      error: { code: 'TOKEN_INVALID', message: 'This link is invalid or has expired. Ask your administrator to send a new one.' },
    }, 400);
  }
  const user = await prisma.user.findUnique({ where: { id: row.userId } });
  if (!user || !user.isActive) {
    await prisma.passwordToken.deleteMany({ where: { id: row.id } }).catch(() => {});
    return c.json({
      success: false,
      error: { code: 'TOKEN_INVALID', message: 'This link is invalid or has expired. Ask your administrator to send a new one.' },
    }, 400);
  }

  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash(body.password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      // Spending the token: a second use of the same link finds nothing.
      const consumed = await tx.passwordToken.deleteMany({ where: { id: row.id, usedAt: null } });
      if (consumed.count === 0) throw new Error('TOKEN_ALREADY_USED');
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      // Password changed out-of-band — every existing session is suspect.
      await tx.session.deleteMany({ where: { userId: user.id } });
      // ...and so is every refresh token: /api/auth/refresh trusts its row
      // alone (and will even create a fresh session), so leaving one alive
      // would let a stolen refresh token outlive the reset by up to 30 days
      // and quietly regain access with the OLD password having been changed.
      await tx.refreshToken.deleteMany({ where: { userId: user.id } });
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'TOKEN_INVALID', message: 'This link is invalid or has expired. Ask your administrator to send a new one.' },
    }, 400);
  }

  if (user.role === 'ADMIN') {
    try {
      await prisma.adminAction.create({
        data: {
          adminId: user.id,
          action: 'RESET_PASSWORD_VIA_LINK',
          targetType: 'user',
          targetId: user.id,
          details: { kind: row.kind },
          ipAddress: getIp(c),
          userAgent: c.req.header('user-agent') || undefined,
        },
      });
    } catch {
      // Audit must never fail the request itself.
    }
  }

  return c.json({ success: true, data: {} });
});

authRoutes.post('/refresh', rateLimit({ windowMs: 60000, max: 10 }), async (c) => {
  // Try cookie first, then body
  const cookieHeader = c.req.header('Cookie') || '';
  const refreshTokenFromCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('telnd_admin_refresh_token='))
    ?.split('=')
    .slice(1)
    .join('=');

  const body = await c.req.json().catch(() => null);
  const refreshToken = refreshTokenFromCookie || body?.refreshToken;

  if (!refreshToken) {
    return c.json({
      success: false,
      error: { code: 'INVALID_REQUEST', message: 'Refresh token required' },
    }, 400);
  }

  try {
    const payload = await verify(refreshToken, getJwtSecret(), 'HS256');

    if (!payload || !payload.sub || payload.type !== 'refresh') {
      return c.json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' },
      }, 401);
    }

    const storedRefresh = await prisma.refreshToken.findFirst({
      where: { token: refreshToken, userId: payload.sub as string },
      include: { user: true },
    });

    if (!storedRefresh || storedRefresh.expiresAt < new Date()) {
      return c.json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Refresh token expired' },
      }, 401);
    }

    // Rotate: delete old, issue new
    await prisma.refreshToken.delete({ where: { id: storedRefresh.id } });

    const newToken = await signAccess(storedRefresh.user.id, storedRefresh.user.role);
    const newRefreshToken = await signRefresh(storedRefresh.user.id);

    await prisma.session.update({
      where: { token: refreshToken },
      data: { token: newToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    }).catch(async () => {
      // If session with old token doesn't exist, create new one
      await prisma.session.create({
        data: {
          userId: storedRefresh.user.id,
          token: newToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    });

    await prisma.refreshToken.create({
      data: {
        userId: storedRefresh.user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    setAuthCookie(c, 'telnd_admin_token', newToken, 7 * 24 * 60 * 60);
    setAuthCookie(c, 'telnd_admin_refresh_token', newRefreshToken, 30 * 24 * 60 * 60);

    return c.json({
      success: true,
      data: {
        user: {
          id: storedRefresh.user.id,
          email: storedRefresh.user.email,
          firstName: storedRefresh.user.firstName,
          lastName: storedRefresh.user.lastName,
          role: storedRefresh.user.role,
          avatar: storedRefresh.user.avatar,
        },
      },
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' },
    }, 401);
  }
});

authRoutes.post('/logout', async (c) => {
  const cookieHeader = c.req.header('Cookie') || '';

  // Extract both tokens from cookies
  const tokenFromCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('telnd_admin_token='))
    ?.split('=')
    .slice(1)
    .join('=');

  const refreshTokenFromCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('telnd_admin_refresh_token='))
    ?.split('=')
    .slice(1)
    .join('=');

  // Delete session from DB
  if (tokenFromCookie) {
    await prisma.session.deleteMany({ where: { token: tokenFromCookie } }).catch(() => {});
  }

  // Delete refresh tokens from DB
  if (refreshTokenFromCookie) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshTokenFromCookie } }).catch(() => {});
  }

  // Clear both cookies
  c.header('Set-Cookie', 'telnd_admin_token=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly', { append: true });
  c.header('Set-Cookie', 'telnd_admin_refresh_token=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly', { append: true });

  return c.json({ success: true, data: { message: 'Logged out' } });
});

authRoutes.post('/otp/request', rateLimit({ windowMs: 60000, max: 3 }), async (c) => {
  return c.json({
    success: true,
    data: { message: 'OTP sent' },
  });
});

authRoutes.post('/otp/verify', rateLimit({ windowMs: 60000, max: 5 }), async (c) => {
  return c.json({
    success: true,
    data: { message: 'OTP verified' },
  });
});

// Current authenticated user, including admin role + permissions for the admin UI.
authRoutes.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
  }

  const adminUser = await prisma.adminUser.findUnique({
    where: { userId: user.id },
    include: { role: true },
  });

  // passwordHash and the TOTP secret never round-trip to the client.
  const { passwordHash, twoFactorSecret, ...safeUser } = user;

  return c.json({
    success: true,
    data: {
      ...safeUser,
      adminRole:
        adminUser && adminUser.isActive
          ? { name: adminUser.role.name, permissions: adminUser.role.permissions }
          : null,
    },
  });
});
