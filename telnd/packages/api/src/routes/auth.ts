import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { signupCheckSchema, signupCompleteSchema, signupStartSchema, signupVerifyOtpSchema, loginSchema, resetPasswordSchema, checkResetTokenSchema, twoFactorVerifySchema, requestOtpSchema, forgotPasswordSchema, oauthVerifySchema, oauthLinkSchema, oauthUnlinkSchema } from '@telnd/validation';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { authMiddleware } from '../middleware/auth';
import { sign, verify } from 'hono/jwt';
import { randomUUID } from 'node:crypto';
import { getLockoutState, isCurrentlyLockedOut, getRetryAfterSeconds, recordFailedAttempt, resetLockout, getFailedCount } from '../lib/loginLockout';
import { getIp } from '../lib/getIp';
import { attachLoginLocation } from '../lib/geoLocation';
import { notifyNewDeviceLogin, registerLoginDevice, describeLoginDevice } from '../lib/loginAlerts';
import { checkPasswordToken, findUsablePasswordToken, issuePasswordToken, discardPasswordToken, portalUrl } from '../lib/passwordTokens';
import { isSmtpConfigured, sendPasswordResetEmail, sendLoginLinkEmail, sendSignupVerifyEmail } from '../lib/email';
import { mintSignupIntent, peekSignupIntent, takeSignupIntent, discardSignupIntent } from '../lib/signupIntents';
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
  sendOtpToPhone,
  sendOtpToEmailAddress,
  smsSendFailure,
  toBdSmsNumber,
  twoFactorPolicyRequired,
  verifyOtp,
} from '../lib/twoFactor';
import {
  buildAuthorizeUrl,
  burnFlowJti,
  exchangeCodeForProfile,
  isOAuthProvider,
  oauthClientConfig,
  oauthRedirectUri,
  OAuthFlowError,
  pkcePair,
  randomOAuthToken,
} from '../lib/oauth';
import type { OAuthProfile, OAuthProvider } from '../lib/oauth';

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

// ── Sign-in methods (Admin → Settings → Login Providers) ──────────────
// Those switches decide how USERS sign in on the portal. Admin sign-in
// never reads them (the gate below runs only for non-admin accounts), so
// turning portal email login off can never lock the operator out of the
// panel. A method nobody ever configured keeps its default: the built-in
// email/phone methods are on until switched off.
async function loginMethodEnabled(method: 'email' | 'phone' | 'emailLink'): Promise<boolean> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'loginProviders' } });
    const stored = (row?.value as Record<string, { enabled?: unknown } | undefined> | null)?.[method];
    if (!stored || typeof stored !== 'object') return true;
    return stored.enabled !== false;
  } catch {
    return true; // settings unreadable → default on, never lock sign-in out
  }
}

function methodDisabled(c: any, method: 'email' | 'phone' | 'emailLink') {
  const messages = {
    email: 'Sign in with email and password is currently disabled.',
    phone: 'Sign in with phone number is currently disabled.',
    emailLink: 'Sign in with an email login link is currently disabled.',
  };
  return c.json(
    { success: false, error: { code: 'METHOD_DISABLED', message: messages[method] } },
    403,
  );
}

// ── Which portal a sign-in belongs to ─────────────────────────────────────
// One account store, two front doors. The admin panel only lets ADMIN
// accounts with an ACTIVE admin profile through; the user portal refuses
// ADMIN accounts outright — an operator's session never rides into the
// user side, and a candidate's credentials never open the panel. The front
// end says which door it came from (`context` on /login, carried into the
// 2FA pending token); the ACCOUNT decides. Absent context (scripts, older
// clients) skips the check — it grants nothing: each door still enforces
// its own rules, this only makes the refusal happen at the door instead
// of after a session exists. Never called before the credential proved
// itself, so the answer is never a pre-auth oracle. Exported for the
// Sign-in-methods routes (§14.53), which re-assert the portal door on
// every call — an operator's session never reaches them either.
export async function doorError(
  user: { id: string; role: string },
  context: 'admin' | 'portal' | undefined,
): Promise<{ code: string; message: string } | null> {
  if (context === 'admin') {
    if (user.role !== 'ADMIN') {
      return {
        code: 'NOT_ADMIN',
        message: 'This account does not have administrator access.',
      };
    }
    const adminUser = await prisma.adminUser.findUnique({
      where: { userId: user.id },
      select: { isActive: true },
    });
    if (!adminUser?.isActive) {
      // Role says operator but the panel profile is missing or deactivated
      // — same refusal, so probing never distinguishes the two.
      return {
        code: 'NOT_ADMIN',
        message: 'This account does not have an active administrator profile.',
      };
    }
    return null;
  }
  if (context === 'portal' && user.role === 'ADMIN') {
    return {
      code: 'ADMIN_ACCOUNT',
      message: 'Administrator accounts sign in through the admin portal.',
    };
  }
  return null;
}

export const authRoutes = new Hono<AuthEnv>();

// What the portal's sign-in screens render: the Login Providers switches
// as plain booleans (defaults: the built-in methods on, OAuth off). Public
// on purpose — an anonymous visitor is the one choosing a method — and it
// can never leak a credential: only these six flags leave this endpoint.
authRoutes.get('/providers', async (c) => {
  const defaults = { email: true, emailLink: true, phone: true, google: false, facebook: false, linkedin: false };
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'loginProviders' } });
    const stored = (row?.value ?? {}) as Record<string, { enabled?: unknown } | undefined>;
    const out: Record<keyof typeof defaults, boolean> = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof typeof defaults)[]) {
      const v = stored[key];
      if (v && typeof v === 'object' && typeof v.enabled === 'boolean') out[key] = v.enabled;
    }
    return c.json({ success: true, data: out });
  } catch {
    return c.json({ success: true, data: defaults });
  }
});

