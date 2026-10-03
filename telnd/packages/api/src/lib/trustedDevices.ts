// §14.61 — device trust for the portal's second factor. After a user
// passes the 2FA challenge and asks to trust the device, the browser gets
// a random `telnd_trusted` cookie (30 days, HttpOnly, SameSite=Lax — the
// exact house cookie shape auth.ts uses for its own tokens) and this table
// stores only the SHA-256 of that token, so a database leak can never be
// replayed as a 2FA bypass. At the next sign-in a matching, unexpired row
// lets USER accounts skip the challenge (admins are never trusted — their
// factor is demanded fresh every sign-in). Revocation is a row delete:
// per device from the Security page, wholesale on password change, 2FA
// disable, or "sign out of all other devices".

import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@telnd/database';
import { describeLoginDevice } from './loginAlerts';
import { logUserActivity } from './userActivity';

export const TRUST_COOKIE = 'telnd_trusted';
export const TRUST_DAYS = 30;

const TRUST_MAX_AGE_SEC = TRUST_DAYS * 24 * 60 * 60;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Cookie flags copied from auth.ts's setAuthCookie/clearAuthCookie — a
// delete must match the set exactly (#22), and both live outside auth.ts
// (module-private there; importing it back would be circular).
function writeCookie(c: any, value: string, maxAgeSeconds: number) {
  const isSecure = process.env.NODE_ENV === 'production';
  c.header(
    'Set-Cookie',
    `${TRUST_COOKIE}=${value}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax; HttpOnly${isSecure ? '; Secure' : ''}`,
    { append: true },
  );
}

function readCookie(c: any): string | null {
  const entry = (c.req.header('Cookie') || '')
    .split(';')
    .map((part: string) => part.trim())
    .find((part: string) => part.startsWith(`${TRUST_COOKIE}=`));
  if (!entry) return null;
  return decodeURIComponent(entry.slice(TRUST_COOKIE.length + 1)) || null;
}

/** The hash of the trust cookie this request carries, or null — the list
 *  endpoint uses it to mark the row that belongs to THIS browser. */
export function currentTrustedHash(c: any): string | null {
  const token = readCookie(c);
  return token ? hashToken(token) : null;
}

/**
 * Called right after a challenge verify succeeds and the user asked for
 * it: mint a fresh 32-byte token, store its hash under the user, set the
 * cookie. Returns false (and trusts nothing) when the row cannot be
 * written — the sign-in still proceeds, the user just isn't trusted yet.
 */
export async function mintTrustedDevice(c: any, userId: string): Promise<boolean> {
  try {
    const token = randomBytes(32).toString('hex');
    const label = describeLoginDevice(c.req.header('user-agent') || null).label;
    await prisma.trustedDevice.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        label,
        userAgent: (c.req.header('user-agent') || '').slice(0, 512) || null,
      },
    });
    writeCookie(c, token, TRUST_MAX_AGE_SEC);
    // §14.68 — a trust grant the Security page can later revoke
    // (REVOKE_TRUSTED_DEVICE), so minting one earns its feed row too.
    logUserActivity(c, { userId, action: 'TRUSTED_DEVICE_ADDED', details: { label } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Called at the 2FA gate instead of minting the challenge: a valid,
 * unexpired row for THIS user makes the challenge skippable. A hit
 * refreshes lastUsedAt (display-only). Any failure answers "not trusted"
 * — fail closed. A stale cookie is cleared so the browser stops offering
 * a token the table no longer knows.
 */
export async function trustedDeviceMatches(c: any, userId: string): Promise<boolean> {
  try {
    const token = readCookie(c);
    if (!token) return false;
    const row = await prisma.trustedDevice.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, userId: true, createdAt: true },
    });
    const expired = !row || Date.now() - row.createdAt.getTime() > TRUST_MAX_AGE_SEC;
    if (!row || row.userId !== userId || expired) {
      if (row && row.userId !== userId) writeCookie(c, '', 0);
      if (expired) writeCookie(c, '', 0);
      return false;
    }
    void prisma.trustedDevice
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wipe trusted devices for a user. `keepHash` (the current request's own
 * trust hash) is spared — used by "sign out of all other devices", where
 * the caller keeps their session and with it the right to stay trusted.
 * Password change and 2FA disable pass nothing: everything dies.
 */
export async function clearTrustedDevices(userId: string, keepHash?: string | null): Promise<number> {
  try {
    const result = await prisma.trustedDevice.deleteMany({
      where: { userId, ...(keepHash ? { NOT: { tokenHash: keepHash } } : {}) },
    });
    return result.count;
  } catch {
    return 0;
  }
}
