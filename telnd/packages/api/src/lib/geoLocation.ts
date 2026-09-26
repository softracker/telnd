import { prisma } from '@telnd/database';

// ============================================
// IP geolocation for the Security page
// (Last login + Logged-in-devices rows show "City, Country" + flag emoji).
//
// Design notes:
// - Best-effort only: private/unknown IPs (local dev) are skipped without a
//   network call, provider failures resolve to null and the UI simply hides
//   the location. Never blocks a login.
// - In-memory cache keyed by IP (positive 6h / negative 30min) so the
//   per-request backfill and every login for the same IP hit the provider
//   at most once per window.
// - Provider: ipwho.is (HTTPS, no API key). If it is unreachable, we get
//   null and move on — no retry storm (negative cache).
// ============================================

const POSITIVE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const NEGATIVE_TTL_MS = 30 * 60 * 1000; // 30min
const FETCH_TIMEOUT_MS = 2500;

interface GeoResult {
  location: string | null;
  countryCode: string | null;
}

const cache = new Map<string, { value: GeoResult; at: number }>();

/** Local, reserved, or missing addresses — nothing to look up. */
export function isUnlocatableIp(ip: string | null | undefined): boolean {
  if (!ip) return true;
  const v = ip.trim().toLowerCase();
  if (!v || v === 'unknown' || v === '::1' || v === '0.0.0.0') return true;
  // IPv4 private / reserved ranges
  if (/^127\./.test(v)) return true;
  if (/^10\./.test(v)) return true;
  if (/^192\.168\./.test(v)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(v)) return true;
  if (/^169\.254\./.test(v)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(v)) return true; // CGNAT
  if (v.startsWith('fe80:') || v.startsWith('fc') || v.startsWith('fd')) return true; // IPv6 local
  if (v.startsWith('::ffff:127.') || v.startsWith('::ffff:10.')) return true;
  return false;
}

async function lookup(ip: string): Promise<GeoResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return { location: null, countryCode: null };
    const data = (await res.json()) as {
      success?: boolean;
      country?: string;
      country_code?: string;
      region?: string;
      city?: string;
    };
    if (data.success === false || !data.country_code) return { location: null, countryCode: null };
    const place = [data.city, data.country].filter(Boolean).join(', ');
    return {
      location: place || data.region || data.country || null,
      countryCode: data.country_code.toUpperCase(),
    };
  } catch {
    return { location: null, countryCode: null };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve an IP to `{ location, countryCode }`, or null when it is a private
 * address or the lookup failed. Cached (including failures) per the TTLs above.
 */
export async function resolveLocation(ip: string | null | undefined): Promise<GeoResult | null> {
  if (isUnlocatableIp(ip)) return null;
  const key = (ip as string).trim();

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < (hit.value.location ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS)) {
    return hit.value.location ? hit.value : null;
  }

  const value = await lookup(key);
  cache.set(key, { value, at: Date.now() });
  return value.location ? value : null;
}

/**
 * After a successful login: store the session's location and the user's
 * "last login" location. Fire-and-forget (`void`-called) — failures are
 * swallowed so the login response never waits on or fails because of geo.
 */
export async function attachLoginLocation(
  userId: string,
  sessionId: string,
  ip: string | null | undefined,
): Promise<void> {
  try {
    const geo = await resolveLocation(ip);
    await prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { location: geo?.location ?? null, countryCode: geo?.countryCode ?? null },
    });
    // Always overwrite the user-level copy — including with nulls. If this
    // sign-in had no resolvable location (local/private IP), keeping the
    // previous one would label the NEW lastLoginAt with the OLD place.
    await prisma.user.updateMany({
      where: { id: userId },
      data: { lastLoginLocation: geo?.location ?? null, lastLoginCountryCode: geo?.countryCode ?? null },
    });
  } catch {
    // best-effort — the Security page hides the location when it is missing
  }
}

/**
 * Backfill sessions created before geolocation existed (or before this
 * feature shipped): resolves any row that has an IP but no stored location
 * and persists it, so the list fills in on first view instead of staying
 * blank forever. In-memory cache keeps repeat views free; unresolvable IPs
 * simply stay null.
 */
export async function backfillSessionLocations<
  T extends { id: string; ipAddress: string | null; location: string | null; countryCode: string | null },
>(sessions: T[]): Promise<void> {
  const pending = sessions.filter((s) => !s.location && !isUnlocatableIp(s.ipAddress));
  if (pending.length === 0) return;
  await Promise.all(
    pending.map(async (s) => {
      const geo = await resolveLocation(s.ipAddress);
      if (!geo) return;
      s.location = geo.location;
      s.countryCode = geo.countryCode;
      await prisma.session.updateMany({
        where: { id: s.id, location: null },
        data: { location: geo.location, countryCode: geo.countryCode },
      });
    }),
  );
}
