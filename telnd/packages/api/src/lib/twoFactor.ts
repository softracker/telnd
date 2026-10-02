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
import { consumeSendBudget, type SendBudgetDecision } from './otpSendBudget';
import { recordSendEvent } from './sendStats';

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

/**
 * Normalize a user-typed BD mobile to the stored "+8801712345678" form —
 * the exact string `user.phone` holds, so lookups and uniqueness checks
 * line up. Accepts local ("017…"), country-coded ("880…"/"+880…") and
 * space/dash separated input; anything that isn't a 10-digit national
 * number returns null instead of letting garbage reach the store.
 */
export function normalizeSignupPhone(raw: string): string | null {
  let national = raw.replace(/[\s()-]/g, '');
  if (national.startsWith('+880')) national = national.slice(4);
  else if (national.startsWith('880')) national = national.slice(3);
  else if (national.startsWith('0')) national = national.slice(1);
  if (!/^[1-9]\d{9}$/.test(national)) return null;
  return `+880${national}`;
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
 *
 * Dev-only seam (narrowed, §14.58): outside production the code comes
 * back as `devCode` when NO send was attempted — the gateway is absent —
 * which is how the suites complete a phone sign-in without a live
 * gateway. An attempted send Alpha REFUSED now answers honestly in every
 * environment (that is the error the phone widget shows before its
 * 6-digit screen); production never mints on a failed send, and no
 * client ever renders a `devCode`.
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
    | 'EMAIL_ERROR'
    // §14.59 — the send budget refused before any provider was called:
    // SEND_BLOCKED = this destination over its 30-minute allowance,
    // DAILY_CAP = the global daily quota for the channel is spent.
    | 'SEND_BLOCKED'
    | 'DAILY_CAP';
  retryAfterSec?: number;
  message?: string;
};

/**
 * §14.59: a budget refusal as the caller-facing OTP failure. Lives here
 * (not in otpSendBudget) so the budget lib needs no import from this file.
 */
