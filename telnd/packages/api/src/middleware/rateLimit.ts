import { Context, Next } from 'hono';

const counters = new Map<string, { count: number; expiresAt: number }>();

export function rateLimit(options: { windowMs: number; max: number }) {
  return async (c: Context, next: Next) => {
    try {
      const { redis } = await import('@telnd/database');
      const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
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
      // Redis unavailable — skip rate limiting
    }

    await next();
  };
}
