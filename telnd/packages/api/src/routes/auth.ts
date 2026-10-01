import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { signupSchema, loginSchema, resetPasswordSchema, checkResetTokenSchema, twoFactorVerifySchema, requestOtpSchema } from '@telnd/validation';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { authMiddleware } from '../middleware/auth';
import { sign, verify } from 'hono/jwt';
import { randomUUID } from 'node:crypto';
import { getLockoutState, isCurrentlyLockedOut, getRetryAfterSeconds, recordFailedAttempt, resetLockout, getFailedCount } from '../lib/loginLockout';
import { getIp } from '../lib/getIp';
import { attachLoginLocation } from '../lib/geoLocation';
import { notifyNewDeviceLogin, registerLoginDevice, describeLoginDevice } from '../lib/loginAlerts';
import { checkPasswordToken, findUsablePasswordToken } from '../lib/passwordTokens';
import { isSmtpConfigured } from '../lib/email';
import { consumeRecoveryCode, rotateRecoveryCodes, unusedRecoveryCodeCount } from '../lib/recoveryCodes';
import { generateTotpSecret, otpauthUri, verifyTotp } from '../lib/totp';
import { normalizePin, verifySecurityPin } from '../lib/securityPin';
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
    userId: string;
    token: string;
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

// Clearing must match setting exactly — flags that differ between the two
// directions (notably a missing Secure in production) let the browser keep
// the old cookie when a delete is meant to remove it (#22).
function clearAuthCookie(c: any, name: string) {
  const isSecure = process.env.NODE_ENV === 'production';
  c.header('Set-Cookie', `${name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${isSecure ? '; Secure' : ''}`, { append: true });
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

  // New-device alert: recognize the device and email the owner every
  // detail of the sign-in the first time it ever appears. Same rule as
  // the location resolve — fire-and-forget, never touches the response.
  void notifyNewDeviceLogin(user, ip, c.req.header('user-agent') || null);

  // Activity feed (§ Activity Logs → Login Activity): one row per
  // completed sign-in. Fire-and-forget like the hooks above — a log
  // write must never fail a login. issueSession is called exactly when
  // a session is issued for a sign-in (password login and the 2FA
  // challenge), so this never double-counts.
  void prisma.adminAction
    .create({
      data: {
        adminId: user.id,
        action: 'LOGIN',
        targetType: 'user',
        targetId: user.id,
        details: { device: describeLoginDevice(c.req.header('user-agent') || null).label },
        ipAddress: ip === 'unknown' ? null : ip,
        userAgent: c.req.header('user-agent') || undefined,
      },
    })
    .catch(() => {
      // Deliberately swallowed — see above.
    });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      // Rotation bookkeeping (#14): the row names the session it minted so
      // /refresh rotates THAT session's access token instead of piling up
      // new rows, and joins a per-sign-in family so a replayed (stale)
      // token can revoke the whole lineage at once.
      sessionId: session.id,
      familyId: randomUUID(),
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
      // The schema's lowercase enum ('candidate' | 'employer') never
      // matched UserRole's uppercase values — every signup died on
      // P2003/invalid-enum with a 500 (#35). Map explicitly; anything
      // unexpected falls back to the default rather than the database
      // deciding.
      role: data.role === 'employer' ? 'EMPLOYER' : 'CANDIDATE',
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
  // Recognize the signup device silently (no alert at account creation),
  // so the owner's real first sign-in afterwards is not announced as "new
  // device" when it is the very browser they just signed up from.
  void registerLoginDevice(user.id, c.req.header('user-agent') || null);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      // Same linkage as issueSession — see the #14 comment there.
      sessionId: session.id,
      familyId: randomUUID(),
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

  // Step 5: Verify credentials. loginSchema refines to exactly two shapes
  // — email+password or phone+otp — and BOTH are now verified here. The
  // defensive else-branch matters: before phone-OTP verification existed,
  // a phone+otp request skipped this step entirely (no password to check)
  // and walked straight into a session — the passwordless login bypass.
  // Anything that is not a proven credential is rejected, never ignored.
  if (data.password && data.email) {
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
  } else if (data.phone && data.otp) {
    // Phone sign-in: the code was delivered by /auth/otp/request and is
    // single-use, 5-minute, purpose-bound to 'login'. Every failure mode
    // (unknown phone above, wrong/expired/spent code, wrong purpose)
    // answers with the same generic 401 so responses never disclose
    // whether a phone number is registered.
    const otpResult = verifyOtp(user.id, data.otp, 'login');
    if (!otpResult.ok) {
      await recordFailedAttempt(identifier, ip);
      return c.json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      }, 401);
    }
  } else {
    // Unreachable while the schema refine holds — belt and braces so no
    // future schema loosening can ever re-open the unauthenticated path.
    await recordFailedAttempt(identifier, ip);
    return c.json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    }, 401);
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

