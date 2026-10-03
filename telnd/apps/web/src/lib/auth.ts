// Shared helpers for the portal's sign-in flow (welcome → email → password,
// phone → OTP, magic link, reset link). Everything here talks same-origin
// through the /api rewrite proxy (see lib/api.ts).

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';

export type ProviderKey =
  | 'email'
  | 'emailLink'
  | 'phone'
  | 'google'
  | 'facebook'
  | 'linkedin';

export type ProviderFlags = Record<ProviderKey, boolean>;

/** What the API serves when Login Providers was never configured. */
export const DEFAULT_PROVIDERS: ProviderFlags = {
  email: true,
  emailLink: true,
  phone: true,
  google: false,
  facebook: false,
  linkedin: false,
};

/**
 * Shown when the providers fetch itself fails: an unreachable settings
 * endpoint must never leave an empty sign-in chooser — show every method
 * and let the individual sign-ins answer for themselves.
 */
export const ALL_PROVIDERS: ProviderFlags = {
  email: true,
  emailLink: true,
  phone: true,
  google: true,
  facebook: true,
  linkedin: true,
};

export async function fetchProviders(): Promise<ProviderFlags> {
  try {
    const res = await fetch('/api/auth/providers');
    if (!res.ok) return ALL_PROVIDERS;
    const json = (await res.json()) as { data?: Partial<ProviderFlags> };
    const data = json?.data;
    if (!data || typeof data !== 'object') return ALL_PROVIDERS;
    const out: ProviderFlags = { ...DEFAULT_PROVIDERS };
    for (const key of Object.keys(DEFAULT_PROVIDERS) as ProviderKey[]) {
      if (typeof data[key] === 'boolean') out[key] = data[key]!;
    }
    return out;
  } catch {
    return ALL_PROVIDERS;
  }
}

/** The API's own message when it sent one; the caller's fallback otherwise. */
export function authErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const data = err.data as
      | { error?: { message?: string }; message?: string }
      | null;
    return data?.error?.message || data?.message || fallback;
  }
  return fallback;
}

/** The API's machine-readable error code ('METHOD_DISABLED', …) if any. */
export function authErrorCode(err: unknown): string | null {
  if (err instanceof ApiError) {
    const data = err.data as { error?: { code?: string } } | null;
    return data?.error?.code || null;
  }
  return null;
}

/** Full E.164-ish number from a country code + typed digits. */
export function combinePhone(countryCode: string, raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '');
  return `${countryCode}${digits}`;
}

export const PHONE_PATTERN = /^\+?[1-9]\d{6,14}$/;

/** Practical address shape for the client steps — the API re-validates. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Seconds between two OTP sends, ticking down to zero. */
export function useCountdown(initial: number) {
  const [seconds, setSeconds] = useState(initial);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  return [seconds, setSeconds] as const;
}

// ── Return-to (§14.51) ───────────────────────────────────────────────────
// "After signup or login, go back to the page the visitor came from."
// Entry pages (the welcome sheet) read their `?next=` and remember it
// here; the flow's own step navigations drop the query string, and the
// OAuth round-trip through the provider can't carry one at all — so the
// trip rides sessionStorage and every success landing CONSUMES it.
// Only same-site relative paths are ever accepted: `//evil.com` or
// `/\evil` can never become a redirect target.
const NEXT_KEY = 'telnd_auth_next';

export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null;
  return raw;
}

/** Entry pages call this with their `?next=` — null clears a stale trip. */
export function rememberNext(raw: string | null | undefined): void {
  try {
    const path = safeNextPath(raw);
    if (path) sessionStorage.setItem(NEXT_KEY, path);
    else sessionStorage.removeItem(NEXT_KEY);
  } catch {
    // Private mode / storage blocked — the flow just lands on home.
  }
}

/**
 * Drop a remembered trip. Used when the visitor turns out to be signed in
 * already — the auth guard sends them to My Account, so a pending landing
 * must not hijack some later sign-in from another device session.
 */
export function clearNext(): void {
  rememberNext(null);
}

/**
 * Where a successful sign-up or sign-in goes: `?next` if the final page
 * still carries one, else the remembered trip, else home. Consumes the
 * remembered trip so a later sign-in can't inherit this one's destination.
 */
export function landingPath(queryNext?: string | null): string {
  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem(NEXT_KEY);
    sessionStorage.removeItem(NEXT_KEY);
  } catch {
    // Storage unavailable — fall through to the defaults.
  }
  return safeNextPath(queryNext) ?? safeNextPath(stored) ?? '/';
}

// ── Session probe (§14.51) ───────────────────────────────────────────────
// The portal's session lives in an httpOnly cookie, so the only way to
// know whether anyone is signed in is asking /api/auth/me. Deliberately
// uncached: every mount asks, which keeps the auth guard, the header
// button and the My Account shell honest right after a login or logout.
// refreshSession() re-asks every mounted hook — used when something the
// header shows has changed underneath it (the Profile page's photo, §14.66).
export interface SessionUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
  role?: string;
}

const SESSION_REFRESH_EVENT = 'telnd:session-refresh';

/** Make every mounted useSession() fetch the server again. */
export function refreshSession(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_REFRESH_EVENT));
}

export function useSession(): { user: SessionUser | null; loading: boolean } {
  const [state, setState] = useState<{ user: SessionUser | null; loading: boolean }>({
    user: null,
    loading: true,
  });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (!res.ok) {
          if (alive) setState({ user: null, loading: false });
          return;
        }
        const json = (await res.json()) as { data?: SessionUser };
        if (alive) setState({ user: json.data ?? null, loading: false });
      } catch {
        // API unreachable — treat as signed out; the guards send the
        // visitor to the sign-in flow rather than a dead My Account.
        if (alive) setState({ user: null, loading: false });
      }
    };
    void load();
    window.addEventListener(SESSION_REFRESH_EVENT, load);
    return () => {
      alive = false;
      window.removeEventListener(SESSION_REFRESH_EVENT, load);
    };
  }, []);
  return state;
}
