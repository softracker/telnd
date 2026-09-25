'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { SETTINGS_SECTIONS, sectionPermitted } from '@/lib/permissions';

export default function SettingsPage() {
  const router = useRouter();
  const { can, isLoading } = useAuth();
  useEffect(() => {
    if (isLoading) return;
    // Land on the first section this admin's role can actually view
    // instead of always forcing /settings/general (which may be a 404
    // for their role). Sections are listed in nav order.
    const first = SETTINGS_SECTIONS.find((section) => sectionPermitted(section.permission, can));
    router.replace(first ? first.href : '/settings/preferences');
  }, [isLoading, can, router]);
  return null;
}