// ── Sign-in-or-create, email half ────────────────────────────────────────
// No account for this address yet — the CHANNEL is what gets proven, with
// a 6-digit code to the mailbox (§14.49). The verification-link round is
// gone from this path: the password and the profile come AFTER the code,
// never before it, and this helper answers identically whether the call
// came from /login's unknown-email branch or /signup/start. Outside
// production the response also carries `devOtpCode` (the rule
// `devVerifyUrl` used to carry) — an API-level test seam for the automated
// suites: the portal never forwards nor renders it, and it cannot exist in
// production.
async function startEmailSignup(c: any, email: string) {
  const sent = await sendOtpToEmailAddress(email);
  if (!sent.ok) {
    if (sent.reason === 'RESEND_SOON') {
      // A live code is already in the mailbox — the resend gap refuses a
      // second send, and the first code still verifies. `resendAfter`
      // powers the wizard's countdown.
      return c.json({
        success: true,
        data: {
          requiresOtpVerification: true,
          maskedIdentifier: maskEmail(email),
          resendAfter: sent.retryAfterSec ?? 45,
        },
      });
    }
    // The known/unknown split is already disclosed by `accountExists` a
    // line above, so an honest delivery error hides nothing — and stops
    // nobody waiting on a code that never left the building.
    const mapped = smsSendFailure(sent);
    return c.json(
      { success: false, error: { code: mapped.code, message: mapped.message } },
      mapped.status,
    );
  }
  const devOnly = process.env.NODE_ENV !== 'production';
  return c.json({
    success: true,
    data: {
      requiresOtpVerification: true,
      maskedIdentifier: maskEmail(email),
      ...(sent.devCode && devOnly ? { devOtpCode: sent.devCode } : {}),
    },
  });
}

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

  // Step 3: Look up user. The phone clause carries `isPhoneVerified` —
  // only a PROVEN number is a login identifier. §14.53 removed the
  // wizard's phone field, so new signups can no longer store an
  // unverified number at all; the filter stays as defense in depth for
  // any legacy row (such a number answers exactly like an unknown one).
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(data.email ? [{ email: data.email }] : []),
        ...(data.phone ? [{ phone: data.phone, isPhoneVerified: true }] : []),
      ],
    },
  });

  if (!user) {
    // ── Sign-in-or-create: no account here yet ─────────────────────────
    // Login and signup are one flow: the credential can't be checked
    // against an account that doesn't exist, so the CHANNEL is what gets
    // proven instead — a 6-digit code to the mailbox for email, the OTP
    // for the phone — and the wizard afterwards (password → details →
    // Sign up) creates the account. Both halves answer only after their
    // method switch says the door is open (a switch never depends on the
    // account, so it still discloses nothing), and a wrong OTP keeps the
    // exact 401 an unknown account always had.
    if (data.email && data.password) {
      if (!(await loginMethodEnabled('email'))) return methodDisabled(c, 'email');

      // The password typed here is NOT kept: it is chosen again on the
      // wizard after the code proves the mailbox — that reordering is the
      // whole point of the OTP round (§14.49).
      return startEmailSignup(c, data.email);
    }

    if (data.phone && data.otp) {
      if (!(await loginMethodEnabled('phone'))) return methodDisabled(c, 'phone');
      // Unknown number's code lives in the phone-keyed OTP entry that
      // /auth/otp/request minted — every failure mode (no code, wrong,
      // expired, spent, wrong purpose) keeps the same generic 401.
      const otpResult = verifyOtp(`phone:${data.phone}`, data.otp, 'login');
      if (!otpResult.ok) {
        await recordFailedAttempt(identifier, ip);
        return c.json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        }, 401);
      }
      // The OTP proved the number — this token is what the name step
      // finishes with. No account, no session yet.
      const minted = mintSignupIntent({ channel: 'phone', phone: data.phone });
      return c.json({
        success: true,
        data: {
          requiresProfile: true,
          ...(minted.status === 'sent' ? { signupToken: minted.raw } : {}),
        },
      });
    }

    // Unreachable while the schema refine holds (email+password or
    // phone+otp) — belt and braces so a future schema loosening cannot
    // walk an unproven request straight into a response.
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

  // Step 6a: Which door did this sign-in start on? The credential proved
  // itself above, so refusing here discloses nothing an attacker could
  // not already learn by holding the password.
  const door = await doorError(user, data.context);
  if (door) {
    // §14.54: the portal's refusal of an ADMIN account never names the
    // account type. A correct password on the user side answers with the
    // EXACT 401 a wrong one gets — same code, same words, recorded as a
    // failed attempt like any other, so body AND lockout behaviour stay
    // indistinguishable from a plain wrong password. The panel's own door
    // (context 'admin', NOT_ADMIN wording) is the only place account
    // types ever speak.
    if (door.code === 'ADMIN_ACCOUNT') {
      await recordFailedAttempt(identifier, ip);
      return c.json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      }, 401);
    }
    return c.json({ success: false, error: door }, 403);
  }

  // Step 6b: The portal's Login Providers switches (email / phone) decide
  // whether this credential path is open to users right now — checked only
  // AFTER the password/OTP above verified, so a disabled method can never
  // become an account-existence oracle (a wrong password still answers
  // 401, identically to an unknown account). Admin accounts skip it: the
  // panel's sign-in does not read that section at all.
  if (user.role !== 'ADMIN' && !(await loginMethodEnabled(data.email ? 'email' : 'phone'))) {
    return methodDisabled(c, data.email ? 'email' : 'phone');
  }

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
        // The door rides along: when the challenge closes, it must still
        // be this account's door (§ doorError).
        ...(data.context ? { context: data.context } : {}),
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

// ── Starting the email proof (sign-in-or-create) ─────────────────────────
// The email step of the wizard asks for the address FIRST (§14.49) — this
// is where "no account here yet" is decided and where the 6-digit code
// goes out. Known address → `{ accountExists: true }` with no mail sent
// (the visitor carries on to the sign-in screen); unknown → a
// purpose-bound 'signup' code to the mailbox. The known/unknown split is
// already disclosed by that answer, so delivery problems are reported
// honestly here — and outside production the code comes back as
// `devOtpCode` (the hook `devVerifyUrl` used to carry).
authRoutes.post('/signup/start', rateLimit({ windowMs: 60000, max: 5 }), validate(signupStartSchema), async (c) => {
  const body = c.get('validatedData') as { email: string };

  // Creation obeys the switch that governs the channel it would be born
  // on — checked BEFORE existence is looked at, so a switched-off door
  // never discloses whether an address is taken.
  if (!(await loginMethodEnabled('email'))) return methodDisabled(c, 'email');

  const existing = await prisma.user.findFirst({ where: { email: body.email }, select: { id: true } });
  if (existing) return c.json({ success: true, data: { accountExists: true } });

  return startEmailSignup(c, body.email);
});

// Spend the emailed code and mint the one-time signup token. Every
// failure except "too many tries" answers the same generic 401 — no
// oracle separates "no code was ever sent here" from "wrong code" from
// "expired", and #38's purpose binding rules out spending a sign-in or
// reset code here. Success means the channel proof is COMPLETE: the
// wizard's password and profile steps come next, and only the finished
// /signup/complete ever creates a row.
authRoutes.post('/signup/verify-otp', rateLimit({ windowMs: 60000, max: 10 }), validate(signupVerifyOtpSchema), async (c) => {
  const body = c.get('validatedData') as { email: string; code: string };
  if (!(await loginMethodEnabled('email'))) return methodDisabled(c, 'email');

  const result = verifyOtp(`email:${body.email}`, body.code, 'signup');
  if (!result.ok) {
    if (result.reason === 'TOO_MANY_ATTEMPTS') {
      return c.json({
        success: false,
        error: { code: 'OTP_TOO_MANY_ATTEMPTS', message: 'Too many wrong codes. Please request a new one.' },
      }, 429);
    }
    return c.json({
      success: false,
      error: { code: 'OTP_INVALID', message: 'That code is invalid or has expired. Please try again.' },
    }, 401);
  }

  const minted = mintSignupIntent({ channel: 'email', email: body.email });
  if (minted.status !== 'sent') {
    // No mail rides on this mint (the code already proved the mailbox) —
    // 'throttled' can only mean a wizard run for this address is already
    // under 60 seconds old. Honest wait, nothing leaks.
    return c.json({
      success: false,
      error: { code: 'SIGNUP_WAIT', message: 'Please wait a minute, then request a new code.' },
    }, 429);
  }
  return c.json({
    success: true,
    data: { requiresProfile: true, signupToken: minted.raw },
  });
});

