// ── Sign-in methods (§14.53) ──────────────────────────────────────────────
// My Account's verified identifier flows: a signed-in user ADDS a phone
// (OTP to the handset) or an email (OTP to the mailbox — plus a password
// when the account doesn't have one yet, no skip). Three rules shape
// every answer:
//
// - Uniform starts: `start` replies identically whether or not the
//   identifier belongs to someone else — the "already in use" verdict
//   lands only AFTER the OTP proves possession of it, so these routes
//   can never be used to probe which numbers/addresses have accounts.
// - Own-state checks come early and cost nothing: "your slot is already
//   filled" and "choose a password first" are facts the caller's own
//   session already implies, so they may answer before the code is
//   spent (the password refusal leaves the code live).
// - Add-only: changing an identifier is a later round — it additionally
//   needs proof of the OLD one. The write re-checks uniqueness against
//   other rows (P2002 → 409) so a race can't double-attach.
//
// Codes are purpose-bound under their own keys (`acct-phone:` /
// `acct-email:`) — a login or signup code never opens these doors, and
// these codes never open a sign-in. ADMIN sessions are refused outright
// (doorError): the two-door standard keeps admin rows out of portal
// self-service entirely.

import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import {
  accountEmailStartSchema,
  accountEmailVerifySchema,
  accountPhoneStartSchema,
  accountPhoneVerifySchema,
} from '@telnd/validation';
import { doorError } from './auth';
import {
  clearOtp,
  normalizeSignupPhone,
  sendOtpToEmailAddress,
  sendOtpToPhone,
  smsSendFailure,
  verifyOtp,
  type SmsSendFailure,
} from '../lib/twoFactor';

type AccountEnv = {
  Variables: {
    user: any;
    userId: string;
    validatedData: any;
    token: string;
  };
};

export const accountRoutes = new Hono<AccountEnv>();

/** The portal door, before anything touches the row (§ two-door). */
async function portalDoor(c: any): Promise<Response | null> {
  const user = c.get('user') as { id: string; role: string } | undefined;
  if (!user) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
  }
  const door = await doorError(user, 'portal');
  if (door) return c.json({ success: false, error: door }, 403);
  return null;
}

/** One mapper for every OTP spend in this file (wording matches /signup/verify-otp). */
function otpFailure(c: any, result: { ok: false; reason: string }): Response {
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

/** Delivery failures → status + message + Retry-After (shared mapping). */
function sendFailure(c: any, sent: SmsSendFailure): Response {
  const failure = smsSendFailure(sent);
  if (failure.retryAfterSec) c.header('Retry-After', String(failure.retryAfterSec));
  return c.json({ success: false, error: { code: failure.code, message: failure.message } }, failure.status);
}

// ── GET /account/methods ──────────────────────────────────────────────────
// What the Sign-in methods section renders: which identifiers exist and
// whether they are proven, whether a password is set, and the connected
// social identities. Own data only, over the caller's own session.
accountRoutes.get('/methods', authMiddleware, async (c) => {
  const refused = await portalDoor(c);
  if (refused) return refused;
  const userId = c.get('userId') as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, isEmailVerified: true, phone: true, isPhoneVerified: true, passwordHash: true },
  });
  if (!user) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }
  const identities = await prisma.userIdentity.findMany({
    where: { userId },
    select: { provider: true, createdAt: true, lastLoginAt: true },
    orderBy: { createdAt: 'asc' },
  });

  return c.json({
    success: true,
    data: {
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      phone: user.phone,
      isPhoneVerified: user.isPhoneVerified,
      hasPassword: user.passwordHash !== null,
      identities,
    },
  });
});

// ── POST /account/phone/start ─────────────────────────────────────────────
// Sends the attach code to the number the user typed. The answer does
// not depend on whether some OTHER row already owns that number — an
// account oracle would live right here otherwise. SMS cost bounds the
// bucket to 3/min (the same budget /otp/request keeps).
accountRoutes.post(
  '/phone/start',
  authMiddleware,
  rateLimit('account.phoneStart'),
  validate(accountPhoneStartSchema),
  async (c) => {
    const refused = await portalDoor(c);
    if (refused) return refused;
    const userId = c.get('userId') as string;
    const body = c.get('validatedData') as { phone: string };

    const phone = normalizeSignupPhone(body.phone);
    if (!phone) {
      return c.json({
        success: false,
        error: { code: 'PHONE_INVALID', message: 'Enter a valid 10-digit phone number.' },
      }, 400);
    }

    // Own-state, asked before any SMS goes out: this row's slot, not
    // anybody else's — no oracle, and no message nobody can act on.
    const own = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (own?.phone) {
      return c.json({
        success: false,
        error: { code: 'PHONE_ALREADY_SET', message: 'This account already has a phone number.' },
      }, 409);
    }

    const sent = await sendOtpToPhone(phone, 'account-phone');
    if (!sent.ok) return sendFailure(c, sent);

    const devOnly = process.env.NODE_ENV !== 'production';
    return c.json({
      success: true,
      data: {
        message: 'Code sent',
        ...(sent.devCode && devOnly ? { devOtpCode: sent.devCode } : {}),
      },
    });
  },
);

