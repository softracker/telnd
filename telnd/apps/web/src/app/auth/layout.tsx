import type { Metadata } from 'next';
import { AuthGuard } from '@/components/auth/AuthGuard';

// One title for the whole sign-in flow — the pages themselves are client
// components, so the (server) route segment carries the metadata. The
// guard keeps signed-in visitors out (§14.51): they are routed to My
// Account before any login screen can paint.
export const metadata: Metadata = {
  title: 'Sign in — TELND',
  description: 'Sign in or create your TELND account.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