// ── Finishing a created account (sign-in-or-create) ──────────────────────
// The channel is already proven by the time these run: the emailed
// 6-digit code (email), the login-link click (link) or the phone OTP
// handed the caller a one-time signup token, and NOTHING about the
// account exists until /signup/complete succeeds — the intent store
// holds the half-finished signup in memory (§ lib/signupIntents). Both
// steps re-read the method switch that governs their channel: a door
// switched off after the proof went out still cannot mint an account
// through it.

// What the finish screen renders: which identifier the token is for (so
// the form can say who it is creating), or the "sign in instead" verdict
// when an account appeared since the link went out. Never spends the
// token — a reload must not burn it.
authRoutes.post('/signup/check', rateLimit({ windowMs: 60000, max: 20 }), validate(signupCheckSchema), async (c) => {
  const body = c.get('validatedData') as { token: string };
  const intent = peekSignupIntent(body.token);
  if (!intent) {
    return c.json({
      success: false,
      error: { code: 'SIGNUP_TOKEN_INVALID', message: 'This link is invalid or has expired. Please start again.' },
    }, 401);
  }
  const gate = intent.channel === 'phone' ? 'phone' : intent.channel === 'link' ? 'emailLink' : 'email';
  if (!(await loginMethodEnabled(gate))) return methodDisabled(c, gate);

  const existing = await prisma.user.findFirst({
    where: intent.email ? { email: intent.email } : { phone: intent.phone },
    select: { id: true },
  });
  if (existing) {
    // An account appeared since the token was minted (another door won
    // the race) — the finish screen turns into "sign in instead".
    return c.json({ success: true, data: { accountExists: true } });
  }
  return c.json({
    success: true,
    data: {
      valid: true,
      channel: intent.channel,
      identifier: intent.email ? maskEmail(intent.email) : maskPhone(intent.phone),
    },
  });
});

// Burn the token, create the account, sign it in. Single-use is enforced
// by the take itself: a rival tab or a replayed link finds nothing. One
// account, one role — every self-created account starts as a candidate;
// ADMIN only ever comes from the admin panel's own management.
/**
 * BD forms the profile field may arrive in (bare 10 digits, a leading 0,
 * `880…`, `+880…`) → the canonical `+880XXXXXXXXXX` the phone channel
 * stores; anything that is not a 10-digit national number → null.
 */
authRoutes.post('/signup/complete', rateLimit({ windowMs: 60000, max: 5 }), validate(signupCompleteSchema), async (c) => {
  const body = c.get('validatedData') as {
    token: string;
    firstName: string;
    lastName: string;
    password: string;
  };

  // Peek for the door check first so a refusal does not burn the token —
  // the take below still re-validates under the same process.
  const peeked = peekSignupIntent(body.token);
  if (!peeked) {
    return c.json({
      success: false,
      error: { code: 'SIGNUP_TOKEN_INVALID', message: 'This link is invalid or has expired. Please start again.' },
    }, 401);
  }
  const gate = peeked.channel === 'phone' ? 'phone' : peeked.channel === 'link' ? 'emailLink' : 'email';
  if (!(await loginMethodEnabled(gate))) return methodDisabled(c, gate);

  // §14.53: the wizard's profile step no longer accepts a phone number —
  // an identifier is proven at BINDING time, so a phone reaches the row
  // only through the phone door (OTP at signup) or My Account's verified
  // add flow. Unknown keys are stripped by the schema; there is nothing
  // to validate, refuse or store here.

  const intent = takeSignupIntent(body.token);
  if (!intent) {
    return c.json({
      success: false,
      error: { code: 'SIGNUP_TOKEN_INVALID', message: 'This link is invalid or has expired. Please start again.' },
    }, 401);
  }

  const identifierWhere = intent.email ? { email: intent.email } : { phone: intent.phone };
  const existing = await prisma.user.findFirst({ where: identifierWhere, select: { id: true } });
  if (existing) {
    return c.json({
      success: false,
      error: { code: 'USER_EXISTS', message: 'An account already exists for this address. Sign in instead.' },
    }, 409);
  }

  // The password arrived on the wizard's step AFTER the channel proof —
  // hashed here, at row time, exactly like every other account's.
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash(body.password, 12);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email: intent.email ?? null,
        // Phone channel → the OTP-proven identifier; email/link channel
        // → no number at all (§14.53: the wizard never types one).
        phone: intent.phone,
        firstName: body.firstName,
        lastName: body.lastName,
        role: 'CANDIDATE',
        passwordHash,
        // The channel that proved the address IS the verification —
        // an account is born verified by the door it walked through.
        isEmailVerified: intent.channel === 'email' || intent.channel === 'link',
        isPhoneVerified: intent.channel === 'phone',
      },
    });
  } catch (err) {
    // Lost the race between the check above and the insert: the unique
    // constraint decided — an account exists, so sign in instead. The
    // phone variant keeps its own wording (only a true race on the
    // phone CHANNEL's number can land here — §14.53 removed every other
    // way to type a number into this route).
    if ((err as { code?: string })?.code === 'P2002') {
      const target = (err as { meta?: { target?: unknown } })?.meta?.target;
      const lostPhoneRace = !!intent.phone && Array.isArray(target) && target.includes('phone');
      return c.json({
        success: false,
        error: lostPhoneRace
          ? { code: 'PHONE_IN_USE', message: 'That phone number is already on another account.' }
          : { code: 'USER_EXISTS', message: 'An account already exists for this address. Sign in instead.' },
      }, 409);
    }
    throw err;
  }

  // First sign-in of a brand-new account: recognize the device BEFORE the
  // session so the new-device alert does not fire at account creation —
  // the owner's real first sign-in afterwards is announced, this one is
  // not (the same rule the retired signup flow used).
  await registerLoginDevice(user.id, c.req.header('user-agent') || null);
  const payload = await issueSession(c, user, getIp(c));
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
): Promise<{ userId: string; purpose: '2fa' | '2fa-enroll'; jti: string; context?: 'admin' | 'portal' } | null> {
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
      // Only a door recorded at /login counts — legacy pendings simply
      // have none and skip the check (they predate the two-door rule).
      ...(payload.context === 'admin' || payload.context === 'portal'
        ? { context: payload.context as 'admin' | 'portal' }
        : {}),
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

  // The door that opened this challenge must still be the account's door
  // when it closes — a pending token minted on one portal never issues a
  // session for the other. Checked before any attempt is counted (a wrong
  // door is not a wrong code) and the pending cookie dies with the
  // refusal, so the sign-in restarts at the right login screen.
  const door = await doorError(user, pending.context);
  if (door) {
    clearPendingCookie(c);
    return c.json({ success: false, error: door }, 403);
  }

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
  // Phone login can be switched off in Admin → Settings → Login Providers.
  // Method-level gate — the answer depends on the switch alone, never on
  // whether the number has an account, so it discloses nothing.
  if (!(await loginMethodEnabled('phone'))) return methodDisabled(c, 'phone');
  const body = c.get('validatedData') as { phone: string };
  // Only a PROVEN number is a phone-login identifier. §14.53 removed the
  // wizard's phone field (nothing stores an unverified number anymore),
  // so this lookup is exact for every reachable row — the filter stays
  // as defense in depth for any legacy row, which behaves exactly like
  // one with no account (same byte-identical answer — the oracle doesn't
  // move). The OTP still reaches its owner; it just can't end in a
  // session on an account it never proved.
  //
  // The lookup itself sees ANY row holding the number (verified or not)
  // so an ADMIN row can be refused up front — §14.54: no code is minted,
  // no SMS goes out, and the answer names no reason: "Something is
  // wrong" reads like any other unusable-number reply, never that an
  // administrator account holds this number.
  const found = await prisma.user.findFirst({
    where: { phone: body.phone },
    select: { id: true, isActive: true, isPhoneVerified: true, role: true },
  });
  if (found?.role === 'ADMIN') {
    return c.json({
      success: false,
      error: { code: 'PHONE_UNAVAILABLE', message: 'Something is wrong. Try with another number.' },
    }, 400);
  }
  // Dev seam (§14.53): outside production the minted code rides back as
  // `devOtpCode` on BOTH branches — the anti-oracle response shape stays
  // identical (present on both / absent on both in production), and the
  // portal never forwards nor renders it. This is what lets the suites
  // finish a phone sign-in without a live SMS gateway.
  const devOnly = process.env.NODE_ENV !== 'production';
  let devOtpCode: string | undefined;
  if (found?.isPhoneVerified && found.isActive) {
    const result = await sendOtpToUser(found.id, 'sms', 'login');
    if (result.ok) {
      devOtpCode = result.devCode;
    } else if (result.reason !== 'RESEND_SOON') {
      // Re-send gap is normal (a fast double-click) and needs no answer;
      // real delivery failures are an operator problem, not the caller's.
      console.error(`[auth] login OTP delivery failed: ${result.reason}${result.message ? ` — ${result.message}` : ''}`);
    }
  } else if (!found?.isPhoneVerified) {
    // Sign-in-or-create: the number has no account yet (or only a legacy
    // unverified row, which is byte-identical to none), but the OTP still
    // goes out — verified against a phone-keyed store entry, which is what
    // lets /login hand back the profile token that CREATES the account.
    // The response stays byte-identical either way (and an inactive user
    // row sends nothing, as before), so this still cannot probe which
    // numbers are registered.
    const result = await sendOtpToPhone(body.phone);
    if (result.ok) {
      devOtpCode = result.devCode;
    } else if (result.reason !== 'RESEND_SOON') {
      console.error(`[auth] login OTP delivery failed (unregistered number): ${result.reason}${result.message ? ` — ${result.message}` : ''}`);
    }
  }
  return c.json({
    success: true,
    data: { message: 'OTP sent', ...(devOtpCode && devOnly ? { devOtpCode } : {}) },
  });
});

