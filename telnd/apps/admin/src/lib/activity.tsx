// Activity-types catalog for /activity-logs — the side-nav sections and
// their route validation in one place, mirroring how permissions.ts holds
// the settings sections.
//
// To add a future section: add its key here (icon + label/description
// translation keys), extend ACTIVITY_TYPES/activityWhere() in
// packages/api/src/lib/activityFeed.ts, and add the en/bn keys — the E2E
// partition assertion catches a one-sided change.
import type { ReactNode } from 'react';

export const ACTIVITY_TYPE_KEYS = ['all', 'login', 'user', 'admin', 'employer', 'smtp'] as const;
export type ActivityKey = (typeof ACTIVITY_TYPE_KEYS)[number];

export function isActivityKey(value: string): value is ActivityKey {
  return (ACTIVITY_TYPE_KEYS as readonly string[]).includes(value);
}

export interface ActivityTypeItem {
  key: ActivityKey;
  href: string;
  icon: ReactNode;
  labelKey: string;
  descKey: string;
}

const listIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const loginIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

const userIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const adminIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const employerIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const smtpIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

export const ACTIVITY_TYPES: ActivityTypeItem[] = [
  { key: 'all', href: '/activity-logs/all', icon: listIcon, labelKey: 'activityNav.all', descKey: 'activityNav.allDesc' },
  { key: 'login', href: '/activity-logs/login', icon: loginIcon, labelKey: 'activityNav.login', descKey: 'activityNav.loginDesc' },
  { key: 'user', href: '/activity-logs/user', icon: userIcon, labelKey: 'activityNav.user', descKey: 'activityNav.userDesc' },
  { key: 'admin', href: '/activity-logs/admin', icon: adminIcon, labelKey: 'activityNav.admin', descKey: 'activityNav.adminDesc' },
  { key: 'employer', href: '/activity-logs/employer', icon: employerIcon, labelKey: 'activityNav.employer', descKey: 'activityNav.employerDesc' },
  { key: 'smtp', href: '/activity-logs/smtp', icon: smtpIcon, labelKey: 'activityNav.smtp', descKey: 'activityNav.smtpDesc' },
];

export const ACTIVITY_BY_KEY = Object.fromEntries(
  ACTIVITY_TYPES.map((item) => [item.key, item]),
) as Record<ActivityKey, ActivityTypeItem>;

/** One row of GET /api/admin/activity. */
export interface ActivityItem {
  id: string;
  action: string;
  category: Exclude<ActivityKey, 'all'>;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; email: string; name: string } | null;
}

export interface ActivityResponse {
  type: ActivityKey;
  items: ActivityItem[];
  /** SMTP section only: all-time delivery counters. */
  summary: { sent: number; failed: number } | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** "REQUIRE_TWO_FACTOR" → "Require Two Factor" (dynamic data, not translated). */
export function humanizeAction(action: string): string {
  return action
    .split('_')
    .map((word) => (word ? word[0] + word.slice(1).toLowerCase() : word))
    .join(' ');
}
