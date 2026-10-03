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
// - Two rounds per identifier (§14.64): ADD fills an empty slot, CHANGE
//   moves a filled one — session-gated, the NEW identifier proves itself
//   by OTP (its mailbox/handset gets the code), and the OLD destination
//   gets a notice email the moment the swap lands, because from then on
//   it receives nothing else. Each round refuses the other's slot state,
//   the write re-checks uniqueness against other rows (P2002 → 409), and
//   a race can't double-attach.
// - Set password (§14.64): a FIRST password only — claimed from the live
//   session (there is no old hash to prove against; refusing to invent
//   that deadlock is §14.53's rule), never overwriting an existing one,
//   and always followed by the notice email that tells the owner a
//   credential now exists.
// - Profile photo (§14.66): POST replaces the member's avatar on the
//   admin panel's exact rails (512² WebP → R2 avatars/, old object
//   dropped once the new one has stored); DELETE clears it. Both are
//   idempotent about the row, refuse ADMIN sessions through the same
//   portal door, and never log — a photo is not a sign-in identifier.
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
  accountEmailChangeStartSchema,
  accountEmailChangeVerifySchema,
  accountEmailStartSchema,
  accountEmailVerifySchema,
  accountPasswordSchema,
  accountPhoneChangeStartSchema,
  accountPhoneChangeVerifySchema,
  accountPhoneStartSchema,
  accountPhoneVerifySchema,
} from '@telnd/validation';
import { doorError } from './auth';
import { logUserActivity } from '../lib/userActivity';
import {
  clearOtp,
  maskPhone,
  normalizeSignupPhone,
  sendOtpToEmailAddress,
  sendOtpToPhone,
  smsSendFailure,
  verifyOtp,
  type SmsSendFailure,
} from '../lib/twoFactor';
import {
  sendEmailChangeNoticeEmail,
  sendPasswordSetNoticeEmail,
  sendPhoneChangeNoticeEmail,
} from '../lib/email';
import {
  convertToWebP,
  deleteFromR2,
  ensureR2,
  generateUploadKey,
  isImageMime,
  uploadToR2,
} from '../lib/r2';
import { deleteAvatarObject } from '../lib/avatar';

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

    // §14.68 — the attach is the account's own activity now.
    logUserActivity(c, { userId, action: 'PHONE_ADDED', details: { phone } });

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

    // §14.68 — the wizard's landing: the address attached, plus the
    // password a social signup chose with it (PASSWORD_REQUIRED), each
    // as its own feed row.
    logUserActivity(c, { userId, action: 'EMAIL_ADDED', details: { email: body.email } });
    if (data.passwordHash) logUserActivity(c, { userId, action: 'PASSWORD_SET' });

    return c.json({
      success: true,
      data: { email: body.email, isEmailVerified: true, passwordSet: needsPassword },
    });
  },
);

// ── POST /account/password ───────────────────────────────────────────────
// The FIRST password (§14.64): a social signup — or any account that
// reached the panel without one — claims its password door from inside
// the live session. No current password is demanded (there is none; the
// §14.53 no-deadlock rule), the floor and bcrypt(12) are signup's, and
// the notice email is the owner's only external signal that a credential
// now exists. An account that already has one is pointed at the existing
// change/reset rounds — this route never overwrites a hash, and the
// password pairs with the EMAIL door (the login round is exactly
// email+password), so a slotless address has nothing to type it into.
accountRoutes.post(
  '/password',
  authMiddleware,
  rateLimit('account.setPassword'),
  validate(accountPasswordSchema),
  async (c) => {
    const refused = await portalDoor(c);
    if (refused) return refused;
    const userId = c.get('userId') as string;
    const body = c.get('validatedData') as { password: string };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, passwordHash: true },
    });
    if (!user) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
    }
    if (user.passwordHash) {
      return c.json({
        success: false,
        error: {
          code: 'PASSWORD_EXISTS',
          message: 'This account already has a password — use Forgot password on the sign-in page to change it.',
        },
      }, 409);
    }
    if (!user.email) {
      return c.json({
        success: false,
        error: {
          code: 'EMAIL_REQUIRED',
          message: 'Add an email address first — a password signs you in with it.',
        },
      }, 409);
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(body.password, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    // Best-effort: the password IS set even if the mailbox is down — the
    // answer belongs to the write, never to the notification.
    await sendPasswordSetNoticeEmail({ to: user.email, firstName: user.firstName }).catch(() => false);

    // §14.68 — the first password existing is a change worth a row.
    logUserActivity(c, { userId, action: 'PASSWORD_SET' });

    return c.json({ success: true, data: { hasPassword: true } });
  },
);