// ── Forgot password (portal self-service) ──────────────────────────────
// The caller gets the SAME answer whether or not an account exists ("If an
// account exists…"), so this endpoint can never be used to probe which
// addresses are registered. When an account does exist, a single-use
// 60-minute reset link goes out for the portal's reset page to spend. A
// delivery failure stays server-side too: the token is discarded (a link
// nobody received must not linger) and the generic answer stands.
authRoutes.post('/forgot-password', rateLimit({ windowMs: 60000, max: 5 }), validate(forgotPasswordSchema), async (c) => {
  const body = c.get('validatedData') as { email: string };
  const generic = {
    success: true,
    data: { message: 'If an account exists for that email, a password reset link is on its way.' },
  };
  try {
    const user = await prisma.user.findFirst({ where: { email: body.email } });
    // §14.54: no reset mail ever leaves for an ADMIN account — panel
    // recovery is issued from the admin side (invite / regenerate), and
    // the portal must treat that address exactly like one it has never
    // heard of: same generic body, no token row, no SMTP attempt.
    if (user?.isActive && user.role !== 'ADMIN') {
      const raw = await issuePasswordToken(user.id, 'reset');
      const emailed = await sendPasswordResetEmail({
        to: body.email,
        firstName: user.firstName,
        lastName: user.lastName,
        resetUrl: portalUrl(`/auth/reset-password?token=${raw}`),
        expiresLabel: '60 minutes',
      });
      if (!emailed) {
        await discardPasswordToken(user.id, 'reset').catch(() => {});
        console.error('[auth] forgot-password: reset email could not be delivered');
      }
    }
  } catch (err) {
    console.error('[auth] forgot-password request failed:', err);
  }
  return c.json(generic);
});

// ── Email login link (portal magic link) ───────────────────────────────
// Half one: mint + email a single-use 15-minute link. Same generic answer
// as forgot-password (no account-existence oracle); the emailLink switch
// from Admin → Settings → Login Providers gates it at the door — a
// method-level answer that says nothing about any account.
authRoutes.post('/login-link', rateLimit({ windowMs: 60000, max: 3 }), validate(forgotPasswordSchema), async (c) => {
  if (!(await loginMethodEnabled('emailLink'))) return methodDisabled(c, 'emailLink');
  const body = c.get('validatedData') as { email: string };
  const generic = {
    success: true,
    data: { message: 'If an account exists for that email, a sign-in link is on its way.' },
  };
  let devVerifyUrl: string | undefined;
  try {
    const user = await prisma.user.findFirst({ where: { email: body.email } });
    // §14.54: an ADMIN address is answered like a deactivated one — no
    // sign-in link, AND the create-branch below must not catch it (the
    // row exists, so `!user` is false): nothing is minted, nothing is
    // emailed, and the body stays byte-identical to any known address.
    if (user?.isActive && user.role !== 'ADMIN') {
      const raw = await issuePasswordToken(user.id, 'login');
      const emailed = await sendLoginLinkEmail({
        to: body.email,
        firstName: user.firstName,
        lastName: user.lastName,
        loginUrl: portalUrl(`/auth/login-link?token=${raw}`),
        expiresLabel: '15 minutes',
      });
      if (!emailed) {
        await discardPasswordToken(user.id, 'login').catch(() => {});
        console.error('[auth] login-link: sign-in email could not be delivered');
      }
    } else if (!user) {
      // Sign-in-or-create: the mailbox gets a CREATE-account link instead.
      // The response below stays byte-identical either way, so this
      // endpoint still cannot probe which addresses are registered — only
      // the mailbox itself ever learns which kind it received. An inactive
      // row (deactivated account) sends nothing, as before.
      const minted = mintSignupIntent({ channel: 'link', email: body.email });
      if (minted.status === 'sent') {
        const verifyUrl = portalUrl(`/auth/verify-email?token=${minted.raw}`);
        const emailed = await sendSignupVerifyEmail({
          to: body.email,
          verifyUrl,
          expiresLabel: '30 minutes',
        });
        const devOnly = process.env.NODE_ENV !== 'production';
        if (!emailed && !devOnly) {
          discardSignupIntent(minted.raw); // production: dead link, dead intent
        } else if (devOnly) {
          // DEV-ONLY test hook (see /login's email branch) — never in prod.
          devVerifyUrl = verifyUrl;
        }
      }
    }
  } catch (err) {
    console.error('[auth] login-link request failed:', err);
  }
  return c.json({
    ...generic,
    ...(devVerifyUrl ? { data: { ...generic.data, devVerifyUrl } } : {}),
  });
});

