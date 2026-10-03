// ── User activity (§14.68) ────────────────────────────────────────────────
// The /activity-logs feed's one flat log is the AdminAction table, and
// its `user` section is the partition for rows whose ACTOR holds no
// AdminUser row — activityFeed.ts reserved that section for the :3000
// web app and it had been empty until now. Every completed portal change
// writes exactly one row through this helper: profile edits, photo set
// or removed, added/changed email and phone, first password and password
// reset, preference flips, connected and disconnected providers, trusted
// devices minted — on top of the rows their own sites already write
// (LOGIN per sign-in, password/2FA changes and session revokes through
// logSelfService).
//
// Fire-and-forget like every other log write in the API — a failed
// insert must never fail the request that caused it. targetType is
// always 'user' (a member's own account), which keeps every row inside
// the feed's disjoint partition: a portal actor lands in `user`, an
// admin using My Account lands in `admin` — never login/employer/smtp,
// so count(all) stays the sum of the five sections.
import { prisma } from '@telnd/database';
import { getIp } from './getIp';

export interface UserActivityEntry {
  /** The account the activity belongs to — also the row's actor. */
  userId: string;
  /** SCREAMING_SNAKE, humanized by the activity card (no label table). */
  action: string;
  /** Only keys the activity card displays/searches ride along (see DETAIL_ORDER). */
  details?: Record<string, unknown>;
}

export function logUserActivity(c: any, entry: UserActivityEntry): void {
  if (!entry.userId) return;
  const ip = getIp(c);
  void prisma.adminAction
    .create({
      data: {
        adminId: entry.userId,
        action: entry.action,
        targetType: 'user',
        targetId: entry.userId,
        details: (entry.details as any) ?? undefined,
        ipAddress: ip === 'unknown' ? undefined : ip,
        userAgent: c.req.header('user-agent') || undefined,
      },
    })
    .catch(() => {
      // Deliberately swallowed — a log write must never fail the request.
    });
}
