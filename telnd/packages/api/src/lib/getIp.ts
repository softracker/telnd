import { Context } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';

/**
 * Trust model for client IPs (#10).
 *
 * Forwarding headers (`X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP`)
 * are written by the *client* unless a trusted proxy overwrites them — and
 * on this stack nothing did (verified: neither the Next proxy nor direct
 * requests stamp them), so keying per-IP limits on them made every one of
 * them per-guessed-header. The TCP peer address cannot be forged, so it is
 * the default; forwarding headers are consulted only when the operator
 * explicitly declares a stamping proxy with `TRUST_PROXY=true`.
 *
 * `normalize` collapses the forms Node reports for the same peer
 * (IPv4-mapped IPv6, loopback-as-`::1`) so one client always maps to one
 * bucket.
 */
function normalize(address?: string | null): string | null {
  if (!address) return null;
  const v4 = address.replace(/^::ffff:/i, '');
  if (v4 === '::1') return '127.0.0.1';
  return v4;
}

export function getIp(c: Context): string {
  if (process.env.TRUST_PROXY === 'true') {
    const forwardedFor = c.req.header('x-forwarded-for');
    if (forwardedFor) {
      const firstIp = forwardedFor.split(',')[0].trim();
      if (firstIp) return firstIp;
    }
    const headerIp = c.req.header('x-real-ip') || c.req.header('cf-connecting-ip');
    if (headerIp) return headerIp;
  }

  try {
    const info = getConnInfo(c);
    const peer = normalize(info.remote?.address);
    if (peer) return peer;
  } catch {
    // Not running under @hono/node-server (edge/test harness) — fall
    // through rather than fabricate an address.
  }
  return 'unknown';
}