// Half two: the click. The token is spent by its own delete (single-use
// even under a race — a second redeem finds no row) and only then does a
// session appear, identical in shape to a password login's answer. The
// emailLink switch is re-checked here so a method switched off after the
// email went out still cannot open a session — without spending the token,
// so switching it back on makes the same link work again.
authRoutes.post('/login-link/verify', rateLimit({ windowMs: 60000, max: 10 }), validate(checkResetTokenSchema), async (c) => {
  if (!(await loginMethodEnabled('emailLink'))) return methodDisabled(c, 'emailLink');
  const body = c.get('validatedData') as { token: string };
  const invalid = () =>
    c.json(
      {
        success: false,
        error: { code: 'LINK_INVALID', message: 'This sign-in link is invalid or has expired. Please request a new one.' },
      },
      401,
    );

  const row = await findUsablePasswordToken(body.token, ['login']);
  if (!row) return invalid();
  const user = await prisma.user.findUnique({ where: { id: row.userId } });
  if (!user || !user.isActive) {
    // A suspended or deleted account's link dies with it.
    await prisma.passwordToken.deleteMany({ where: { id: row.id } }).catch(() => {});
    return invalid();
  }
  // This link belongs to the user portal — ADMIN accounts don't walk this
  // door (§ doorError). Checked before the token is spent, so the refusal
  // leaves the link intact instead of dead-ending an operator's mailbox.
  // §14.54: the refusal itself is generic too — an admin link answers
  // exactly like a dead one (same 401, no door wording, nothing spent),
  // so even a hand-delivered URL never names the account type.
  const door = await doorError(user, 'portal');
  if (door) return invalid();
  const consumed = await prisma.passwordToken.deleteMany({ where: { id: row.id, usedAt: null } });
  if (consumed.count === 0) return invalid(); // a rival click spent it first

  const payload = await issueSession(c, user, getIp(c));
  return c.json({ success: true, data: payload });
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

// ══════════════════════════════════════════════════════════════════════
// Social sign-in (§14.48: Google / Facebook / LinkedIn)
// ══════════════════════════════════════════════════════════════════════
// Four endpoints, one handshake:
//
//   GET  /oauth/:provider/start    mints the flow state → 302 to the provider
//   provider → GET <siteUrl>/auth/callback/:provider?code&state  (portal page)
//   POST /oauth/:provider/verify   exchanges the code, resolves/creates the account
//   POST /oauth/link               the proof screen — password attaches an identity
//   POST /oauth/unlink             detach, session-gated, never strand the account
//
// Everything that makes a callback "belong" to this server lives in ONE
// httpOnly cookie: a 10-minute JWT (JWT_SECRET) binding {state, nonce,
// PKCE verifier, provider}. `state` travels through the provider's URL as
// plain correlation; the verifier never leaves the server. Verify consumes
// the cookie on FIRST read — a replayed callback URL from another browser
// finds nothing — and matches provider + state exactly before so much as
// looking at the code. The exchange is server-side, with PKCE (S256) and
// the client secret; access/ID tokens are read once for the profile and
// dropped — no column even exists to keep them in (§ lib/oauth). Identity
// anchors on (provider, sub); a provider email attaches to, or routes
// toward, the proof screen ONLY when the provider marked it verified —
// never as a link credential on its own.

const OAUTH_LABELS: Record<string, string> = { google: 'Google', facebook: 'Facebook', linkedin: 'LinkedIn' };
function providerLabel(provider: string): string {
  return OAUTH_LABELS[provider] ?? provider;
}

/**
 * Read AND destroy the flow cookie in one motion. Single-use is the whole
 * point: a second verify — rival tab, replayed URL, a callback pasted
 * into another browser — finds it already gone, and anything malformed,
 * expired or of the wrong purpose dies here too.
 */
async function takeOAuthState(
  c: any,
): Promise<{ state: string; provider: string; verifier: string } | null> {
  const header = c.req.header('Cookie') || '';
  const entry = header
    .split(';')
    .map((part: string) => part.trim())
    .find((part: string) => part.startsWith('telnd_oauth='));
  clearAuthCookie(c, 'telnd_oauth');
  if (!entry) return null;
  const token = decodeURIComponent(entry.slice('telnd_oauth='.length));
  if (!token) return null;
  try {
    const payload = await verify(token, getJwtSecret(), 'HS256');
    if (
      payload.purpose !== 'oauth' ||
      typeof payload.state !== 'string' ||
      typeof payload.provider !== 'string' ||
      typeof payload.verifier !== 'string' ||
      typeof payload.jti !== 'string' ||
      // Burned on FIRST read — even a mismatched attempt kills the flow
      // (fail-closed): the second use of a captured cookie always dies.
      !burnFlowJti(payload.jti)
    ) {
      return null;
    }
    return { state: payload.state, provider: payload.provider, verifier: payload.verifier };
  } catch {
    return null;
  }
}

/**
 * The closing act every social path shares — /login's step 7 verbatim: an
 * enrolled second factor (or a still-pending enrollment) stops the
 * sign-in here with NO session, only the 10-minute pending cookie, and the
 * portal's /auth/2fa screen takes over. Social is a FIRST factor only;
 * `context: 'portal'` rides the token because these endpoints are the user
 * portal's door — an ADMIN identity can never close its challenge on the
 * panel side.
 */
async function finishSocialSignIn(c: any, user: any, ip: string) {
  let needsEnrollment = false;
  if (!user.twoFactorEnabled) {
    needsEnrollment = user.twoFactorEnforced || (await twoFactorPolicyRequired());
  }
  if (user.twoFactorEnabled || needsEnrollment) {
    const pending = await sign(
      {
        sub: user.id,
        jti: randomUUID(),
        type: '2fa-pending',
        purpose: user.twoFactorEnabled ? '2fa' : '2fa-enroll',
        context: 'portal',
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
}

/**
 * Social events land in the AuditLog: `social.signin` on every session a
 * provider identity opens (`created:` on the JIT birth sign-in),
 * `social.link` when an identity attaches, `social.unlink` when one is
 * detached. Best-effort — like the other auth logs here, a failed write
 * must never fail the sign-in.
 */
function writeSocialAudit(
  c: any,
  action: 'social.signin' | 'social.link',
  userId: string,
  identityId: string | null,
  provider: string,
  extra?: Record<string, string | boolean>,
) {
  return prisma.auditLog
    .create({
      data: {
        userId,
        action,
        targetType: 'identity',
        targetId: identityId,
        newValues: { provider, ...extra },
        ipAddress: getIp(c),
        userAgent: (c.req.header('User-Agent') || '').slice(0, 512) || null,
      },
    })
    .catch((err) => console.error(`[oauth] audit write failed (${action}):`, err));
}

type SocialResolution =
  | { kind: 'identity'; user: any; identityId: string }
  | { kind: 'linked'; user: any; identityId: string } // attached just now, visitor already signed in
  | { kind: 'link'; email: string; linkToken: string }
  | { kind: 'new'; user: any; identityId: string }
  | { kind: 'refused'; code: string; message: string };

/**
 * Where this provider identity lands — exactly five answers, in decision
 * order:
 *
 * 1. (provider, sub) already attached → THAT account, full stop. The
 *    email plays no part; subs never change owner.
 * 2. The visitor is signed in and the session's address IS the provider's
 *    verified one → attach directly: ownership proven twice (live session
 *    + verified mailbox), no password screen.
 * 3. No identity, but an account HOLDS the provider's verified email →
 *    the proof screen. Never attach on the match alone — a provider's view
 *    of an address is not proof the visitor controls the local account
 *    (the auto-link takeover this system refuses to build).
 * 4. Nothing exists → JIT-create a CANDIDATE + identity. The email rides
 *    along only when the provider vouched for it as verified; a provider
 *    that vouches for nothing still creates an account — an email-less
 *    one. ADMIN is unreachable through any of this (role fixed here +
 *    doorError in every branch).
 * 5. Refused — deactivated account or a door that isn't theirs (§ doorError).
 *
 * Both creations can race a rival callback (same sub, or the same
 * verified address in two tabs): the loser re-resolves against the
 * winner's rows instead of dying on a unique constraint.
 */
async function resolveSocialAccount(
  provider: OAuthProvider,
  profile: OAuthProfile,
  sessionUserId: string | null,
  depth = 0,
): Promise<SocialResolution> {
  // 1 ─ The anchor.
  const identity = await prisma.userIdentity.findUnique({
    where: { provider_sub: { provider, sub: profile.sub } },
    include: { user: true },
  });
  if (identity) {
    if (!identity.user.isActive) {
      return { kind: 'refused', code: 'ACCOUNT_DEACTIVATED', message: 'Your account has been deactivated. Please contact support.' };
    }
    const door = await doorError(identity.user, 'portal');
    if (door) return { kind: 'refused', code: door.code, message: door.message };
    return { kind: 'identity', user: identity.user, identityId: identity.id };
  }

  // 2 ─ Session-assisted attach: the signed-in account's address equals
  // the provider's VERIFIED one. (A session can only exist for an active
  // account, and doorError re-checks the door anyway — an ADMIN session
  // never gains a portal identity.)
  if (sessionUserId && profile.email && profile.emailVerified) {
    const sessionUser = await prisma.user.findUnique({ where: { id: sessionUserId } });
    if (sessionUser && sessionUser.isActive && sessionUser.email === profile.email) {
      const door = await doorError(sessionUser, 'portal');
      if (door) return { kind: 'refused', code: door.code, message: door.message };
      try {
        const created = await prisma.userIdentity.create({
          data: { userId: sessionUser.id, provider, sub: profile.sub, email: profile.email, lastLoginAt: new Date() },
        });
        return { kind: 'linked', user: sessionUser, identityId: created.id };
      } catch {
        // A rival click attached this sub between our checks — re-resolve
        // against the winner (depth-bounded: step 1 will settle it).
        if (depth < 2) return resolveSocialAccount(provider, profile, sessionUserId, depth + 1);
        throw new OAuthFlowError('OAUTH_SIGNIN_FAILED', 'The sign-in could not be completed. Please try again.');
      }
    }
  }

  // 3 ─ The proof screen, and only when the provider VERIFIED the address.
  if (profile.email && profile.emailVerified) {
    const holder = await prisma.user.findUnique({ where: { email: profile.email } });
    if (holder) {
      if (!holder.isActive) {
        return { kind: 'refused', code: 'ACCOUNT_DEACTIVATED', message: 'Your account has been deactivated. Please contact support.' };
      }
      const linkToken = await sign(
        {
          purpose: 'social-link',
          provider,
          sub: profile.sub,
          email: profile.email,
          exp: Math.floor(Date.now() / 1000) + 10 * 60,
        },
        getJwtSecret(),
      );
      return { kind: 'link', email: profile.email, linkToken };
    }
  }

  // 4 ─ JIT creation.
  let born: any;
  try {
    born = await prisma.user.create({
      data: {
        email: profile.email && profile.emailVerified ? profile.email : null,
        firstName: profile.givenName || 'Member',
        lastName: profile.familyName || '',
        role: 'CANDIDATE',
        isEmailVerified: Boolean(profile.email && profile.emailVerified),
      },
    });
  } catch {
    // Rival callback took the verified address first — re-resolve: the
    // winner's rows decide (identity → straight in, else proof screen).
    if (depth < 2) return resolveSocialAccount(provider, profile, sessionUserId, depth + 1);
    throw new OAuthFlowError('OAUTH_SIGNIN_FAILED', 'The sign-in could not be completed. Please try again.');
  }
  try {
    const created = await prisma.userIdentity.create({
      data: { userId: born.id, provider, sub: profile.sub, email: profile.email, lastLoginAt: new Date() },
    });
    return { kind: 'new', user: born, identityId: created.id };
  } catch {
    // A twin callback won the (provider, sub) race by milliseconds. This
    // shell has no session, no device, nothing — drop it, follow the winner.
    await prisma.user.delete({ where: { id: born.id } }).catch(() => {});
    if (depth < 2) return resolveSocialAccount(provider, profile, sessionUserId, depth + 1);
    throw new OAuthFlowError('OAUTH_SIGNIN_FAILED', 'The sign-in could not be completed. Please try again.');
  }
}

// ── 1. Start: mint state → hand the browser to the provider ────────────
authRoutes.get('/oauth/:provider/start', rateLimit({ windowMs: 60000, max: 20 }), async (c) => {
  const provider = c.req.param('provider') ?? '';
  if (!isOAuthProvider(provider)) {
    return c.json({
      success: false,
      error: { code: 'OAUTH_PROVIDER_UNSUPPORTED', message: 'That sign-in provider is not supported.' },
    }, 404);
  }
  const cfg = await oauthClientConfig(provider);
  if (!cfg.enabled) {
    return c.json({
      success: false,
      error: { code: 'METHOD_DISABLED', message: `Sign in with ${providerLabel(provider)} is currently disabled.` },
    }, 403);
  }
  if (!cfg.clientId || !cfg.clientSecret) {
    return c.json({
      success: false,
      error: { code: 'OAUTH_CONFIG_MISSING', message: `Sign in with ${providerLabel(provider)} is not configured yet.` },
    }, 400);
  }

  const redirectUri = await oauthRedirectUri(provider);
  const state = randomOAuthToken();
  const nonce = randomOAuthToken();
  const { verifier, challenge } = pkcePair();
  const flowCookie = await sign(
    { purpose: 'oauth', provider, state, nonce, verifier, jti: randomUUID(), exp: Math.floor(Date.now() / 1000) + 10 * 60 },
    getJwtSecret(),
  );
  setAuthCookie(c, 'telnd_oauth', flowCookie, 10 * 60);
  return c.redirect(
    buildAuthorizeUrl({ provider, clientId: cfg.clientId, redirectUri, state, nonce, codeChallenge: challenge }),
    302,
  );
});

// ── 2. Verify: exchange the code, resolve the account, open the door ───
authRoutes.post('/oauth/:provider/verify', rateLimit({ windowMs: 60000, max: 10 }), validate(oauthVerifySchema), async (c) => {
  const provider = c.req.param('provider') ?? '';
  if (!isOAuthProvider(provider)) {
    return c.json({
      success: false,
      error: { code: 'OAUTH_PROVIDER_UNSUPPORTED', message: 'That sign-in provider is not supported.' },
    }, 404);
  }
  const body = c.get('validatedData') as { code: string; state: string };

  // The cookie IS the flow — consumed here, matched exactly. No match →
  // the code is never even sent to the provider (a stolen callback URL is
  // worthless without this browser's cookie).
  const pending = await takeOAuthState(c);
  if (!pending || pending.provider !== provider || pending.state !== body.state) {
    return c.json({
      success: false,
      error: { code: 'OAUTH_STATE_INVALID', message: 'This sign-in attempt could not be verified. Please start again.' },
    }, 400);
  }

  // Both halves can have moved since start: the switch, the credentials.
  const cfg = await oauthClientConfig(provider);
  if (!cfg.enabled) {
    return c.json({
      success: false,
      error: { code: 'METHOD_DISABLED', message: `Sign in with ${providerLabel(provider)} is currently disabled.` },
    }, 403);
  }
  if (!cfg.clientId || !cfg.clientSecret) {
    return c.json({
      success: false,
      error: { code: 'OAUTH_CONFIG_MISSING', message: `Sign in with ${providerLabel(provider)} is not configured yet.` },
    }, 400);
  }

  let profile: OAuthProfile;
  try {
    profile = await exchangeCodeForProfile({
      provider,
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
      code: body.code,
      redirectUri: await oauthRedirectUri(provider),
      codeVerifier: pending.verifier,
    });
  } catch (err) {
    console.error(`[oauth] verify failed (${provider}):`, err instanceof Error ? err.message : err);
    const flow = err instanceof OAuthFlowError ? err : null;
    return c.json({
      success: false,
      error: {
        code: flow?.code ?? 'OAUTH_EXCHANGE_FAILED',
        message: flow?.message ?? 'The sign-in request could not be completed. Please try again.',
      },
    }, 400);
  }

  const ip = getIp(c);
  const sessionUserId = (c.get('userId') as string | undefined) ?? null;
  let resolution: SocialResolution;
  try {
    resolution = await resolveSocialAccount(provider, profile, sessionUserId);
  } catch (err) {
    console.error(`[oauth] account resolve failed (${provider}):`, err instanceof Error ? err.message : err);
    const flow = err instanceof OAuthFlowError ? err : null;
    return c.json({
      success: false,
      error: {
        code: flow?.code ?? 'OAUTH_SIGNIN_FAILED',
        message: flow?.code === 'ACCOUNT_DEACTIVATED' && flow.message
          ? flow.message
          : 'The sign-in could not be completed. Please try again.',
      },
    }, flow?.code === 'ACCOUNT_DEACTIVATED' ? 403 : 400);
  }

  if (resolution.kind === 'refused') {
    return c.json({ success: false, error: { code: resolution.code, message: resolution.message } }, 403);
  }

  if (resolution.kind === 'link') {
    return c.json({
      success: true,
      data: { requiresLink: true, provider, email: resolution.email, linkToken: resolution.linkToken },
    });
  }

  if (resolution.kind === 'linked') {
    // Already inside — only the connection happened. No new session, no
    // second 2FA round for a sign-in that didn't occur. The audit is
    // awaited (it can never fail: writeSocialAudit swallows its own
    // errors) so the row exists before the caller hears back.
    await writeSocialAudit(c, 'social.link', resolution.user.id, resolution.identityId, provider, { via: 'session' });
    return c.json({ success: true, data: { alreadySignedIn: true } });
  }

  if (resolution.kind === 'identity') {
    await prisma.userIdentity
      .update({ where: { id: resolution.identityId }, data: { lastLoginAt: new Date(), email: profile.email } })
      .catch(() => {});
    await writeSocialAudit(c, 'social.signin', resolution.user.id, resolution.identityId, provider);
    return finishSocialSignIn(c, resolution.user, ip);
  }

  // kind === 'new': the JIT account's first sign-in IS its birth, so this
  // device is pre-registered — no "new device" alert the moment it exists
  // (the same rule as /signup/complete).
  await registerLoginDevice(resolution.user.id, c.req.header('user-agent') || null).catch(() => {});
  await writeSocialAudit(c, 'social.signin', resolution.user.id, resolution.identityId, provider, { created: true });
  return finishSocialSignIn(c, resolution.user, ip);
});

// ── 3. Link proof: the local account's password attaches the identity ──
// The token only BINDS (provider, sub, email) from the callback — it is
// not a credential. The password is, checked under /login's exact ladder:
// lockout first, captcha from the second failure, wrong answers counted
// against the same identifier a password sign-in would use. Then the door
// re-runs (§ doorError — ADMIN never gains a portal identity) before the
// row attaches. Self-invalidating: once attached, a replay either finds
// the row on the same account (that IS the goal — sign-in proceeds) or
// refuses on someone else's (409).
authRoutes.post('/oauth/link', rateLimit({ windowMs: 60000, max: 5 }), validate(oauthLinkSchema), async (c) => {
  const body = c.get('validatedData') as { token: string; password: string; turnstileToken?: string };
  const payload = await verify(body.token, getJwtSecret(), 'HS256').catch(() => null);
  const provider = typeof payload?.provider === 'string' ? payload.provider : '';
  const sub = typeof payload?.sub === 'string' ? payload.sub : '';
  const email = typeof payload?.email === 'string' ? payload.email : '';
  if (!payload || payload.purpose !== 'social-link' || !isOAuthProvider(provider) || !sub || !email) {
    return c.json({
      success: false,
      error: { code: 'OAUTH_LINK_INVALID', message: 'This sign-in attempt expired. Please start again.' },
    }, 401);
  }

  // The method may have been switched off since the callback: off means
  // off, mid-flow or not.
  const cfg = await oauthClientConfig(provider);
  if (!cfg.enabled) {
    return c.json({
      success: false,
      error: { code: 'METHOD_DISABLED', message: `Sign in with ${providerLabel(provider)} is currently disabled.` },
    }, 403);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Deleted since the callback — same words as a dead token, no hint
    // about what used to be here.
    return c.json({
      success: false,
      error: { code: 'OAUTH_LINK_INVALID', message: 'This sign-in attempt expired. Please start again.' },
    }, 401);
  }
  if (!user.isActive) {
    return c.json({
      success: false,
      error: { code: 'ACCOUNT_DEACTIVATED', message: 'Your account has been deactivated. Please contact support.' },
    }, 403);
  }

  const ip = getIp(c);

  // Ladder, step 1: lockout BEFORE any password work.
  const lockoutState = await getLockoutState(email);
  if (isCurrentlyLockedOut(lockoutState)) {
    const retryAfter = getRetryAfterSeconds(lockoutState);
    c.header('Retry-After', String(retryAfter));
    return c.json({
      success: false,
      error: { code: 'ACCOUNT_LOCKED', message: 'Too many failed attempts. Please try again later.', retryAfter },
    }, 429);
  }

  // Ladder, step 2: captcha from the second failure on — /login's rule.
  const failedCount = getFailedCount(lockoutState);
  if (failedCount >= 2) {
    let captchaEnabled = false;
    try {
      const captchaSetting = await prisma.setting.findUnique({ where: { key: 'captcha' } });
      captchaEnabled = (captchaSetting?.value as { enabled?: unknown } | null)?.enabled === true;
    } catch {
      // settings unreadable → fail open, exactly like /login
    }
    if (captchaEnabled && body.turnstileToken) {
      const secretKey = process.env.TURNSTILE_SECRET_KEY;
      if (secretKey) {
        try {
          const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ secret: secretKey, response: body.turnstileToken }),
          });
          const result = (await resp.json()) as { success: boolean };
          if (!result.success) {
            return c.json({
              success: false,
              error: { code: 'CAPTCHA_FAILED', message: 'CAPTCHA verification failed. Please try again.' },
            }, 400);
          }
        } catch {
          // Turnstile unreachable → fail open, same as /login
        }
      }
    } else if (captchaEnabled && !body.turnstileToken) {
      return c.json({
        success: false,
        error: { code: 'CAPTCHA_REQUIRED', message: 'CAPTCHA verification is required.' },
      }, 400);
    }
  }

  // Ladder, step 3: the proof. No password on the account → none is
  // possible; the message is honest because the token already proved the
  // mailbox (sign in the usual way, then retry — the signed-in callback
  // attaches without asking again).
  if (!user.passwordHash) {
    return c.json({
      success: false,
      error: {
        code: 'PASSWORD_NOT_SET',
        message: `This account signs in without a password. Sign in your usual way first, then start the ${providerLabel(provider)} connection again.`,
      },
    }, 403);
  }
  const bcrypt = await import('bcryptjs');
  const passwordOk = await bcrypt.compare(body.password, user.passwordHash);
  if (!passwordOk) {
    await recordFailedAttempt(email, ip);
    return c.json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    }, 401);
  }
  await resetLockout(email);

  // The door, before anything attaches.
  const door = await doorError(user, 'portal');
  if (door) return c.json({ success: false, error: door }, 403);

  let identityId: string;
  let attached = false;
  const existing = await prisma.userIdentity.findUnique({ where: { provider_sub: { provider, sub } } });
  if (existing) {
    if (existing.userId !== user.id) {
      return c.json({
        success: false,
        error: {
          code: 'OAUTH_ALREADY_LINKED',
          message: `That ${providerLabel(provider)} account is already connected to a different account.`,
        },
      }, 409);
    }
    identityId = existing.id; // replay after success: same account — the goal
  } else {
    try {
      const created = await prisma.userIdentity.create({
        data: { userId: user.id, provider, sub, email: user.email, lastLoginAt: new Date() },
      });
      identityId = created.id;
      attached = true;
    } catch {
      // A rival click attached it between our check and the insert.
      return c.json({
        success: false,
        error: { code: 'OAUTH_ALREADY_LINKED', message: `That ${providerLabel(provider)} account is already connected.` },
      }, 409);
    }
  }

  if (attached) await writeSocialAudit(c, 'social.link', user.id, identityId, provider, { via: 'password' });
  await writeSocialAudit(c, 'social.signin', user.id, identityId, provider);
  return finishSocialSignIn(c, user, ip);
});

