import { createHash, randomBytes } from 'node:crypto';

// ── Sign-up intents (unified sign-in-or-create) ───────────────────────────
//
// An account is only ever created AFTER its channel has been proven: the
// emailed 6-digit code (email), the login-link click (link) or the phone
// OTP. Until /signup/complete lands, no row exists anywhere — the
// half-finished signup lives here instead:
//
// - 30-minute TTL, single-use (complete burns it; check only peeks), one
//   live intent per identifier. A newer request REPLACES the older one —
//   a squatter's intent for someone else's address dies the moment the
//   real owner proves theirs (latest request wins), which is what makes
//   pre-registration attacks worthless.
// - Resend budgets for the emailed channels: one send per identifier per
//   minute, five per hour. The login-link branch can never become a mail
//   cannon. The phone channel skips these — its own OTP resend gap (45s)
//   and the route's rate limit are already the throttle, and the caller
//   just proved possession of the number. The email OTP channel spends its
//   budgets at the OTP store (45s gap, 5-minute TTL), not here — no mail
//   rides on the mint, only the one-time token does.
// - NEVER the password and never a row: the password is chosen on the
//   wizard after the proof and hashed at /signup/complete row time. The
//   raw token exists in the emailed link (link channel) and in this
//   process; only its SHA-256 hash is keyed.
//
// In-memory like every other auth ephemeral in this codebase (the OTP
// store, consumed pending jtis): single API instance, and a restart can
// only shorten the window to "start again" — never extend or forge one.

export type SignupChannel = 'email' | 'phone' | 'link';

export interface SignupIntentPayload {
  /** Which proof opened this intent — decides the copy and the flags. */
  channel: SignupChannel;
  /** email / link channel — the address the mailbox proved. */
  email?: string;
  /** phone channel — the number the OTP proved. */
  phone?: string;
}

interface SignupIntent extends SignupIntentPayload {
  /** Map key for rotation and cleanup (email or phone). */
  identifier: string;
  sentAt: number;
  expiresAt: number;
}

interface LiveEntry {
  tokenHash: string;
  /** Send attempts inside the last hour (budget math happens on read). */
  sendTimes: number[];
  updatedAt: number;
}

const INTENT_TTL_MS = 30 * 60 * 1000;
const RESEND_GAP_MS = 60_000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_IDENTIFIERS = 10_000;

/** tokenHash → intent (what check/complete spend). */
const byToken = new Map<string, SignupIntent>();
/** identifier → the currently live token (rotation + resend budgets). */
const byIdentifier = new Map<string, LiveEntry>();

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function dropToken(tokenHash: string, intent: SignupIntent): void {
  byToken.delete(tokenHash);
  const live = byIdentifier.get(intent.identifier);
  if (live?.tokenHash === tokenHash) byIdentifier.delete(intent.identifier);
}

function prune(now: number): void {
  for (const [hash, intent] of byToken) {
    if (intent.expiresAt <= now) dropToken(hash, intent);
  }
  // Hard cap: identifiers are emails/phone numbers — a full table means
  // only garbage buildup, so the oldest half goes (all expiring anyway).
  if (byIdentifier.size > MAX_IDENTIFIERS) {
    const sorted = [...byIdentifier.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
    for (let i = 0; i < Math.floor(sorted.length / 2); i++) {
      const [identifier, entry] = sorted[i];
      byToken.delete(entry.tokenHash);
      byIdentifier.delete(identifier);
    }
  }
}

export type MintResult =
  /** A fresh token was minted and an email should go out (caller decides). */
  | { status: 'sent'; raw: string }
  /** A live token already covers this identifier — mint nothing, send nothing. */
  | { status: 'throttled' };

/**
 * Open (or rotate) the signup intent for an identifier. Rotation replaces
 * any previous token for the same identifier — latest request wins — but
 * only when a resend is due: within the gap/over the hourly cap, the
 * existing token stays live and nothing new is minted, so the link
 * already sitting in the mailbox keeps working.
 */
export function mintSignupIntent(payload: SignupIntentPayload): MintResult {
  const identifier = payload.email ?? payload.phone;
  if (!identifier) throw new Error('signup intent needs an email or phone identifier');

  const now = Date.now();
  prune(now);

  // Email-shaped channels are the ones that can be turned into a mail
  // cannon; the phone channel's throttle is the OTP itself.
  const emailed = payload.channel !== 'phone';
  const live = byIdentifier.get(identifier);
  if (live && emailed && byToken.has(live.tokenHash)) {
    const lastSend = live.sendTimes[live.sendTimes.length - 1] ?? 0;
    const sendsLastHour = live.sendTimes.filter((t) => now - t < 3_600_000).length;
    if (now - lastSend < RESEND_GAP_MS || sendsLastHour >= MAX_SENDS_PER_HOUR) {
      return { status: 'throttled' };
    }
  }

  const raw = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(raw);
  const intent: SignupIntent = {
    ...payload,
    identifier,
    sentAt: now,
    expiresAt: now + INTENT_TTL_MS,
  };

  // Rotate: the previous token for this identifier dies with its entry.
  if (live) byToken.delete(live.tokenHash);
  byToken.set(tokenHash, intent);
  byIdentifier.set(identifier, {
    tokenHash,
    sendTimes: [
      ...(live?.sendTimes ?? []).filter((t) => now - t < 3_600_000),
      ...(emailed ? [now] : []),
    ],
    updatedAt: now,
  });
  return { status: 'sent', raw };
}

/** Validate without spending — /signup/check's verdict for the finish screen. */
export function peekSignupIntent(raw: string): SignupIntent | null {
  const tokenHash = hashToken(raw);
  const intent = byToken.get(tokenHash);
  if (!intent) return null;
  if (intent.expiresAt <= Date.now()) {
    dropToken(tokenHash, intent);
    return null;
  }
  return intent;
}

/** Validate AND spend — /signup/complete burns the token before creating. */
export function takeSignupIntent(raw: string): SignupIntent | null {
  const intent = peekSignupIntent(raw);
  if (!intent) return null;
  dropToken(hashToken(raw), intent);
  return intent;
}

/** Kill a just-minted token whose email could never be delivered. */
export function discardSignupIntent(raw: string): void {
  const tokenHash = hashToken(raw);
  const intent = byToken.get(tokenHash);
  if (intent) dropToken(tokenHash, intent);
}