function budgetFailure(budget: Extract<SendBudgetDecision, { blocked: true }>): SmsSendFailure {
  return {
    ok: false,
    reason: budget.kind === 'daily' ? 'DAILY_CAP' : 'SEND_BLOCKED',
    retryAfterSec: budget.retryAfterSec,
    message: budget.message,
  };
}
export type SmsSendResult = { ok: true; devCode?: string } | SmsSendFailure;

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
  // identical for both. Each deliverer runs the §14.59 send budget after
  // the resend gap (a refused double-click consumes nothing) and before
  // the provider, and returns a typed failure the caller can answer with.
  let deliver: (code: string) => Promise<SmsSendFailure | null>;
  if (channel === 'email') {
    if (!user?.email) return { ok: false, reason: 'NO_EMAIL' };
    if (!(await isSmtpConfigured())) return { ok: false, reason: 'EMAIL_NOT_CONFIGURED' };
    const to = user.email;
    deliver = async (code) => {
      const budget = await consumeSendBudget('email', to);
      if (budget.blocked) return budgetFailure(budget);
      return (await sendTwoFactorCodeEmail(to, code, context))
        ? null
        : {
            ok: false,
            reason: 'EMAIL_ERROR',
            message: 'The email with the code could not be delivered. Please try again later.',
          };
    };
  } else {
    const number = toBdSmsNumber(user?.phone ?? null);
    if (!user?.phone) return { ok: false, reason: 'NO_PHONE' };
    if (!number) return { ok: false, reason: 'INVALID_PHONE' };

    const gateway = await getSmsGateway();
    const apiKey = gateway.apiKey ?? '';
    // Dev seam (§14.53): outside production a missing gateway does not
    // stop the mint — the code comes back as `devCode` below so the
    // suites can finish a phone sign-in with no live SMS. Production
    // still refuses before anything is minted.
    if ((!gateway.configured || !apiKey) && process.env.NODE_ENV === 'production') {
      return { ok: false, reason: 'NOT_CONFIGURED' };
    }
    deliver = async (code) => {
      if (!gateway.configured || !apiKey) return null; // dev fallthrough
      // §14.59: consume before Alpha — a blocked number never reaches the
      // gateway. Gateway absent means no send, so nothing is counted.
      const budget = await consumeSendBudget('sms', number);
      if (budget.blocked) return budgetFailure(budget);
      const result = await sendAlphaSms(apiKey, number, otpMessage(code));
      recordSendEvent('sms', result.ok ? 'sent' : 'failed'); // §14.60 statistics
      if (result.ok) return null;
      return {
        ok: false,
        reason: 'GATEWAY_ERROR',
        message: result.message || 'The SMS gateway could not deliver the code. Please try again later.',
      };
    };
  }

  const existing = otpStore.get(userId);
  if (existing && existing.sentAt + OTP_RESEND_GAP_MS > Date.now()) {
    return { ok: false, reason: 'RESEND_SOON', retryAfterSec: Math.ceil((existing.sentAt + OTP_RESEND_GAP_MS - Date.now()) / 1000) };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const failure = await deliver(code);
  // §14.58 narrowed the seam: a failure is only ever set when a send was
  // ATTEMPTED and the provider said no — or when the §14.59 budget refused
  // the send before a provider was called — and both surface in every
  // environment. The seam that remains is the absent gateway above —
  // deliver's dev fallthrough returns null, so nothing failed and the
  // mint proceeds. The email channel keeps its own failure answers, as ever.
  if (failure !== null) {
    return failure;
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
  const devSms = channel === 'sms' && process.env.NODE_ENV !== 'production';
  return devSms ? { ok: true, devCode: code } : { ok: true };
}

/**
 * Issue + deliver a login OTP for a phone number that has NO account yet —
 * the phone half of sign-in-or-create — or, with `purpose: 'account-phone'`,
 * the Sign-in-methods attach code for a signed-in user adding a number
 * (§14.53). Both keep the account-less / already-owned posture: callers
 * never learn whether the number is registered until the code proves
 * possession of the handset.
 *
 * The account-less number gets the same store under a `phone:` key (the
 * attach flow a separate `acct-phone:` key — one live code per purpose,
 * neither door can spend the other's), so every rule holds identically:
 * one live code, 5-minute expiry, 5 wrong tries, 45-second resend gap,
 * purpose-bound. /auth/login verifies a login code through
 * verifyOtp(`phone:${number}`, code, 'login') and hands back the profile
 * token that creates the account. Outside production the minted code
 * rides back as `devCode` when no send was attempted (gateway absent —
 * the suites' seam, §14.58); an attempted send Alpha refused answers
 * the mapped error in every environment, production never mints on a
 * failed send, and no client ever renders a `devCode`.
 */
export async function sendOtpToPhone(
  phone: string,
  purpose: 'login' | 'account-phone' = 'login',
): Promise<EmailOtpResult> {
  const key = purpose === 'login' ? `phone:${phone}` : `acct-phone:${phone}`;
  const devOnly = process.env.NODE_ENV !== 'production';
  const number = toBdSmsNumber(phone);
  if (!number) return { ok: false, reason: 'INVALID_PHONE' };

  const gateway = await getSmsGateway();
  const apiKey = gateway.apiKey ?? '';
  if ((!gateway.configured || !apiKey) && !devOnly) return { ok: false, reason: 'NOT_CONFIGURED' };

  const existing = otpStore.get(key);
  if (existing && existing.sentAt + OTP_RESEND_GAP_MS > Date.now()) {
    return { ok: false, reason: 'RESEND_SOON', retryAfterSec: Math.ceil((existing.sentAt + OTP_RESEND_GAP_MS - Date.now()) / 1000) };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  if (gateway.configured && apiKey) {
    // This block only runs when a send is ATTEMPTED; a refusal Alpha
    // actually gave is an error in dev too (§14.58) — the missing-
    // gateway case never gets here and still mints below.
    // §14.59: after the resend gap, before Alpha — a blocked number
    // never reaches the gateway (and an unconfigured gateway above
    // already means no send is counted anywhere).
    const budget = await consumeSendBudget('sms', number);
    if (budget.blocked) return budgetFailure(budget);
    const result = await sendAlphaSms(apiKey, number, otpMessage(code));
    recordSendEvent('sms', result.ok ? 'sent' : 'failed'); // §14.60 statistics
    if (!result.ok) {
      return {
        ok: false,
        reason: 'GATEWAY_ERROR',
        message: result.message || 'The SMS gateway could not deliver the code. Please try again later.',
      };
    }
  }

  otpStore.set(key, {
    hash: hashOtp(key, code),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    sentAt: Date.now(),
    // Purpose binding (#38): a login code only ever opens the sign-in
    // that CREATES the account; an account-phone code may only be spent
    // attaching a number to the caller's own signed-in account.
    purpose,
  });
  pruneOtpStore();
  // Dev: the code comes back when no send was attempted (no gateway
  // configured — the suites' seam) or when Alpha ACCEPTED one;
  // production never reaches this line without a real send.
  return devOnly ? { ok: true, devCode: code } : { ok: true };
}

/**
 * Issue + deliver a signup OTP for an email address that has NO account
 * yet — the email half of sign-in-or-create's wizard — or, with
 * `purpose: 'account-email'`, the Sign-in-methods attach code for a
 * signed-in user adding an address (§14.53). Same store under an
 * `email:` key (the attach flow gets its own `acct-email:` key — one
 * live code per purpose, neither door can spend the other's), purpose-
 * bound: one live code, 5-minute expiry, 5 wrong tries, 45-second resend
 * gap. Outside production the code rides back on the response
 * (`devCode`) whether or not the relay accepted it — the same rule the
 * emailed-link round had with `devVerifyUrl`. This is an API-level TEST
 * SEAM for the automated suites: the portal never forwards nor renders
 * it (a verification code has no business on a screen), and it cannot
 * exist in production. Production never mints on a failed send (nothing
 * to verify, caller told plainly to retry).
 */
export type EmailOtpResult = ({ ok: true; devCode?: string }) | SmsSendFailure;

// RFC 2606 documentation domains — what the suites sign up with
// (e2e-…@*.test, …@example.com). The local dev relay refuses those by
// design, and THAT refusal alone stays behind the seam (§14.58); any
// real address gets the honest delivery answer in every environment.
function isDocumentationDomain(email: string): boolean {
  const at = email.lastIndexOf('@');
  const domain = at < 0 ? '' : email.slice(at + 1).toLowerCase();
  return /(^|\.)(test|example|invalid|localhost)$/.test(domain) ||
    /(^|\.)example\.(com|net|org)$/.test(domain);
}

export async function sendOtpToEmailAddress(
  email: string,
  purpose: 'signup' | 'account-email' = 'signup',
): Promise<EmailOtpResult> {
  const key = purpose === 'signup' ? `email:${email}` : `acct-email:${email}`;
  const devOnly = process.env.NODE_ENV !== 'production';
  const docDomain = isDocumentationDomain(email);

  const smtp = await isSmtpConfigured();
  if (!smtp && (!devOnly || !docDomain)) return { ok: false, reason: 'EMAIL_NOT_CONFIGURED' };

  const existing = otpStore.get(key);
  if (existing && existing.sentAt + OTP_RESEND_GAP_MS > Date.now()) {
    return {
      ok: false,
      reason: 'RESEND_SOON',
      retryAfterSec: Math.ceil((existing.sentAt + OTP_RESEND_GAP_MS - Date.now()) / 1000),
    };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  // §14.59: the budget counts real attempts only — with the relay off
  // (`smtp` false) nothing would be sent, so nothing is consumed; when it
  // is on, the gate sits before the provider like every other send.
  if (smtp) {
    const budget = await consumeSendBudget('email', email);
    if (budget.blocked) return budgetFailure(budget);
  }
  const delivered = smtp ? await sendTwoFactorCodeEmail(email, code, purpose) : false;
  // §14.58: dev swallows a failed delivery ONLY for documentation
  // domains (the suites need their minted code despite the local
  // relay's refusal); a real address answers EMAIL_ERROR here just as
  // production does.
  if (!delivered && (!devOnly || !docDomain)) {
    return {
      ok: false,
      reason: 'EMAIL_ERROR',
      message: 'The email with the code could not be delivered. Please try again later.',
    };
  }

  otpStore.set(key, {
    hash: hashOtp(key, code),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    sentAt: Date.now(),
    // Purpose binding (#38): only the flow that requested the code may
    // spend it — the signup wizard's verify step, or the signed-in
    // attach flow; neither can open the other's door.
    purpose,
  });
  pruneOtpStore();
  return devOnly ? { ok: true, devCode: code } : { ok: true };
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
  // §14.59 — the send budget refused before any provider was called.
  // Honest 429 with the real countdown (which the routes echo as a
  // Retry-After header): SEND_BLOCKED = this destination's 30-minute
  // allowance is spent (block active), DAILY_CAP = the channel's global
  // daily quota is spent. Codes are stable and uniform across every send
  // endpoint; the message already carries the humanized wait.
  if (result.reason === 'SEND_BLOCKED' || result.reason === 'DAILY_CAP') {
    const retryAfterSec = result.retryAfterSec ?? 900;
    return {
      status: 429,
      code: result.reason,
      message:
        result.message ||
        (result.reason === 'DAILY_CAP'
          ? 'The daily sending limit has been reached. Please try again later.'
          : 'Too many codes were requested. Please try again later.'),
      retryAfterSec,
    };
  }
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
    // GATEWAY_ERROR never carries Alpha's own words to the caller (§14.57):
    // anything but `error: 0` — 411 reseller suspended, 413 invalid sender,
    // 417 insufficient balance, 420 content blocked, 421 pre-recharge lock,
    // timeouts, non-2xx — resolves to the same "try again later". The raw
    // text still reaches the server log (routes print `result.message`) and
    // the admin's Gateway-settings balance probe; an end user cannot act on
    // "insufficient balance", and gateway internals have no business on a
    // portal screen.
    GATEWAY_ERROR: 'The SMS gateway could not deliver the code. Please try again later.',
    NO_EMAIL: 'No email address is set on this account, so email codes cannot be used.',
    EMAIL_NOT_CONFIGURED: 'Email sending is not configured. Set up SMTP in Settings, or use an authenticator app.',
    EMAIL_ERROR: result.message || 'The email with the code could not be delivered. Please try again later.',
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
    message: messages[result.reason] || 'The code could not be delivered. Please try again later.',
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