// A consumed pending token's jti — a verified challenge's cookie must not
// be replayable for the rest of its 10-minute life from another client
// (#13). Kept in memory like every other auth ephemeral (single API
// instance; a restart can only shorten this window to the cookie's own
// remaining TTL, never extend it).
const consumedPendingJtis = new Map<string, number>(); // jti → expiry (ms)

function consumePendingJti(jti: string, expSec?: number): void {
  const now = Date.now();
  for (const [k, exp] of consumedPendingJtis) if (exp <= now) consumedPendingJtis.delete(k);
  consumedPendingJtis.set(jti, (expSec ?? Math.floor(now / 1000) + 600) * 1000);
}

async function readPendingTwoFactor(
  c: any,
): Promise<{ userId: string; purpose: '2fa' | '2fa-enroll'; jti: string } | null> {
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
    if (payload.jti && consumedPendingJtis.has(payload.jti as string)) return null;
    const user = await prisma.user.findUnique({ where: { id: payload.sub as string } });
    // A suspended or deleted account loses its challenge mid-flight.
    if (!user || !user.isActive) return null;
    return {
      userId: user.id,
      purpose: payload.purpose === '2fa-enroll' ? '2fa-enroll' : '2fa',
      jti: payload.jti as string,
    };
  } catch {
    return null;
  }
}

function clearPendingCookie(c: any) {
  clearAuthCookie(c, 'telnd_2fa_pending');
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

  // Brute-force cap per account (5 wrong tries → locked out for the rest
  // of the 15-minute window), layered on top of the per-IP rate limit
  // above. The counter deliberately survives the block: clearing it the
  // moment it triggered reset the cap on every hit and reduced this to a
  // plain rate limit — unlimited TOTP guessing at speed (#12). The sign-in
  // restarts (cookie cleared), but the account stays locked until the
  // window expires; only a correct code resets it below.
  if (countVerifyAttempt(user.id).blocked) {
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
    // Already enrolled: the stored method decides what counts. An OTP
    // only passes if it was sent for THIS challenge ('signin'), not for
    // the Security page or a phone sign-in (#38).
    method = user.twoFactorMethod || '';
    if (method === 'totp') {
      ok = Boolean(user.twoFactorSecret) && verifyTotp(user.twoFactorSecret!, body.code);
    } else if (method === 'sms' || method === 'email') {
      const result = verifyOtp(user.id, body.code, 'signin');
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
      // Enrollment half: only the code this setup screen sent ('setup')
      // can finish it (#38).
      const result = verifyOtp(user.id, body.code, 'setup');
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
  // The challenge is spent: its pending jti is burned so a copied cookie
  // cannot replay the rest of its 10-minute life from anywhere else (#13).
  consumePendingJti(pending.jti, Math.floor(Date.now() / 1000) + 10 * 60);

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

/**
 * Kill a refresh lineage after a replayed (already-used) token shows up:
 * every refresh row of the family goes, and with them every session any
 * row in it minted. With no family recorded (pre-fix rows) there is
 * nothing to attribute — revoke the account's tokens wholesale instead.
 * Best-effort: the caller's 401 is the security-relevant answer.
 */
async function revokeRefreshFamily(row: { userId: string; familyId: string | null; sessionId: string | null }) {
  try {
    if (row.familyId) {
      const family = await prisma.refreshToken.findMany({
        where: { familyId: row.familyId },
        select: { sessionId: true },
      });
      const sessionIds = family
        .map((f) => f.sessionId)
        .filter((id): id is string => Boolean(id));
      await prisma.refreshToken.deleteMany({ where: { familyId: row.familyId } });
      if (sessionIds.length > 0) {
        await prisma.session.deleteMany({ where: { id: { in: sessionIds } } });
      }
    } else {
      await prisma.refreshToken.deleteMany({ where: { userId: row.userId } });
      await prisma.session.deleteMany({ where: { userId: row.userId } });
    }
  } catch {
    // Best effort — the 401 below is what stops the replay.
  }
}

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

    // Reuse detection (#14): a row already spent. Either the token was
    // stolen and replayed or two requests raced the rotation — both get
    // the same verdict: the whole family dies (every descendant refresh
    // token and every session any of them issued), so neither copy keeps
    // working and the legitimate user just signs in again. Pre-fix rows
    // carry no family — fall back to revoking the account's tokens
    // wholesale rather than letting an unattributable replay pass.
    if (storedRefresh.usedAt) {
      await revokeRefreshFamily(storedRefresh);
      return c.json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Refresh token already used' },
      }, 401);
    }

    // Rotate in place: the old row stays behind as a tombstone (usedAt)
    // so a replay of it is recognisable above; the new row continues the
    // same family and keeps the session linkage.
    await prisma.refreshToken.update({ where: { id: storedRefresh.id }, data: { usedAt: new Date() } });

    const newToken = await signAccess(storedRefresh.user.id, storedRefresh.user.role);
    const newRefreshToken = await signRefresh(storedRefresh.user.id);

    // Rotate the linked session's access token instead of minting another
    // session: middleware matches Session.token, so the old access token
    // dies the moment this lands and the session count stays flat — the
    // old code's `update where token === refreshToken` could never match,
    // which is why every refresh silently accumulated a fresh session
    // (#14/#39).
    let sessionId = storedRefresh.sessionId;
    if (sessionId) {
      const rotated = await prisma.session.updateMany({
        where: { id: sessionId },
        data: { token: newToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      });
      // Session deleted since (logout/reset elsewhere) — recreate below.
      if (rotated.count === 0) sessionId = null;
    }
    if (!sessionId) {
      const created = await prisma.session.create({
        data: {
          userId: storedRefresh.user.id,
          token: newToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ipAddress: getIp(c) === 'unknown' ? null : getIp(c),
          userAgent: c.req.header('user-agent') || null,
        },
      });
      sessionId = created.id;
    }

    await prisma.refreshToken.create({
      data: {
        userId: storedRefresh.user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        sessionId,
        familyId: storedRefresh.familyId ?? randomUUID(),
      },
    });

    // Tombstones only matter while their token is still live; sweep the
    // expired ones opportunistically so the table doesn't grow forever.
    void prisma.refreshToken
      .deleteMany({ where: { usedAt: { not: null }, expiresAt: { lt: new Date() } } })
      .catch(() => {});

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

  // Clear both cookies — same flags they were set with, Secure included
  // in production (#22).
  clearAuthCookie(c, 'telnd_admin_token');
  clearAuthCookie(c, 'telnd_admin_refresh_token');

  return c.json({ success: true, data: { message: 'Logged out' } });
});

