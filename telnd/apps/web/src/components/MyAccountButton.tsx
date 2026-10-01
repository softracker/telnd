'use client';

// The homepage header's "My Account" action (§14.51). The label never
// changes — only the destination: signed out it starts the sign-in flow
// with the trip remembered (?next=/my-account, so signup or login lands
// back here), signed in it goes straight to My Account. Until the session
// probe answers the href sits on the sign-in path, and a click in that
// window still converges — the auth guard routes a signed-in visitor to
// My Account anyway.
import Link from 'next/link';
import { useSession } from '@/lib/auth';

export function MyAccountButton() {
  const { user, loading } = useSession();
  const href = !loading && user ? '/my-account' : '/auth?next=/my-account';
  return (
    <Link href={href} className="btn-secondary">
      My Account
    </Link>
  );
}
