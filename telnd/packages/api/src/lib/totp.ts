// RFC 4648 base32 + RFC 6238 TOTP (SHA-1, 6 digits, 30s step) — the exact
// profile every authenticator app speaks (Google Authenticator, Authy,
// 1Password…). Implemented on node:crypto so no dependency is needed and
// verification stays constant-time.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/[\s=]+/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) throw new Error('INVALID_BASE32');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** 160-bit secret (20 random bytes) — the size RFC 4226 recommends. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(key: Buffer, counter: bigint): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(counter);
  const digest = createHmac('sha1', key).update(msg).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const bin =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(bin % 1_000_000).padStart(6, '0');
}

function codeAt(secret: string, timeStepIndex: bigint): string | null {
  try {
    return hotp(base32Decode(secret), timeStepIndex);
  } catch {
    return null;
  }
}

/**
 * Accepts the previous / current / next step (±30s of clock skew, the
 * usual authenticator-app tolerance). Comparison is constant-time and a
 * malformed code simply fails.
 */
export function verifyTotp(secret: string, code: string, atMs: number = Date.now()): boolean {
  if (!/^\d{6}$/.test(code) || !secret) return false;
  const step = BigInt(Math.floor(atMs / 1000 / 30));
  const candidates = [step - 1n, step, step + 1n];
  const presented = Buffer.from(code, 'utf8');
  let ok = false;
  for (const c of candidates) {
    const expected = codeAt(secret, c);
    if (!expected) continue;
    // Accumulate instead of returning early so every candidate costs the
    // same compare (no timing leak on which window matched).
    if (timingSafeEqual(Buffer.from(expected, 'utf8'), presented)) ok = true;
  }
  return ok;
}

/** otpauth:// URI for the QR code — accounts for the manual-entry screen. */
export function otpauthUri(opts: { secret: string; account: string; issuer?: string }): string {
  const issuer = opts.issuer || 'TELND';
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(opts.account)}`;
  const params = new URLSearchParams({
    secret: opts.secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
