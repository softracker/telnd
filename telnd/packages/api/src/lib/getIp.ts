import { Context } from 'hono';

export function getIp(c: Context): string {
  const forwardedFor = c.req.header('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  return c.req.header('x-real-ip') || c.req.header('cf-connecting-ip') || 'unknown';
}
