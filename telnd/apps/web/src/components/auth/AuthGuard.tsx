'use client';

// Who may see the sign-in flow (§14.51):
//
//   default        — a signed-in visitor has no business here: they are
//                    sent straight to My Account, and the screen never
//                    paints the login form on the way (spinner only —
//                    no flash of a page they were just refused).
//   skip list      — credential-URL pages that work WITHOUT a session
//                    (magic-link click, reset link) or are DESIGNED for
//                    signed-in visitors (connect a provider) are passed
//                    through untouched — guarding them would break the
//                    very flow they exist for.
//
// The check runs once per entry: the layout persists across the flow's
// own step navigations, so mid-flow screens are never re-gated (a
// half-finished signup has no session yet and must keep rendering).

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearNext, rememberNext, useSession } from '@/lib/auth';
import { Spinner } from '@/components/auth/AuthUI';

/** Pages under /auth that are reachable signed-in or mid-credential. */
const SKIP = ['/auth/link', '/auth/callback', '/auth/reset-password', '/auth/login-link'];

function CenteredSpinner() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-white dark:bg-[#0D0D0D]"
      role="status"
      aria-label="Checking your session"
    >
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useSession();

  const skipped = SKIP.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Deep-linked `?next=` anywhere in the flow (the welcome sheet has the
  // same capture; this covers hand-built URLs like /auth/email?next=…).
  // Capture only — clearing a stale trip belongs to the entry page,
  // because the flow's own navigations drop the query string and must
  // not wipe what they are carrying.
  useEffect(() => {
    if (skipped) return;
    const raw = new URLSearchParams(window.location.search).get('next');
    if (raw) rememberNext(raw);
  }, [pathname, skipped]);

  useEffect(() => {
    if (skipped || loading || !user) return;
    // A signed-in visitor has no pending sign-in goal — forget the trip
    // so it can't surface in a later, unrelated sign-in.
    clearNext();
    router.replace('/my-account');
  }, [skipped, loading, user, router]);

  if (skipped) return <>{children}</>;
  // Still asking, or signed in and waiting for the redirect — either way
  // the login form must not paint.
  if (loading || user) return <CenteredSpinner />;
  return <>{children}</>;
}
