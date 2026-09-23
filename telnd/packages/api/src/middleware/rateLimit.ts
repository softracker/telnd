import { Context, Next } from 'hono';
import { getIp } from '../lib/getIp';

const MAX_MAP_SIZE = 10000;
const counters = new Map<string, { count: number; expiresAt: number }>();

function inMemoryRateLimit(ip: string, options: { windowMs: number; max: number }): boolean {
  const now = Date.now();
  const key = `ratelimit:${ip}`;
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
    return false;
  }

  entry.count++;
  return entry.count > options.max;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of counters) {
    if (entry.expiresAt < now) counters.delete(key);
  }
}, 5 * 60 * 1000);

export function rateLimit(options: { windowMs: number; max: number }) {
  return async (c: Context, next: Next) => {
    const ip = getIp(c);

    try {
      const { redis } = await import('@telnd/database');
      const key = `ratelimit:${ip}`;

      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, Math.ceil(options.windowMs / 1000));
      }

      if (current > options.max) {
        return c.json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        }, 429);
      }

      c.header('X-RateLimit-Limit', String(options.max));
      c.header('X-RateLimit-Remaining', String(Math.max(0, options.max - current)));
    } catch {
      if (inMemoryRateLimit(ip, options)) {
        return c.json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        }, 429);
      }
    }

    await next();
  };
}
