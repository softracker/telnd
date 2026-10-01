// New-device sign-in alerts (§14.43).
//
// Every completed sign-in records the device it came from in
// UserLoginDevice. The FIRST row for a (user, deviceKey) pair means an
// account is being opened somewhere it never has before — that is the one
// moment the owner gets an email. Everything after just moves lastSeenAt.
//
// - deviceKey stays family-level ("chrome|windows|desktop") so the
//   Security page can label rows, but "known device" is decided by the
//   FULL stored User-Agent string, not the family (#24): a family key
//   alone is spoofable — an attacker who forges "Chrome|windows|desktop"
//   silences the alert from the account it is supposed to protect. Each
//   exact browser binary announces itself at most once (a genuine
//   Chrome upgrade counts as new — that is the honest reading).
// - Signup registers its device silently, so a fresh account is never
//   emailed moments after creation, and the very next sign-in from that
//   same browser is (correctly) not "new".
// - Entirely fire-and-forget: a dead mail server or a geo timeout must
//   never block or fail the login itself.

import { prisma } from '@telnd/database';
import { resolveLocation } from './geoLocation';
import { sendNewDeviceLoginEmail } from './email';

interface DeviceDescription {
  /** Stable family key, e.g. "chrome|windows|desktop". */
  key: string;
  /** Human label for the email, e.g. "Chrome on Windows". */
  label: string;
}

/**
 * Mirror of the admin panel's describeDevice: browser family + OS family +
 * form factor. Order matters (Edge/Opera ship inside a Chrome-branded UA;
 * Samsung Internet inside a Chrome-branded one too).
 */
export function describeLoginDevice(userAgent: string | null): DeviceDescription {
  if (!userAgent) return { key: 'other|other|desktop', label: 'Unknown device' };
  const browser =
    /Edg\//.test(userAgent) ? 'Edge'
    : /OPR\//.test(userAgent) ? 'Opera'
    : /Firefox\//.test(userAgent) ? 'Firefox'
    : /SamsungBrowser/.test(userAgent) ? 'Samsung Internet'
    : /Chrome\//.test(userAgent) ? 'Chrome'
    : /Safari\//.test(userAgent) ? 'Safari'
    : null;
  const os =
    /Windows/.test(userAgent) ? 'Windows'
    : /iPhone|iPad|iPod/.test(userAgent) ? 'iOS'
    : /Mac OS X|Macintosh/.test(userAgent) ? 'macOS'
    : /Android/.test(userAgent) ? 'Android'
    : /Linux/.test(userAgent) ? 'Linux'
    : null;
  const form = /Mobile|iPhone|iPad|Android|Silk/.test(userAgent) ? 'mobile' : 'desktop';
  const key = `${(browser ?? 'other').toLowerCase()}|${(os ?? 'other').toLowerCase()}|${form}`;
  const label = browser && os ? `${browser} on ${os}` : browser || os || 'Unknown device';
  return { key, label };
}

/**
 * Remember this device for the account. Returns true when it had never
 * been seen before (that flag is what decides whether an alert is owed).
 * A unique-constraint violation just records the visit; any other failure
 * degrades to "known" — an alert is best-effort, the login is not.
 */
export async function registerLoginDevice(userId: string, userAgent: string | null): Promise<boolean> {
  const { key } = describeLoginDevice(userAgent);
  try {
    await prisma.userLoginDevice.create({
      data: { userId, deviceKey: key, userAgent },
    });
    return true;
  } catch {
    try {
      await prisma.userLoginDevice.updateMany({
        where: { userId, deviceKey: key },
        data: { lastSeenAt: new Date(), userAgent },
      });
    } catch {
      // Database unavailable mid-login: the sign-in itself must continue.
    }
    return false;
  }
}

/**
 * The alert itself: recognize the device, and when it is brand new, email
 * the owner every detail of the sign-in that just happened. Never throws.
 */
export async function notifyNewDeviceLogin(user: {
  id: string;
  email: string | null;
  firstName: string;
}, ip: string, userAgent: string | null): Promise<void> {
  try {
    const isNew = await registerLoginDevice(user.id, userAgent);
    if (!isNew || !user.email) return;

    // Resolve the place while composing — attachLoginLocation races the
    // response by design; this runs after it, with nowhere to be.
    const geo = await resolveLocation(ip);
    const knownIp = ip && ip !== 'unknown' ? ip : null;
    await sendNewDeviceLoginEmail({
      to: user.email,
      firstName: user.firstName,
      device: describeLoginDevice(userAgent).label,
      ip: knownIp,
      location: geo?.location ?? null,
      signedInAt: new Date(),
    });
  } catch {
    // Alert delivery is best-effort; the session has already been issued.
  }
}