// ── POST /account/email/change/start ─────────────────────────────────────
// The CHANGE round for a filled slot (§14.64): the code goes to the NEW
// address — possession of the future identifier is the only thing that
// can move the slot. Uniform answer by design (no oracle about who owns
// what); the old destination learns of the move only after the swap, in
// the notice the verify route sends.
accountRoutes.post(
  '/email/change/start',
  authMiddleware,
  rateLimit('account.emailStart'),
  validate(accountEmailChangeStartSchema),
  async (c) => {
    const refused = await portalDoor(c);
    if (refused) return refused;
    const userId = c.get('userId') as string;
    const body = c.get('validatedData') as { email: string };

    const own = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!own?.email) {
      return c.json({
        success: false,
        error: { code: 'EMAIL_NOT_SET', message: 'This account has no email address to change.' },
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

// ── POST /account/email/change/verify ────────────────────────────────────
// Spend the code (it proved the NEW address), report the uniqueness
// verdict only now, swap the slot — and notify the OLD address, which
// from this moment receives nothing for this account anymore. That
// notice is the security signal: it is how a mailbox owner learns their
// account moved away.
accountRoutes.post(
  '/email/change/verify',
  authMiddleware,
  rateLimit('account.emailVerify'),
  validate(accountEmailChangeVerifySchema),
  async (c) => {
    const refused = await portalDoor(c);
    if (refused) return refused;
    const userId = c.get('userId') as string;
    const body = c.get('validatedData') as { email: string; code: string };

    const own = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!own?.email) {
      return c.json({
        success: false,
        error: { code: 'EMAIL_NOT_SET', message: 'This account has no email address to change.' },
      }, 409);
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

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { email: body.email, isEmailVerified: true },
      });
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

    // The swap is a fact worth mailing home — same address, no move, no
    // letter (re-proving the address you already hold changes nothing).
    if (own.email !== body.email) {
      // §14.68 — and a fact worth a feed row, same condition.
      logUserActivity(c, { userId, action: 'EMAIL_CHANGED', details: { email: body.email } });
      await sendEmailChangeNoticeEmail({ to: own.email, newEmail: body.email }).catch(() => false);
    }

    return c.json({ success: true, data: { email: body.email, isEmailVerified: true } });
  },
);

// ── POST /account/phone/change/start ─────────────────────────────────────
// The CHANGE round for a number (§14.64): same uniform answer as the
// add round, same SMS budget bucket — a change costs exactly one SMS,
// and the number slot means nothing until the handset proves itself.
accountRoutes.post(
  '/phone/change/start',
  authMiddleware,
  rateLimit('account.phoneStart'),
  validate(accountPhoneChangeStartSchema),
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

    const own = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (!own?.phone) {
      return c.json({
        success: false,
        error: { code: 'PHONE_NOT_SET', message: 'This account has no phone number to change.' },
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

// ── POST /account/phone/change/verify ────────────────────────────────────
// Spend the code, report the verdict, swap the slot — and because the
// old handset hears nothing about its own retirement, the account's
// EMAIL gets the notice instead (masked numbers; SMS is never spent on
// a notice).
accountRoutes.post(
  '/phone/change/verify',
  authMiddleware,
  rateLimit('account.phoneVerify'),
  validate(accountPhoneChangeVerifySchema),
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

    const own = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });
    if (!own?.phone) {
      return c.json({
        success: false,
        error: { code: 'PHONE_NOT_SET', message: 'This account has no phone number to change.' },
      }, 409);
    }

    const spent = verifyOtp(`acct-phone:${phone}`, body.code, 'account-phone');
    if (!spent.ok) return otpFailure(c, spent);

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
      if ((err as { code?: string })?.code === 'P2002') {
        return c.json({
          success: false,
          error: { code: 'PHONE_IN_USE', message: 'That phone number is already on another account.' },
        }, 409);
      }
      throw err;
    }
    // The number moved — any code already headed for this account (the
    // userId-keyed store) dies with the old one, same rule as the add
    // round and the profile path.
    clearOtp(userId);

    if (own.phone !== phone) {
      // §14.68 — the move that actually happened earns its feed row
      // whether or not a notice address exists to mail.
      logUserActivity(c, { userId, action: 'PHONE_CHANGED', details: { phone } });
    }
    if (own.phone !== phone && own.email) {
      await sendPhoneChangeNoticeEmail({
        to: own.email,
        oldPhoneMasked: maskPhone(own.phone) ?? '••••',
        newPhoneMasked: maskPhone(phone) ?? '••••',
      }).catch(() => false);
    }

    return c.json({ success: true, data: { phone, isPhoneVerified: true } });
  },
);

// ── POST /account/avatar ──────────────────────────────────────────────────
// The member's own photo (§14.66), on exactly the admin panel's rails:
// multipart upload → 512² WebP (quality 85, SVG stored raw) → R2 avatars/.
// The door replaces THIS member's row directly and drops the object it
// displaced — only after the new one has stored, so a failed upload or a
// refused file leaves the current picture untouched. §14.68: a completed
// swap writes AVATAR_SET to the activity feed (the delete route writes
// AVATAR_REMOVED), superseding §14.64's "portal self-service doesn't
// log" rule.
accountRoutes.post(
  '/avatar',
  authMiddleware,
  rateLimit('account.avatar'),
  async (c) => {
    const refused = await portalDoor(c);
    if (refused) return refused;
    const userId = c.get('userId') as string;

    try {
      await ensureR2();
    } catch {
      return c.json({
        success: false,
        error: { code: 'STORAGE_NOT_CONFIGURED', message: 'File storage is not configured on this site.' },
      }, 400);
    }

    try {
      // Not even multipart (a body-less POST makes formData() itself
      // throw) and multipart-without-a-file are the same verdict: there
      // is nothing here to store.
      let formData: FormData;
      try {
        formData = await c.req.formData();
      } catch {
        return c.json({ success: false, error: { code: 'FILE_REQUIRED', message: 'No file provided' } }, 400);
      }
      const file = formData.get('file') as File | null;
      if (!file) {
        return c.json({ success: false, error: { code: 'FILE_REQUIRED', message: 'No file provided' } }, 400);
      }
      if (!isImageMime(file.type)) {
        return c.json({
          success: false,
          error: { code: 'FILE_TYPE_INVALID', message: 'File must be an image (JPEG, PNG, GIF, WebP, SVG)' },
        }, 400);
      }
      const maxSize = 10 * 1024 * 1024; // 10MB — same ceiling as panel uploads.
      if (file.size > maxSize) {
        return c.json({
          success: false,
          error: { code: 'FILE_TOO_LARGE', message: 'File size must be less than 10MB' },
        }, 400);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const svg = file.type === 'image/svg+xml';
      const stored = svg ? buffer : await convertToWebP(buffer, { width: 512, height: 512, quality: 85 });
      const key = generateUploadKey('avatars', file.name);
      const url = await uploadToR2(key, stored, svg ? 'image/svg+xml' : 'image/webp');

      const previous = await prisma.user.findUnique({ where: { id: userId }, select: { avatar: true } });
      try {
        await prisma.user.update({ where: { id: userId }, data: { avatar: url } });
      } catch (err) {
        // The row didn't take the new URL — give the fresh object back so
        // storage and row can never disagree, then surface the failure.
        await deleteFromR2(key).catch(() => {});
        throw err;
      }
      if (previous?.avatar && previous.avatar !== url) await deleteAvatarObject(previous.avatar);

      // §14.68 — a completed swap on the activity feed.
      logUserActivity(c, { userId, action: 'AVATAR_SET' });

      return c.json({ success: true, data: { avatar: url } });
    } catch (err) {
      console.error('[account] avatar upload failed:', err instanceof Error ? err.message : err);
      return c.json({
        success: false,
        error: { code: 'UPLOAD_FAILED', message: 'The photo could not be uploaded. Please try again.' },
      }, 500);
    }
  },
);

// ── DELETE /account/avatar ────────────────────────────────────────────────
// Take the photo off (§14.66): the row clears first, the object follows
// best-effort through the same helper the replace path uses. Idempotent —
// an already-empty slot answers the same way, so a retried tap never 404s.
accountRoutes.delete(
  '/avatar',
  authMiddleware,
  rateLimit('account.avatar'),
  async (c) => {
    const refused = await portalDoor(c);
    if (refused) return refused;
    const userId = c.get('userId') as string;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatar: true } });
    if (user?.avatar) {
      await prisma.user.update({ where: { id: userId }, data: { avatar: null } });
      await deleteAvatarObject(user.avatar);
      // §14.68 — idempotent route: only an ACTUAL removal writes a row.
      logUserActivity(c, { userId, action: 'AVATAR_REMOVED' });
    }

    return c.json({ success: true, data: { avatar: null } });
  },
);
