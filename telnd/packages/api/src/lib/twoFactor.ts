// Two-factor plumbing shared by the auth challenge routes, the Security
// page's self-service endpoints and the super-admin controls:
//
// - SMS OTP store: hashed, single-use, 5-minute expiry, 5 wrong tries
//   burns the code, 45s minimum between sends, purpose-bound (a code can
//   only be spent by the flow that requested it — in-memory, single API
//   instance, restart just means "request a new code").
// - Phone normalization to the 8801… form api.sms.net.bd expects, plus
//   masking for display (the raw number is never echoed back).
// - The "2FA required" policy lookup (Setting key `twoFactorPolicy`,
//   reserved for super admins because the key isn't in KEY_PERMISSIONS).
// - A per-user attempt cap on challenge verification so a pending
//   10-minute token can't be brute-forced either.

import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { prisma } from '@telnd/database';
import { sendAlphaSms } from './alphaSms';
import { isSmtpConfigured, sendTwoFactorCodeEmail, type OtpEmailContext } from './email';

// ── Policy ───────────────────────────────────────────────────────────────

export async function twoFactorPolicyRequired(): Promise<boolean> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'twoFactorPolicy' } });
    return ((row?.value as { requireTwoFactor?: unknown } | null)?.requireTwoFactor) === true;
  } catch {
    return false;
  }
}

// ── Phone helpers ────────────────────────────────────────────────────────

/**
 * Normalize to the Bangladeshi international form Alpha SMS requires
 * ("8801712345678"). Accepts local ("017…"), country-coded ("88017…"),
 * "+"-prefixed and space/dash separated input; anything that doesn't look
 * like a BD mobile returns null instead of letting garbage reach the
 * gateway.
 */
export function toBdSmsNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (/^8801\d{9}$/.test(digits)) return digits;
  if (/^01\d{9}$/.test(digits)) return `880${digits.slice(1)}`;
  if (/^1\d{9}$/.test(digits)) return `880${digits}`;
  return null;
}

/** "+8801712345678" → "+88017•••45678" (first 5 digits + last 5 shown). */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return '••••';
  return `+${digits.slice(0, 5)}•••${digits.slice(-4)}`;
}

/** "chinthika@gmail.com" → "c•••@gmail.com" (domain stays readable). */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.indexOf('@');
  if (at < 1) return '•••';
  return `${email.slice(0, 1)}•••${email.slice(at)}`;
}

// ── SMS gateway access ───────────────────────────────────────────────────

export async function getSmsGateway(): Promise<{ configured: boolean; apiKey?: string }> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'gateway' } });
    const alpha = (row?.value as { sms?: { alphaNet?: { enabled?: unknown; apiKey?: unknown } } } | null)?.sms
      ?.alphaNet;
    const apiKey = typeof alpha?.apiKey === 'string' ? alpha.apiKey.trim() : '';
    if (alpha?.enabled === true && apiKey) return { configured: true, apiKey };
  } catch {
    // Settings unavailable — treat as unconfigured; the caller answers
    // "SMS gateway not configured" instead of pretending a code went out.
  }
  return { configured: false };
}

// Brand name up front: BTRC OTP rules require the sender's identity in the
// body of every one-time code. ASCII only.
export function otpMessage(code: string): string {
  return `TELND: ${code} is your verification code. It expires in 5 minutes. Do not share this code.`;
}

/**
 * Issue + deliver an OTP for `userId` — to their profile phone (SMS) or
 * their account email, depending on `channel`. Both channels share one
 * store: a single live code per user, whichever door it arrived through.
 * `context` only shapes the emailed copy (sign-in vs. setup) — the code
 * itself is identical either way. Returns `{ ok }` with a machine reason
 * the routes can map to messages.
 */
export type OtpChannel = 'sms' | 'email';
export type SmsSendFailure = {
  ok: false;
  reason:
    | 'NO_PHONE'
    | 'INVALID_PHONE'
    | 'NOT_CONFIGURED'
    | 'RESEND_SOON'
    | 'GATEWAY_ERROR'
    | 'NO_EMAIL'
    | 'EMAIL_NOT_CONFIGURED'
    | 'EMAIL_ERROR';
  retryAfterSec?: number;
  message?: string;
};
export type SmsSendResult = { ok: true } | SmsSendFailure;

