// §14.60 — send statistics.
//
// One row per send OUTCOME (channel × sent/failed/blocked, timestamp —
// deliberately NO destination: the analytics table is not a second log of
// who was messaged, so there is no PII to leak, mask or purge by hand).
// The rows feed Settings → Sending analytics: daily SMS/email graphs with
// sent / failed / blocked segments, plus the summary tiles.
//
// Recorded from exactly two directions, so every attempt lands ONCE:
// - otpSendBudget.consumeSendBudget — the blocked outcomes (it is the
//   single funnel every OTP and link send passes through);
// - the providers after the attempt — sendEmail() for all mail, the two
//   Alpha call sites in twoFactor.ts for SMS.
// An attempt refused before the funnel (validation, absent gateway, resend
// gap) never reaches a provider and is not a send, so it records nothing —
// matching "counters are attempt counts" in otpSendBudget.
//
// Fire-and-forget with a swallowed catch (mirrors email.ts logDelivery):
// statistics must never delay, fail or reorder the send they describe.
// Volume is bounded by the daily caps (~600 rows/day at defaults); rows
// older than PRUNE_AFTER_DAYS are dropped opportunistically (at most once
// a day) so the table stays a bounded store like every other counter here.

const PRUNE_AFTER_DAYS = 400;
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;
let lastPruneAt = 0;

export type SendStatsChannel = 'sms' | 'email';
export type SendStatsOutcome = 'sent' | 'failed' | 'blocked_destination' | 'blocked_daily';

const CHANNEL_ENUM = { sms: 'SMS', email: 'EMAIL' } as const;
const OUTCOME_ENUM = {
  sent: 'SENT',
  failed: 'FAILED',
  blocked_destination: 'BLOCKED_DESTINATION',
  blocked_daily: 'BLOCKED_DAILY',
} as const;

export function recordSendEvent(channel: SendStatsChannel, outcome: SendStatsOutcome): void {
  void writeEvent(channel, outcome);
}

async function writeEvent(channel: SendStatsChannel, outcome: SendStatsOutcome): Promise<void> {
  try {
    const { prisma } = await import('@telnd/database');
    await prisma.sendEvent.create({
      data: { channel: CHANNEL_ENUM[channel], outcome: OUTCOME_ENUM[outcome] },
    });

    const now = Date.now();
    if (now - lastPruneAt >= PRUNE_INTERVAL_MS) {
      lastPruneAt = now;
      await prisma.sendEvent.deleteMany({
        where: { createdAt: { lt: new Date(now - PRUNE_AFTER_DAYS * 24 * 60 * 60 * 1000) } },
      });
    }
  } catch {
    // Stats are best-effort — a failed insert must never surface.
  }
}
