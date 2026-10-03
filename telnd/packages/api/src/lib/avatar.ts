// ── Profile pictures (§14.66) ─────────────────────────────────────────────
// Two avatar helpers, shared by My Account's photo controls and the social
// sign-in seed:
//
// - deleteAvatarObject(url) drops a stored picture's object after the row
//   has already moved on — best-effort by design (a stray object is
//   harmless; the row is the source of truth), and a URL outside the
//   configured public base is simply unlinked, never "deleted".
// - seedAvatarFromSocial(userId, picture, provider) answers an EMPTY slot
//   from a provider photo and never touches a filled one: a picture the
//   member set themselves always wins, and the first social arrival is
//   the only thing that ever fills a blank. The download is locked to
//   https plus the provider's own CDN hosts (the URL arrives from
//   userinfo and must never be able to aim the API at its own internals),
//   capped at 5 MB / 6 s, then converted on the exact admin-photo rails
//   (512² WebP, quality 85) into avatars/. Every failure swallows: a dead
//   CDN can never fail a sign-in, and the write re-checks `avatar IS NULL`
//   under the update so a photo uploaded mid-download steps aside.

import { prisma } from '@telnd/database';
import type { OAuthProvider } from './oauth';
import {
  convertToWebP,
  deleteFromR2,
  ensureR2,
  generateUploadKey,
  uploadToR2,
} from './r2';

/** Provider CDN hosts a profile photo may arrive from (exact host or suffix). */
const PHOTO_HOSTS: Record<OAuthProvider, string[]> = {
  google: ['googleusercontent.com', 'ggpht.com'],
  facebook: ['fbcdn.net', 'fbsbx.com', 'akamaihd.net', 'facebook.net'],
  linkedin: ['licdn.com', 'licdn.net'],
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TIMEOUT_MS = 6_000;

/** Same conversion the admin panel's avatar uploader runs (§ account photo). */
const AVATAR_PIXELS = 512;
const AVATAR_QUALITY = 85;

/** Best-effort removal of a stored picture — the row has already moved. */
export async function deleteAvatarObject(url: string): Promise<void> {
  try {
    const config = await ensureR2();
    const base = config.publicUrl.replace(/\/+$/, '');
    if (!url.startsWith(base + '/')) return;
    await deleteFromR2(url.slice(base.length + 1));
  } catch {
    // Storage unreachable, not configured, or the object already gone —
    // unlinking the row is what actually matters.
  }
}

/**
 * Fill an empty avatar slot from a provider photo (never overwrite one).
 * Awaits its one attempt so a fresh social signup lands with the picture
 * already on the row, but every failure — network, decode, storage —
 * ends in a logged no-op instead of an auth error.
 */
export async function seedAvatarFromSocial(
  userId: string,
  picture: string | null,
  provider: OAuthProvider,
): Promise<void> {
  try {
    if (!picture) return;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatar: true } });
    if (!user || user.avatar) return; // Their own picture — untouched.

    let target: URL;
    try {
      target = new URL(picture);
    } catch {
      return;
    }
    if (target.protocol !== 'https:') return;
    const host = target.hostname.toLowerCase();
    if (!PHOTO_HOSTS[provider].some((allowed) => host === allowed || host.endsWith('.' + allowed))) return;

    const resp = await fetch(target, {
      signal: AbortSignal.timeout(PHOTO_TIMEOUT_MS),
      redirect: 'follow',
      headers: { Accept: 'image/*' },
    });
    if (!resp.ok) return;
    const type = resp.headers.get('content-type') || '';
    if (type && !type.startsWith('image/')) return;
    const bytes = Buffer.from(await resp.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) return;

    await ensureR2();
    const webp = await convertToWebP(bytes, { width: AVATAR_PIXELS, height: AVATAR_PIXELS, quality: AVATAR_QUALITY });
    const key = generateUploadKey('avatars', `social-${provider}`);
    const url = await uploadToR2(key, webp, 'image/webp');

    const applied = await prisma.user.updateMany({
      where: { id: userId, avatar: null },
      data: { avatar: url },
    });
    if (applied.count === 0) await deleteFromR2(key).catch(() => {});
  } catch (err) {
    console.error('[oauth] social avatar seed failed:', err instanceof Error ? err.message : err);
  }
}
