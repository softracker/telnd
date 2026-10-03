/**
 * Activity feed for /activity-logs — one flat action log (the AdminAction
 * table) presented as typed sections: all | login | user | admin | employer
 * | smtp.
 *
 * Categories are derived from existing columns (action + targetType) plus
 * whether the ACTOR holds an AdminUser row, so the whole history is
 * filterable in SQL — no denormalized column, no backfill. The WHERE
 * builders form a provably disjoint partition:
 *
 *   login    → action ∈ LOGIN_ACTIONS
 *   admin    → action ∈ ADMIN_MANAGEMENT_ACTIONS
 *            ∪ targetType ∈ ADMIN_TARGETS
 *            ∪ (actor holds an AdminUser row, targeting nothing special)
 *   smtp     → targetType = 'smtp'           (system rows, actor is null)
 *   employer → (neither of the above) ∩ targetType ∈ EMPLOYER_TARGETS
 *   user     → everything else: a NON-admin actor doing something that is
 *              not login/mail/employer — activity of the :3000 web app,
 *              written by lib/userActivity.ts since §14.68 (the panel's
 *              own writes are all "admin").
 *
 * so count(all) === the sum of the five always holds. Adding a future
 * section means: its set here + the matching branch in activityWhere() +
 * a nav entry in apps/admin/src/lib/activity.ts + its translation keys —
 * the E2E script asserts the partition invariant, so a broken mapping
 * fails the build rather than silently dropping or double-counting rows.
 */

/** Section keys, in nav order. 'all' is the union of the other five. */
export const ACTIVITY_TYPES = ['all', 'login', 'user', 'admin', 'employer', 'smtp'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export function isActivityType(value: string): value is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(value);
}

/** Sign-ins — one row per completed session, written by issueSession(). */
const LOGIN_ACTIONS = ['LOGIN'];

/**
 * Admin-management work whose row carries targetType 'user' (every admin
 * CRUD acts on a user account) — without this list those rows would fall
 * through the actor test below.
 */
const ADMIN_MANAGEMENT_ACTIONS = [
  'CREATE_ADMIN',
  'UPDATE_ADMIN',
  'DELETE_ADMIN',
  'REGENERATE_ADMIN_PASSWORD',
  'SECURITY_PIN_RESET',
];

/**
 * Targets only admin-management ever writes. Must stay disjoint from
 * EMPLOYER_TARGETS and 'smtp' (checked by the E2E partition assertion).
 */
const ADMIN_TARGETS = ['role', 'feature', 'maintenance', 'setting', 'report', 'permission'];

/** Employer-owned targets (job postings etc.). Disjoint from ADMIN_TARGETS. */
const EMPLOYER_TARGETS = ['company', 'job', 'employer'];

/** Mail deliveries — written with a null actor by lib/email.ts. */
const SMTP_TARGETS = ['smtp'];

/** Does the row's actor hold a panel row? (Null actor → false.) */
const actorIsAdmin = (admin: { adminUser?: unknown } | null | undefined): boolean =>
  Boolean(admin && admin.adminUser);

/** Prisma `where` for one section (or {} for 'all'). */
export function activityWhere(type: ActivityType): Record<string, unknown> {
  const noPriorClaim = { notIn: [...LOGIN_ACTIONS, ...ADMIN_MANAGEMENT_ACTIONS] };
  switch (type) {
    case 'all':
      return {};
    case 'login':
      return { action: { in: LOGIN_ACTIONS } };
    case 'admin':
      return {
        OR: [
          { action: { in: ADMIN_MANAGEMENT_ACTIONS } },
          { AND: [{ action: { notIn: LOGIN_ACTIONS } }, { targetType: { in: ADMIN_TARGETS } }] },
          {
            AND: [
              { action: { notIn: LOGIN_ACTIONS } },
              { targetType: { notIn: [...EMPLOYER_TARGETS, ...SMTP_TARGETS] } },
              // The actor's AdminUser row — the panel-writes-are-admin rule.
              { admin: { adminUser: { isNot: null } } },
            ],
          },
        ],
      };
    case 'smtp':
      return { targetType: { in: SMTP_TARGETS } };
    case 'employer':
      return {
        action: { notIn: noPriorClaim.notIn },
        targetType: { in: EMPLOYER_TARGETS },
      };
    case 'user':
      return {
        AND: [
          { action: { notIn: noPriorClaim.notIn } },
          { targetType: { notIn: [...ADMIN_TARGETS, ...EMPLOYER_TARGETS, ...SMTP_TARGETS] } },
          // NOT actor-is-admin — the complement of the admin branch.
          { OR: [{ admin: { is: null } }, { admin: { adminUser: { is: null } } }] },
        ],
      };
  }
}

/** Section a single row belongs to — mirrors activityWhere() exactly. */
export function activityCategory(
  action: string,
  targetType: string,
  admin: { adminUser?: unknown } | null | undefined,
): Exclude<ActivityType, 'all'> {
  if (LOGIN_ACTIONS.includes(action)) return 'login';
  if (ADMIN_MANAGEMENT_ACTIONS.includes(action)) return 'admin';
  if (ADMIN_TARGETS.includes(targetType)) return 'admin';
  if (SMTP_TARGETS.includes(targetType)) return 'smtp';
  if (EMPLOYER_TARGETS.includes(targetType)) return 'employer';
  if (actorIsAdmin(admin)) return 'admin';
  return 'user';
}
