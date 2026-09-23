const WINDOW_MS = 5 * 60 * 1000;
const THRESHOLD = 20;
const BASE_LOCKOUT_MS = 15 * 60 * 1000;
const MAX_LOCKOUT_MS = 120 * 60 * 1000;
const KEY_PREFIX = 'loginlockout:';
const MAX_TRACKED_IPS = 20;
const CROSS_IP_THRESHOLD = 3;

interface LockoutState {
  failedCount: number;
  windowStart: number;
  lockoutUntil: number;
  lockoutLevel: number;
  sourceIps: string[];
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function getStateKey(email: string): string {
  return `${KEY_PREFIX}${normalizeEmail(email)}`;
}

async function getRedis() {
  try {
    const { redis } = await import('@telnd/database');
    return redis;
  } catch {
    return null;
  }
}

function parseState(raw: string | null): LockoutState | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isWindowExpired(state: LockoutState): boolean {
  return Date.now() - state.windowStart > WINDOW_MS;
}

function applyWindowReset(state: LockoutState): LockoutState {
  if (isWindowExpired(state)) {
    return { ...state, failedCount: 0, windowStart: Date.now(), sourceIps: [] };
  }
  return state;
}

export async function getLockoutState(email: string): Promise<LockoutState | null> {
  const redis = await getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get(getStateKey(email));
    const state = parseState(raw);
    if (!state) return null;
    return applyWindowReset(state);
  } catch {
    return null;
  }
}

export function isCurrentlyLockedOut(state: LockoutState | null): boolean {
  if (!state) return false;
  return state.lockoutUntil > Date.now();
}

export function getRetryAfterMs(state: LockoutState | null): number {
  if (!state || state.lockoutUntil <= Date.now()) return 0;
  return state.lockoutUntil - Date.now();
}

export function getRetryAfterSeconds(state: LockoutState | null): number {
  return Math.ceil(getRetryAfterMs(state) / 1000);
}

export async function recordFailedAttempt(email: string, ip?: string): Promise<{ lockedOut: boolean; lockoutDurationMs: number; crossIpAttack: boolean }> {
  const redis = await getRedis();
  const defaultResult = { lockedOut: false, lockoutDurationMs: 0, crossIpAttack: false };

  if (!redis) return defaultResult;

  try {
    const key = getStateKey(email);
    const raw = await redis.get(key);
    let state = parseState(raw) || { failedCount: 0, windowStart: Date.now(), lockoutUntil: 0, lockoutLevel: 0, sourceIps: [] };

    state = applyWindowReset(state);

    if (ip && !state.sourceIps.includes(ip)) {
      if (state.sourceIps.length < MAX_TRACKED_IPS) {
        state.sourceIps.push(ip);
      }
    }

    state.failedCount += 1;

    const crossIpAttack = state.sourceIps.length >= CROSS_IP_THRESHOLD;

    if (state.failedCount >= THRESHOLD) {
      let lockoutDurationMs: number;

      if (crossIpAttack) {
        lockoutDurationMs = BASE_LOCKOUT_MS;
      } else {
        lockoutDurationMs = Math.min(BASE_LOCKOUT_MS * Math.pow(2, state.lockoutLevel), MAX_LOCKOUT_MS);
      }

      state.lockoutUntil = Date.now() + lockoutDurationMs;
      state.lockoutLevel += 1;
      state.failedCount = 0;
      state.windowStart = Date.now();

      await redis.set(key, JSON.stringify(state), 'EX', MAX_LOCKOUT_MS / 1000);

      return { lockedOut: true, lockoutDurationMs, crossIpAttack };
    }

    await redis.set(key, JSON.stringify(state), 'EX', MAX_LOCKOUT_MS / 1000);

    return { lockedOut: false, lockoutDurationMs: 0, crossIpAttack: false };
  } catch {
    return defaultResult;
  }
}

export async function resetLockout(email: string): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  try {
    await redis.del(getStateKey(email));
  } catch {
    // best effort
  }
}

export function getLockoutLevel(state: LockoutState | null): number {
  return state?.lockoutLevel ?? 0;
}

export function getFailedCount(state: LockoutState | null): number {
  return state?.failedCount ?? 0;
}