export async function sendOtpToUser(
  userId: string,
  channel: OtpChannel = 'sms',
  context: OtpEmailContext = 'verify',
): Promise<SmsSendResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, email: true },
  });

  // Channel preconditions first, then a deliverer for the chosen channel —
  // everything below this point (resend gap, code minting, store write) is
  // identical for both.
  let deliver: (code: string) => Promise<string | null>;
  if (channel === 'email') {
    if (!user?.email) return { ok: false, reason: 'NO_EMAIL' };
    if (!(await isSmtpConfigured())) return { ok: false, reason: 'EMAIL_NOT_CONFIGURED' };
    const to = user.email;
    deliver = async (code) =>
      (await sendTwoFactorCodeEmail(to, code, context))
        ? null
        : 'The email with the code could not be delivered. Please try again.';
  } else {
    const number = toBdSmsNumber(user?.phone ?? null);
    if (!user?.phone) return { ok: false, reason: 'NO_PHONE' };
    if (!number) return { ok: false, reason: 'INVALID_PHONE' };

    const gateway = await getSmsGateway();
    if (!gateway.configured || !gateway.apiKey) return { ok: false, reason: 'NOT_CONFIGURED' };
    const apiKey = gateway.apiKey;
    deliver = async (code) => {
      const result = await sendAlphaSms(apiKey, number, otpMessage(code));
      return result.ok ? null : (result.message || 'The SMS gateway could not deliver the code. Please try again.');
    };
  }

  const existing = otpStore.get(userId);
  if (existing && existing.sentAt + OTP_RESEND_GAP_MS > Date.now()) {
    return { ok: false, reason: 'RESEND_SOON', retryAfterSec: Math.ceil((existing.sentAt + OTP_RESEND_GAP_MS - Date.now()) / 1000) };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const failureMessage = await deliver(code);
  if (failureMessage !== null) {
    return {
      ok: false,
      reason: channel === 'email' ? 'EMAIL_ERROR' : 'GATEWAY_ERROR',
      message: failureMessage,
    };
  }

  otpStore.set(userId, {
    hash: hashOtp(userId, code),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    sentAt: Date.now(),
    // Purpose binding (#38): the code may only be spent by the flow that
    // requested it — a sign-in challenge code can't clear a Security-page
    // enable, a login OTP can't pass a 2FA challenge, and so on.
    purpose: context,
  });
  pruneOtpStore();
  return { ok: true };
}

/**
 * Maps an OTP delivery failure to the HTTP status + client-facing message —
 * the single source of truth shared by the login challenge and the
 * Security page's own "send code" button.
 */
export function smsSendFailure(result: SmsSendFailure): {
  status: 400 | 429;
  code: string;
  message: string;
  retryAfterSec?: number;
} {
  if (result.reason === 'RESEND_SOON') {
    const retryAfterSec = result.retryAfterSec ?? 45;
    return {
      status: 429,
      code: 'RESEND_SOON',
      message: `Please wait ${retryAfterSec} seconds before requesting another code.`,
      retryAfterSec,
    };
  }
  const isEmail = result.reason === 'NO_EMAIL' || result.reason.startsWith('EMAIL');
  const messages: Record<string, string> = {
    NO_PHONE: 'No phone number is set on this account. Add one in My Account to use SMS codes.',
    INVALID_PHONE: 'The phone number on this account is not a valid Bangladeshi mobile number.',
    NOT_CONFIGURED: 'SMS sending is not configured. Set up the Alpha SMS gateway in Settings, or use an authenticator app.',
    GATEWAY_ERROR: result.message || 'The SMS gateway could not deliver the code. Please try again.',
    NO_EMAIL: 'No email address is set on this account, so email codes cannot be used.',
    EMAIL_NOT_CONFIGURED: 'Email sending is not configured. Set up SMTP in Settings, or use an authenticator app.',
    EMAIL_ERROR: result.message || 'The email with the code could not be delivered. Please try again.',
  };
  return {
    status: 400,
    code:
      result.reason === 'NOT_CONFIGURED'
        ? 'SMS_GATEWAY_NOT_CONFIGURED'
        : result.reason === 'EMAIL_NOT_CONFIGURED'
          ? 'EMAIL_NOT_CONFIGURED'
          : isEmail
            ? 'EMAIL_SEND_FAILED'
            : 'SMS_SEND_FAILED',
    message: messages[result.reason] || 'The code could not be delivered. Please try again.',
  };
}