// ── 4. Unlink: detach, session-gated, never strand the account ─────────
authRoutes.post('/oauth/unlink', authMiddleware, rateLimit({ windowMs: 60000, max: 5 }), validate(oauthUnlinkSchema), async (c) => {
  const userId = c.get('userId') as string;
  const { provider } = c.get('validatedData') as { provider: OAuthProvider };

  const identity = await prisma.userIdentity.findFirst({ where: { userId, provider } });
  if (!identity) {
    return c.json({
      success: false,
      error: { code: 'OAUTH_NOT_LINKED', message: `No ${providerLabel(provider)} account is connected.` },
    }, 404);
  }

  // The account must keep a way back in: another identity, a password, or
  // a phone. Otherwise this button would be the last door closing on itself.
  const [otherIdentities, user] = await Promise.all([
    prisma.userIdentity.count({ where: { userId, id: { not: identity.id } } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);
  const stranded = otherIdentities === 0 && !user?.passwordHash && !user?.phone;
  if (stranded) {
    return c.json({
      success: false,
      error: {
        code: 'LAST_SIGNIN_METHOD',
        message: 'This is your only sign-in method — set a password or a phone number first.',
      },
    }, 403);
  }

  await prisma.userIdentity.delete({ where: { id: identity.id } });
  await prisma.auditLog
    .create({
      data: {
        userId,
        action: 'social.unlink',
        targetType: 'identity',
        targetId: identity.id,
        oldValues: { provider },
        ipAddress: getIp(c),
        userAgent: (c.req.header('User-Agent') || '').slice(0, 512) || null,
      },
    })
    .catch((err) => console.error('[oauth] audit write failed (social.unlink):', err));
  return c.json({ success: true, data: { unlinked: provider } });
});
