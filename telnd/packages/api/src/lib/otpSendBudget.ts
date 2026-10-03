// §14.59 — OTP send budgets + global daily caps.
//
// Threat: someone rotating throwaway phone numbers or mailboxes to drain the
// SMS gateway balance or the SMTP relay with endless code requests. Two
// layers, one gate every send passes through:
//
// 1. Per-destination budget — 5 SMS / 10 emails per 30 minutes, keyed by
//    the phone number or normalized address itself (CGNAT-safe: everyone
//    behind one IP is bounded per destination, not per IP). Over budget the
//    send is REFUSED and that destination is blocked — 15 minutes for the
//    first strike, doubling per escalation (30m, 1h, 2h …) capped at 3
//    days. A block's expiry resets the budget window, so each strike has to
//    be re-earned by exhausting a fresh budget; the strike record outlives
//    its block 2× and then decays, so a quiet user's record cleans itself
//    while a chronic abuser climbs to the 3-day cap.
// 2. Global daily cap (Settings → gateway.sendQuota, defaults 100 SMS /
//    500 emails a day) — the spend ceiling no destination-rotation can
//    out-run, and the same knob an admin turns to 0 as an emergency stop.
//    When the day's budget is spent, every send path answers "try again
//    later" until the 24-hour window restarts.
//
// Callers decide how a refusal surfaces (same as everywhere by wiring all
// senders through this one gate):
// - OTP doors answer honestly — 429 + Retry-After via smsSendFailure. The
//   budget key is the destination itself, identical for the registered and
//   the unregistered branch of a request, so the block answers byte-for-byte
//   the same on both — no new oracle appears (§14.49).
// - The link emails (forgot-password / login-link) stay byte-identical
//   generic and merely SKIP the send — their anti-oracle contract predates
//   this budget and the balance is still protected.
//
// Redis-backed (otpbudget:{channel}:{dest} / otpglobal:{channel}) with a
// bounded in-memory fallback, mirroring the rateLimit middleware; counters
// are attempt counts — a provider refusal, a double-click RESEND_SOON or an
// absent gateway consume nothing because the gate runs only where a send is
// actually attempted.

import { prisma } from '@telnd/database';
import { recordSendEvent } from './sendStats';

export type SendBudgetChannel = 'sms' | 'email';

export type SendBudgetDecision =
  | { blocked: false }
  | { blocked: true; kind: 'budget' | 'daily'; retryAfterSec: number; message: string };

const WINDOW_MS = 30 * 60 * 1000;
const LIMITS: Record<SendBudgetChannel, number> = { sms: 5, email: 10 };
const BASE_BLOCK_MS = 15 * 60 * 1000;
const MAX_BLOCK_MS = 72 * 60 * 60 * 1000; // 3-day cap
const DAY_MS = 24 * 60 * 60 * 1000;
const KEY_PREFIX = 'otpbudget:';
const GLOBAL_PREFIX = 'otpglobal:';
const DEFAULT_DAILY: Record<SendBudgetChannel, number> = { sms: 100, email: 500 };

interface DestBudgetState {
  count: number;
  windowStart: number;
  blockedUntil: number;
  strikes: number;
}

interface DailyBudgetState {
  count: number;
  windowStart: number;
}

/** Block length for the n-th strike: 15m doubling per strike, capped 72h. */
function blockDurationMs(strikes: number): number {
  return Math.min(BASE_BLOCK_MS * Math.pow(2, Math.max(0, strikes - 1)), MAX_BLOCK_MS);
}

/** "15 minutes" / "2 hours" / "3 days" — ASCII, exact for ladder values. */
export function humanizeDuration(seconds: number): string {
  if (seconds < 90) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  if (seconds < 3600) {
    const m = Math.ceil(seconds / 60);
    return `${m} minute${m === 1 ? '' : 's'}`;
  }
  // 24 hours is a day, not "24 hours" — the day's countdown only ever
  // sits just under 86400 and must read "1 day".
  const hours = Math.ceil(seconds / 3600);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const d = Math.ceil(seconds / 86400);
  return `${d} day${d === 1 ? '' : 's'}`;
}

function budgetMessage(channel: SendBudgetChannel, retryAfterSec: number): string {
  const where = channel === 'sms' ? 'this number' : 'this email address';
  return `Too many codes were requested for ${where}. Please try again in ${humanizeDuration(retryAfterSec)}.`;
}

function dailyMessage(retryAfterSec: number): string {
  return `The daily sending limit has been reached. Please try again in ${humanizeDuration(retryAfterSec)}.`;
}

/**
 * The admin-tunable ceiling from Settings → gateway (sendQuota sub-object,
 * stored via the plain settings PUT — no schema entry needed). Read fresh on
 * every consume so a raised or lowered cap applies to the very next send;
 * unreadable / absent / malformed values fall back to the defaults.
 * An explicit 0 is a deliberate emergency stop: every send is refused.
 */
export async function getSendDailyCaps(): Promise<Record<SendBudgetChannel, number>> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'gateway' } });
    const quota = (row?.value as { sendQuota?: unknown } | null)?.sendQuota;
    if (quota && typeof quota === 'object') {
      const pick = (v: unknown, dflt: number): number =>
        typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : dflt;
      const q = quota as Record<string, unknown>;
      return { sms: pick(q.smsDaily, DEFAULT_DAILY.sms), email: pick(q.emailDaily, DEFAULT_DAILY.email) };
    }
  } catch {
    // Settings unreadable → defaults, same posture as every other reader.
  }
  return { ...DEFAULT_DAILY };
}

// ── state plumbing (Redis, bounded in-memory fallback) ───────────────────