// ── OTP store ────────────────────────────────────────────────────────────

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_GAP_MS = 45_000;
const MAX_ENTRIES = 10000;

interface OtpEntry {
  hash: string;
  expiresAt: number;
  attempts: number;
  sentAt: number;
  /** Which flow requested the code (`sendOtpToUser`'s context). */
  purpose: OtpEmailContext;
}

const otpStore = new Map<string, OtpEntry>();

function pruneOtpStore(): void {
  if (otpStore.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [k, v] of otpStore) if (v.expiresAt <= now) otpStore.delete(k);
  if (otpStore.size <= MAX_ENTRIES) return;
  const oldest = [...otpStore.entries()].sort((a, b) => a[1].sentAt - b[1].sentAt);
  for (let i = 0; i < Math.floor(oldest.length / 2); i++) otpStore.delete(oldest[i][0]);
}

function hashOtp(userId: string, code: string): string {
  return createHash('sha256').update(`${userId}:${code}`).digest('hex');
}

export function clearOtp(userId: string): void {
  otpStore.delete(userId);
}

/**
 * Spends a code. `purpose` must match the flow that requested it — a code
 * minted for one door does not open another (#38); a mismatch answers
 * NO_OTP so no oracle distinguishes "wrong door" from "no code".
 */
export function verifyOtp(
  userId: string,
  code: string,
  purpose: OtpEmailContext,
): { ok: true } | { ok: false; reason: 'NO_OTP' | 'INVALID' | 'EXPIRED' | 'TOO_MANY_ATTEMPTS' } {
  const entry = otpStore.get(userId);
  if (!entry) return { ok: false, reason: 'NO_OTP' };
  if (entry.purpose !== purpose) return { ok: false, reason: 'NO_OTP' };
  if (entry.expiresAt <= Date.now()) {
    otpStore.delete(userId);
    return { ok: false, reason: 'EXPIRED' };
  }
  if (entry.attempts >= OTP_MAX_ATTEMPTS) {
    otpStore.delete(userId);
    return { ok: false, reason: 'TOO_MANY_ATTEMPTS' };
  }
  const a = Buffer.from(entry.hash, 'utf8');
  const b = Buffer.from(hashOtp(userId, code), 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    entry.attempts += 1;
    if (entry.attempts >= OTP_MAX_ATTEMPTS) otpStore.delete(userId);
    return { ok: false, reason: entry.attempts >= OTP_MAX_ATTEMPTS ? 'TOO_MANY_ATTEMPTS' : 'INVALID' };
  }
  otpStore.delete(userId);
  return { ok: true };
}

// ── Challenge verification attempts ──────────────────────────────────────

const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;
const verifyAttempts = new Map<string, { count: number; expiresAt: number }>();

/** Counts one wrong (or right) verification; reports when the cap is hit. */
export function countVerifyAttempt(userId: string): { blocked: boolean } {
  const now = Date.now();
  const entry = verifyAttempts.get(userId);
  if (!entry || entry.expiresAt <= now) {
    verifyAttempts.set(userId, { count: 1, expiresAt: now + VERIFY_WINDOW_MS });
    return { blocked: false };
  }
  entry.count += 1;
  return { blocked: entry.count > MAX_VERIFY_ATTEMPTS };
}

export function clearVerifyAttempts(userId: string): void {
  verifyAttempts.delete(userId);
}