// ── POST /account/phone/verify ────────────────────────────────────────────
// Spends the attach code, then — only now that the handset proved
// itself — reports whether the number belongs to another account.
accountRoutes.post(
  '/phone/verify',
  authMiddleware,
  rateLimit('account.phoneVerify'),
  validate(accountPhoneVerifySchema),
  async (c) => {
    const refused = await portalDoor(c);
    if (refused) return refused;
    const userId = c.get('userId') as string;
    const body = c.get('validatedData') as { phone: string; code: string };

    const phone = normalizeSignupPhone(body.phone);
    if (!phone) {
      return c.json({
        success: false,
        error: { code: 'PHONE_INVALID', message: 'Enter a valid 10-digit phone number.' },
      }, 400);
    }

    const own = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (own?.phone) {
      return c.json({
        success: false,
        error: { code: 'PHONE_ALREADY_SET', message: 'This account already has a phone number.' },
      }, 409);
    }

    const spent = verifyOtp(`acct-phone:${phone}`, body.code, 'account-phone');
    if (!spent.ok) return otpFailure(c, spent);

    // The OTP proved possession — the "someone else's number" verdict is
    // safe to show now (they control the handset, so the disclosure is
    // about their own number).
    const taken = await prisma.user.findFirst({
      where: { phone, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) {
      return c.json({
        success: false,
        error: { code: 'PHONE_IN_USE', message: 'That phone number is already on another account.' },
      }, 409);
    }

    try {
      await prisma.user.update({ where: { id: userId }, data: { phone, isPhoneVerified: true } });
    } catch (err) {
      // Lost the attach race to a parallel request — the unique
      // constraint decided: someone else (or another tab) owns it now.
      if ((err as { code?: string })?.code === 'P2002') {
        return c.json({
          success: false,
          error: { code: 'PHONE_IN_USE', message: 'That phone number is already on another account.' },
        }, 409);
      }
      throw err;
    }
    // The number moved — any code already headed for this account (the
    // userId-keyed store) dies with the old one, same rule as the
    // profile-edit path.
    clearOtp(userId);

    return c.json({ success: true, data: { phone, isPhoneVerified: true } });
  },
);

// ── POST /account/email/start ─────────────────────────────────────────────
// Sends the attach code to the address. Uniform answer whether or not
// the mailbox is already on another row; 5/min because SMTP, not SMS.
accountRoutes.post(
  '/email/start',
  authMiddleware,
  rateLimit('account.emailStart'),
  validate(accountEmailStartSchema),
  async (c) => {
    const refused = await portalDoor(c);
    if (refused) return refused;
    const userId = c.get('userId') as string;
    const body = c.get('validatedData') as { email: string };

    const own = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (own?.email) {
      return c.json({
        success: false,
        error: { code: 'EMAIL_ALREADY_SET', message: 'This account already has an email address.' },
      }, 409);
    }

    const sent = await sendOtpToEmailAddress(body.email, 'account-email');
    if (!sent.ok) return sendFailure(c, sent);

    const devOnly = process.env.NODE_ENV !== 'production';
    return c.json({
      success: true,
      data: {
        message: 'Code sent',
        ...(sent.devCode && devOnly ? { devOtpCode: sent.devCode } : {}),
      },
    });
  },
);

// ── POST /account/email/verify ────────────────────────────────────────────
// Spends the attach code, then attaches: address verified (the OTP IS
// the proof), and — only when the account has no password yet — the one
// chosen here, hashed at row time like everyone else's.
accountRoutes.post(
  '/email/verify',
  authMiddleware,
  rateLimit('account.emailVerify'),
  validate(accountEmailVerifySchema),
  async (c) => {
    const refused = await portalDoor(c);
    if (refused) return refused;
    const userId = c.get('userId') as string;
    const body = c.get('validatedData') as { email: string; code: string; password?: string };

    const own = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, passwordHash: true },
    });
    if (own?.email) {
      return c.json({
        success: false,
        error: { code: 'EMAIL_ALREADY_SET', message: 'This account already has an email address.' },
      }, 409);
    }

    // Own-state asked BEFORE the spend: a social account has no password
    // yet, and the rule is "adding an email always ends with one" (no
    // skip). Refusing here leaves the just-typed code live, so the retry
    // after choosing a password needs no resend.
    const needsPassword = !own?.passwordHash;
    if (needsPassword && !body.password) {
      return c.json({
        success: false,
        error: {
          code: 'PASSWORD_REQUIRED',
          message: 'Choose a password to finish adding your email — you will sign in with it from now on.',
        },
      }, 400);
    }

    const spent = verifyOtp(`acct-email:${body.email}`, body.code, 'account-email');
    if (!spent.ok) return otpFailure(c, spent);

    const taken = await prisma.user.findFirst({
      where: { email: body.email, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) {
      return c.json({
        success: false,
        error: { code: 'EMAIL_IN_USE', message: 'That email address is already on another account.' },
      }, 409);
    }

    const data: { email: string; isEmailVerified: boolean; passwordHash?: string } = {
      email: body.email,
      isEmailVerified: true,
    };
    if (needsPassword && body.password) {
      const bcrypt = await import('bcryptjs');
      data.passwordHash = await bcrypt.hash(body.password, 12);
    }
    try {
      await prisma.user.update({ where: { id: userId }, data });
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2002') {
        return c.json({
          success: false,
          error: { code: 'EMAIL_IN_USE', message: 'That email address is already on another account.' },
        }, 409);
      }
      throw err;
    }
    clearOtp(userId);

    return c.json({
      success: true,
      data: { email: body.email, isEmailVerified: true, passwordSet: needsPassword },
    });
  },
);
