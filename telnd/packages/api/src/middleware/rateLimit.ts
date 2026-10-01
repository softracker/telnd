import { Context, Next } from 'hono';
import { getIp } from '../lib/getIp';

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

export function rateLimit(options: { windowMs: number; max: number }) {
  return async (c: Context, next: Next) => {
    // Key by the authenticated account when there is one — a session id
    // can't be forged, so authenticated limits are immune to any IP
    // manipulation (and don't collide across users behind one address) —
    // falling back to the peer IP for anonymous traffic (#10).
    const who = (c.get('userId') as string | undefined) || getIp(c);
    // Keyed per request path: sharing one bucket per IP meant a burst on any
    // rate-limited route (e.g. reset-password) starved the others (login).
    const key = `ratelimit:${new URL(c.req.url).pathname}:${who}`;

    try {
      const { redis } = await import('@telnd/database');

      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, Math.ceil(options.windowMs / 1000));
      }

      if (current > options.max) {
        // The window's remaining seconds ride along so the caller can say
        // WHEN to come back instead of an open-ended "later" — the fixed
        // window started at the first request, so the TTL is exact.
        const ttl = await redis.ttl(key);
        const retryAfter = ttl > 0 ? ttl : Math.ceil(options.windowMs / 1000);
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

      c.header('X-RateLimit-Limit', String(options.max));
      c.header('X-RateLimit-Remaining', String(Math.max(0, options.max - current)));
    } catch {
      const retryAfter = inMemoryRateLimit(key, options);
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
