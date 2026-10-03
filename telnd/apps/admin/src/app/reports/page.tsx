'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { REPORTS_SECTIONS, sectionPermitted } from '@/lib/permissions';

export default function ReportsPage() {
  const router = useRouter();
  const { can, isLoading } = useAuth();
  useEffect(() => {
    if (isLoading) return;
    // Land on the first report this admin's role can actually view —
    // the same rule the /settings index uses. Sections are listed in
    // nav order.
    const first = REPORTS_SECTIONS.find((section) => sectionPermitted(section.permission, can));
    router.replace(first ? first.href : '/reports/sending');
  }, [isLoading, can, router]);
  return null;
}
