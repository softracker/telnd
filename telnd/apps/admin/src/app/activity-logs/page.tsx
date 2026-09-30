'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** The list lives at a typed section — land on the full feed. */
export default function ActivityLogsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/activity-logs/all');
  }, [router]);

  return null;
}