// Phone sign-in, half one: deliver a real login OTP. The code is minted
// with purpose 'login' (only Step 5 of /login can spend it), single-use,
// 5-minute, 45-send gap per account. The response is deliberately
// identical for registered and unregistered numbers — a request must
// never disclose whether a phone has an account — and delivery problems
// are logged server-side instead of echoed, for the same reason.
authRoutes.post('/otp/request', rateLimit({ windowMs: 60000, max: 3 }), validate(requestOtpSchema), async (c) => {
  const body = c.get('validatedData') as { phone: string };
  const user = await prisma.user.findFirst({
    where: { phone: body.phone },
    select: { id: true, isActive: true },
  });
  if (user?.isActive) {
    const result = await sendOtpToUser(user.id, 'sms', 'login');
    if (!result.ok) {
      // Re-send gap is normal (a fast double-click) and needs no answer;
      // real delivery failures are an operator problem, not the caller's.
      if (result.reason !== 'RESEND_SOON') {
        console.error(`[auth] login OTP delivery failed: ${result.reason}${result.message ? ` — ${result.message}` : ''}`);
      }
    }
  }
  return c.json({ success: true, data: { message: 'OTP sent' } });
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

// ── Screen lock, server side (§14.44, audit #33) ──────────────────────────
// The lock used to be a browser overlay with a localStorage flag — clear
// the flag and the app was yours. The flag now lives on the session row:
// /session/lock freezes it, authMiddleware refuses everything outside the
// lock's own endpoints while it is frozen, and /session/unlock is the only
// way to thaw it — with the PIN, never with the session alone.

authRoutes.post(
  '/session/lock',
  authMiddleware,
  rateLimit({ windowMs: 60000, max: 30 }),
  async (c) => {
    const token = c.get('token') as string;
    // Idempotent: the idle timer, the rail button, other tabs and the
    // SESSION_LOCKED recovery path all race to set it.
    await prisma.session.updateMany({ where: { token }, data: { lockedAt: new Date() } });
    return c.json({ success: true, data: { locked: true } });
  },
);

authRoutes.post(
  '/session/unlock',
  authMiddleware,
  rateLimit({ windowMs: 60000, max: 12 }),
  async (c) => {
    const token = c.get('token') as string;
    const userId = c.get('userId') as string;
    const body = await c.req.json().catch(() => null);
    const pin = normalizePin(body && typeof body === 'object' ? (body as { pin?: unknown }).pin : undefined);
    if (!pin) {
      return c.json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'A security PIN must be exactly 4 digits.' },
      }, 400);
    }

    // Same proof, same errors, same durable attempt cap as the lock
    // screen's old /users/me/pin/verify — this call replaces it, so a
    // stolen session still cannot thaw a lock it cannot answer for.
    const result = await verifySecurityPin(userId, pin);
    if (!result.ok) {
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
    }

    await prisma.session.updateMany({ where: { token }, data: { lockedAt: null } });
    return c.json({ success: true, data: { locked: false } });
  },
);