const MAX_TRACKED_KEYS = 10000;
const memory = new Map<string, { raw: string; expiresAt: number }>();

async function getRedis(): Promise<{ get(k: string): Promise<string | null>; set(k: string, v: string, ...args: unknown[]): Promise<unknown> } | null> {
  try {
    const { redis } = await import('@telnd/database');
    return redis as never;
  } catch {
    return null;
  }
}

function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function pruneMemory(now: number): void {
  if (memory.size < MAX_TRACKED_KEYS) return;
  for (const [k, v] of memory) {
    if (v.expiresAt < now) memory.delete(k);
  }
  if (memory.size >= MAX_TRACKED_KEYS) {
    const entries = [...memory.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    for (let i = 0; i < Math.floor(entries.length / 2); i++) memory.delete(entries[i][0]);
  }
}

async function readState<T>(key: string): Promise<T | null> {
  const redis = await getRedis();
  if (redis) {
    try {
      return parseJson<T>(await redis.get(key));
    } catch {
      // Redis unreachable → fall through to the in-memory copy.
    }
  }
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return parseJson<T>(entry.raw);
}

async function writeState<T>(key: string, value: T, ttlSec: number): Promise<void> {
  const ttl = Math.max(1, Math.ceil(ttlSec));
  const raw = JSON.stringify(value);
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.set(key, raw, 'EX', ttl);
      return;
    } catch {
      // Fall through to memory so the count survives a Redis blip.
    }
  }
  const now = Date.now();
  pruneMemory(now);
  memory.set(key, { raw, expiresAt: now + ttl * 1000 });
}

// ── the gate ─────────────────────────────────────────────────────────────

/**
 * The single chokepoint every OTP and link send passes through. Returns
 * `{blocked: false}` (state counted, the caller may send) or a refusal
 * carrying the honest countdown + user-facing message. A destination that
 * is currently blocked consumes nothing; the request that EXCEEDS the
 * budget is the one that arms the block and does not send.
 */
export async function consumeSendBudget(
  channel: SendBudgetChannel,
  destination: string,
): Promise<SendBudgetDecision> {
  const now = Date.now();
  const dest = destination.trim().toLowerCase();
  const key = `${KEY_PREFIX}${channel}:${dest}`;

  let state: DestBudgetState =
    (await readState<DestBudgetState>(key)) ?? { count: 0, windowStart: now, blockedUntil: 0, strikes: 0 };

  // (1) An active block refuses the send outright, countdown and all.
  if (state.blockedUntil > now) {
    const retryAfterSec = Math.ceil((state.blockedUntil - now) / 1000);
    recordSendEvent(channel, 'blocked_destination'); // §14.60 statistics
    return { blocked: true, kind: 'budget', retryAfterSec, message: budgetMessage(channel, retryAfterSec) };
  }
  // A block that has run out resets the budget window: the next strike has
  // to be re-earned from a full budget. The strike record itself lives on
  // in the key (TTL 2× the block) so the ladder still climbs.
  if (state.blockedUntil > 0) {
    state = { ...state, count: 0, windowStart: now, blockedUntil: 0 };
    await writeState(key, state, Math.max(Math.ceil(WINDOW_MS / 1000), 2 * Math.ceil(blockDurationMs(state.strikes) / 1000)));
  }

  // (2) The global daily cap for this channel — checked before anything is
  // counted so a refused send consumes nothing anywhere.
  const caps = await getSendDailyCaps();
  const cap = caps[channel];
  let daily: DailyBudgetState =
    (await readState<DailyBudgetState>(`${GLOBAL_PREFIX}${channel}`)) ?? { count: 0, windowStart: now };
  if (now - daily.windowStart >= DAY_MS) daily = { count: 0, windowStart: now };
  if (daily.count >= cap) {
    const retryAfterSec = Math.max(1, Math.ceil((daily.windowStart + DAY_MS - now) / 1000));
    recordSendEvent(channel, 'blocked_daily'); // §14.60 statistics
    return { blocked: true, kind: 'daily', retryAfterSec, message: dailyMessage(retryAfterSec) };
  }

  // (3) The per-destination 30-minute window.
  if (now - state.windowStart >= WINDOW_MS) state = { ...state, count: 0, windowStart: now };
  state = { ...state, count: state.count + 1 };

  if (state.count > LIMITS[channel]) {
    state = { ...state, strikes: state.strikes + 1, count: 0, windowStart: now };
    const blockMs = blockDurationMs(state.strikes);
    state.blockedUntil = now + blockMs;
    const blockSec = Math.ceil(blockMs / 1000);
    // Strike memory outlives the block by 2× its length, then decays.
    await writeState(key, state, Math.ceil((2 * blockMs) / 1000));
    recordSendEvent(channel, 'blocked_destination'); // §14.60 statistics
    return { blocked: true, kind: 'budget', retryAfterSec: blockSec, message: budgetMessage(channel, blockSec) };
  }

  // Allowed: count it against the window (and the day), TTLs past expiry.
  const windowRemainSec = Math.ceil((state.windowStart + WINDOW_MS - now) / 1000);
  const strikeTtlSec = state.strikes > 0 ? Math.ceil((2 * blockDurationMs(state.strikes)) / 1000) : 0;
  await writeState(key, state, Math.max(windowRemainSec + 60, strikeTtlSec));

  daily = { count: daily.count + 1, windowStart: daily.windowStart };
  await writeState(`${GLOBAL_PREFIX}${channel}`, daily, Math.ceil((daily.windowStart + DAY_MS - now) / 1000) + 60);
  return { blocked: false };
}
