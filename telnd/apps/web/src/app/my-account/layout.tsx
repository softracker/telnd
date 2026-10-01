import type { Metadata } from 'next';
import { MyAccountShell } from '@/components/account/MyAccountShell';
import '@/styles/account.css';

// One title for the account area — the pages themselves are client
// components where they need to be, so the (server) route segment
// carries the metadata. The shell it wraps is the admin panel's
// layout, replicated (§14.51): the contents arrive in a later round.
export const metadata: Metadata = {
  title: 'My Account — TELND',
  description: 'Your TELND account.',
};

export default function MyAccountLayout({ children }: { children: React.ReactNode }) {
  return <MyAccountShell>{children}</MyAccountShell>;
}
