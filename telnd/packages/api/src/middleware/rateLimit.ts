import { Context, Next } from 'hono';
import { getIp } from '../lib/getIp';
import { RATE_LIMITS, type RateLimitKey } from '../lib/rateLimitConfig';

const MAX_MAP_SIZE = 10000;
const counters = new Map<string, { count: number; expiresAt: number }>();

/** Returns null while allowed, else the seconds left in the window. */
function inMemoryRateLimit(key: string, options: { windowMs: number; max: number }): number | null {
  const now = Date.now();
  const entry = counters.get(key);

  if (!entry || entry.expiresAt < now) {
    if (counters.size >= MAX_MAP_SIZE) {
      for (const [k, v] of counters) {
        if (v.expiresAt < now) counters.delete(k);
      }
      if (counters.size >= MAX_MAP_SIZE) {
        const entries = [...counters.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
        for (let i = 0; i < Math.floor(entries.length / 2); i++) {
          counters.delete(entries[i][0]);
        }
      }
    }
    counters.set(key, { count: 1, expiresAt: now + options.windowMs });
    return null;
  }

  entry.count++;
  if (entry.count <= options.max) return null;
  return Math.max(1, Math.ceil((entry.expiresAt - now) / 1000));
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of counters) {
    if (entry.expiresAt < now) counters.delete(key);
  }
}, 5 * 60 * 1000);

// ── effective limits: registry default + admin override (§14.60) ─────────
//
// The admin's editor stores `{ [key]: { windowSec, max } }` under the
// `rateLimits` settings key. It's read through a short-lived in-process
// cache so the hot auth routes never pay a query per request, while a save
// still lands within seconds. Unreadable settings (or a first run with no
// row at all) simply leave the registry defaults in force.

const OVERRIDE_TTL_MS = 10_000;
let overrideCache: { at: number; map: Record<string, unknown> } | null = null;

type ResolvedLimits = { windowMs: number; max: number };

async function resolveLimits(key: RateLimitKey): Promise<ResolvedLimits> {
  const rule = RATE_LIMITS[key];
  const fallback: ResolvedLimits = { windowMs: rule.windowSec * 1000, max: rule.max };
  try {
    const now = Date.now();
    if (!overrideCache || now - overrideCache.at >= OVERRIDE_TTL_MS) {
      const { prisma } = await import('@telnd/database');
      const row = await prisma.setting.findUnique({ where: { key: 'rateLimits' } });
      const value = row?.value;
      overrideCache = {
        at: now,
        map: value && typeof value === 'object' && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {},
      };
    }
    const raw = overrideCache.map[key];
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const ov = raw as { windowSec?: unknown; max?: unknown };
      // Only well-formed numbers ever change the middleware's behavior —
      // the settings PUT validates bounds on write, this is belt-and-braces
      // for rows written by older/newer code.
      const windowSec = typeof ov.windowSec === 'number' && Number.isFinite(ov.windowSec) ? Math.floor(ov.windowSec) : fallback.windowMs / 1000;
      const max = typeof ov.max === 'number' && Number.isFinite(ov.max) ? Math.floor(ov.max) : fallback.max;
      return { windowMs: windowSec * 1000, max };
    }
    return fallback;
  } catch {
    // Settings unreadable → defaults; cache an empty map so a failing DB
    // can't turn every rate-limited request into a failing query.
    overrideCache = overrideCache ?? { at: Date.now(), map: {} };
    return fallback;
  }
}

export function rateLimit(key: RateLimitKey) {
  return async (c: Context, next: Next) => {
    // Effective limits are resolved per request: the cached override map
    // makes this a memory hit in steady state, and an admin's save applies
    // to the very next request after the cache expires.
    const { windowMs, max } = await resolveLimits(key);

    // Key by the authenticated account when there is one — a session id
    // can't be forged, so authenticated limits are immune to any IP
    // manipulation (and don't collide across users behind one address) —
    // falling back to the peer IP for anonymous traffic (#10).
    const who = (c.get('userId') as string | undefined) || getIp(c);
    // Keyed per request path: sharing one bucket per IP meant a burst on any
    // rate-limited route (e.g. reset-password) starved the others (login).
    const rateKey = `ratelimit:${new URL(c.req.url).pathname}:${who}`;

    try {
      const { redis } = await import('@telnd/database');

      const current = await redis.incr(rateKey);
      if (current === 1) {
        await redis.expire(rateKey, Math.ceil(windowMs / 1000));
      }

      if (current > max) {
        // The window's remaining seconds ride along so the caller can say
        // WHEN to come back instead of an open-ended "later" — the fixed
        // window started at the first request, so the TTL is exact.
        const ttl = await redis.ttl(rateKey);
        const retryAfter = ttl > 0 ? ttl : Math.ceil(windowMs / 1000);
        c.header('Retry-After', String(retryAfter));
        return c.json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Please try again in ${retryAfter} second${retryAfter === 1 ? '' : 's'}.`,
            retryAfter,
          },
        }, 429);
      }

      c.header('X-RateLimit-Limit', String(max));
      c.header('X-RateLimit-Remaining', String(Math.max(0, max - current)));
    } catch {
      const retryAfter = inMemoryRateLimit(rateKey, { windowMs, max });
      if (retryAfter !== null) {
        c.header('Retry-After', String(retryAfter));
        return c.json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Please try again in ${retryAfter} second${retryAfter === 1 ? '' : 's'}.`,
            retryAfter,
          },
        }, 429);
      }
    }

    await next();
  };
}
