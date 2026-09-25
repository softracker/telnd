import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SETTINGS_SECTIONS, sectionPermitted } from './lib/permissions';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Permission guard for settings sections. The nav hides sections the
 * current role has no grant for; this makes a typed URL answer the same
 * way a route that never existed would — a plain 404, never a "forbidden"
 * page (which would confirm the section exists).
 *
 * Who the caller is comes from the API's /api/auth/me: the session cookie
 * is host-scoped (ports don't matter to cookies), so forwarding the
 * incoming cookie header identifies them server-side.
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname.replace(/\/+$/, '') || '/';
  const section = SETTINGS_SECTIONS.find((s) => s.href === path);
  // Unlisted paths (/settings itself, /settings/preferences, /settings/about,
  // the /settings/denied rewrite target, everything else) pass straight through.
  if (!section || !section.permission) return NextResponse.next();

  let permissions: unknown = null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { cookie: request.headers.get('cookie') ?? '' },
      cache: 'no-store',
    });
    if (res.status === 401) {
      // No valid session — same destination AdminLayout would use.
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (!res.ok) throw new Error(`me responded ${res.status}`);
    const body = (await res.json()) as { data?: { adminRole?: { permissions?: unknown } | null } | null };
    permissions = body?.data?.adminRole?.permissions ?? null;
  } catch {
    // API unreachable (restart, deploy): fail open — the section's own API
    // guards still protect the data, while a lie here would 404 for everyone.
    return NextResponse.next();
  }

  const grants = Array.isArray(permissions)
    ? permissions.filter((p): p is string => typeof p === 'string')
    : [];
  if (grants.includes('*') || sectionPermitted(section.permission, (p) => grants.includes(p))) {
    return NextResponse.next();
  }

  // Answer exactly like a URL that is not part of the app — same 404
  // status a genuinely missing route returns, not just the same screen.
  const denied = NextResponse.rewrite(new URL('/settings/denied', request.url), { status: 404 });
  return denied;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
