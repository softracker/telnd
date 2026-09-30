// Requirement notices: the emails that tell an admin "2FA is now
// required" / "your security PIN is now required" (§14.40 / §14.44).
//
// Four events, three rules:
//   1. per-admin require  -> that one admin is emailed (on the transition
//      only — re-issuing an already-standing requirement says nothing new);
//   2. require-for-all    -> only the admins who are STILL non-compliant
//      are emailed (2FA: not enrolled; PIN: no PIN set) — those already
//      set up have nothing to do and are left alone;
//   3. everything goes    -> through lib/noticeQueue, so a policy flip
//      that addresses the whole admin list leaves in bounded batches
//      with pauses instead of one giant burst at the mail server.
//
// All of it is fire-and-forget: enqueue is synchronous, the recipient
// query runs detached with its own catch, and a dead mail server can
// never fail or stall the administrative action that triggered it.

import { prisma } from '@telnd/database';
import { sendRequirementNoticeEmail } from './email';
import { enqueueNotice } from './noticeQueue';

/**
 * Who acted — the account NAME for the email's "by …" line (the user
 * asked for the name, not the address; the email only appears if the
 * name fields were somehow blank). Resolved when the mail leaves,
 * best-effort: a lookup failure just degrades to "an administrator".
 */
export async function actorNameOf(actorUserId: string): Promise<string | null> {
  try {
    const actor = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { firstName: true, lastName: true, email: true },
    });
    if (!actor) return null;
    const name = `${actor.firstName} ${actor.lastName}`.trim();
    return name || actor.email || null;
  } catch {
    return null;
  }
}

/** Per-admin require: this one account (call only on the transition). */
export function notifyTwoFactorRequired(
  target: { email: string | null; enrolled: boolean },
  actorUserId: string,
): void {
  if (!target.email) return;
  const to = target.email;
  const enrolled = target.enrolled;
  enqueueNotice({
    label: `two-factor-required:${to}`,
    run: async () =>
      sendRequirementNoticeEmail({
        to,
        kind: 'two-factor',
        scope: 'account',
        adminName: await actorNameOf(actorUserId),
        alreadySet: enrolled,
      }),
  });
}

/** Per-admin require: this one account (call only on the transition). */
export function notifyPinRequired(
  target: { email: string | null; pinSet: boolean },
  actorUserId: string,
): void {
  if (!target.email) return;
  const to = target.email;
  const pinSet = target.pinSet;
  enqueueNotice({
    label: `pin-required:${to}`,
    run: async () =>
      sendRequirementNoticeEmail({
        to,
        kind: 'pin',
        scope: 'account',
        adminName: await actorNameOf(actorUserId),
        alreadySet: pinSet,
      }),
  });
}

/** "Require two-factor for all admins" — the still-disabled get mailed. */
export function notifyTwoFactorRequiredForAll(actorUserId: string): void {
  void (async () => {
    try {
      // Recipients = active admin accounts with no 2FA on file and a
      // deliverable address. The query runs AFTER the policy write, so
      // it reflects exactly the state the email announces.
      const recipients = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
          email: { not: null },
          twoFactorEnabled: false,
          adminUser: { isActive: true },
        },
        select: { email: true },
      });
      for (const row of recipients) {
        if (!row.email) continue;
        const to = row.email;
        enqueueNotice({
          label: `two-factor-policy:${to}`,
          run: async () =>
            sendRequirementNoticeEmail({
              to,
              kind: 'two-factor',
              scope: 'all',
              adminName: await actorNameOf(actorUserId),
              alreadySet: false,
            }),
        });
      }
      console.log(`[requirement-notices] two-factor required for all: ${recipients.length} notice(s) queued`);
    } catch (err) {
      console.error('[requirement-notices] two-factor recipient query failed:', err);
    }
  })();
}

/** "Require security PIN for all admins" — the PIN-less get mailed. */
export function notifyPinRequiredForAll(actorUserId: string): void {
  void (async () => {
    try {
      const recipients = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
          email: { not: null },
          adminUser: { isActive: true, pinHash: null },
        },
        select: { email: true },
      });
      for (const row of recipients) {
        if (!row.email) continue;
        const to = row.email;
        enqueueNotice({
          label: `pin-policy:${to}`,
          run: async () =>
            sendRequirementNoticeEmail({
              to,
              kind: 'pin',
              scope: 'all',
              adminName: await actorNameOf(actorUserId),
              alreadySet: false,
            }),
        });
      }
      console.log(`[requirement-notices] security PIN required for all: ${recipients.length} notice(s) queued`);
    } catch (err) {
      console.error('[requirement-notices] PIN recipient query failed:', err);
    }
  })();
}
