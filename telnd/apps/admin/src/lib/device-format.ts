// Device + time display helpers shared by the admin panel's session views:
// Settings → Security's own "Logged in devices" list and the Users modal's
// session / trusted-device sections (§14.62). Moved out of the security page
// so both views describe the same row the same way.

import type { TranslationKey } from './translations';

/**
 * Browser + OS + form factor parsed from the stored user-agent. Unknown or
 * missing agents fall back to "Not recorded" instead of a raw UA string.
 */
export function describeDevice(ua: string | null, t: (key: TranslationKey) => string): { name: string; icon: string } {
  if (!ua) return { name: t('security.notRecorded'), icon: '💻' };
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : null;
  const os =
    /Windows/.test(ua) ? 'Windows'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Android/.test(ua) ? 'Android'
    : /Linux/.test(ua) ? 'Linux'
    : null;
  if (!browser && !os) return { name: t('security.notRecorded'), icon: '💻' };
  const icon = /Mobile|iPhone|iPad|Android|Silk/.test(ua) ? '📱' : '💻';
  const name = browser && os ? `${browser} on ${os}` : browser || os;
  return { name: name as string, icon };
}

/**
 * Regional-indicator emoji built from an ISO-3166 alpha-2 code
 * ("BD" → 🇧🇩) — flags are generated at runtime so no glyph ever
 * lands in translations.ts (ASCII-only rule).
 */
export function countryFlag(code: string | null | undefined): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return '';
  const up = code.toUpperCase();
  return String.fromCodePoint(0x1f1e6 + up.charCodeAt(0) - 65, 0x1f1e6 + up.charCodeAt(1) - 65);
}

/** "2 hours ago" / "in 5 days" — localized through Intl.RelativeTimeFormat. */
export function relativeTime(iso: string, language: string): string {
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), 'day');
  return rtf.format(Math.round(diffSec / 2592000), 'month');
}

/** Absolute "Oct 3, 2026, 8:15 AM"-style stamp for hover/title detail. */
export function absoluteTime(iso: string, language: string): string {
  return new Date(iso).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
