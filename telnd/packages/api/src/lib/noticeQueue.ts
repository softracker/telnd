// Batched notice queue for requirement emails (2FA / security PIN).
//
// "Require for all admins" is one switch that can address every admin at
// once — on a large install that is a burst of hundreds of identical
// mails in a single second, which is exactly what mail servers throttle
// (and what spam filters learn to distrust). Every requirement notice
// therefore leaves through this queue instead of being fired directly:
// jobs run one at a time, in bounded batches, with a pause between
// batches, so the same blast spreads over minutes rather than seconds.
//
// - Jobs are thunks (`run`), not pre-built messages: the appName lookup
//   and the actor lookup happen when the mail actually leaves, not when
//   the admin clicked, and a failure is reported with the job's label
//   ("two-factor-policy:a@b.c") instead of an anonymous stack.
// - Fire-and-forget by design: `enqueue` never returns a promise and the
//   pump swallows every per-job error, so a dead mail server can neither
//   fail nor stall the administrative action that queued the notice.
// - In-memory on purpose: the API is a single process and these are
//   advisory notices, so a restart mid-run drops only mail that had not
//   left yet — worth keeping simple rather than adding a durable queue.
// - Batch shape is env-tunable for the mail server at hand
//   (NOTICE_BATCH_SIZE / NOTICE_BATCH_GAP_MS); defaults are a batch of
//   10 with a 5s breather, ~120 mails/minute.

export interface NoticeJob {
  /** Shown when the job fails, e.g. "pin-policy:someone@x.y". */
  label: string;
  run: () => Promise<unknown>;
}

export interface NoticeQueueOptions {
  /** Jobs per batch. Minimum 1. */
  batchSize?: number;
  /** Pause between batches — only taken while more work is queued. */
  batchGapMs?: number;
}

const DEFAULT_BATCH_SIZE = (() => {
  const n = Number(process.env.NOTICE_BATCH_SIZE);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 10;
})();
const DEFAULT_BATCH_GAP_MS = (() => {
  const n = Number(process.env.NOTICE_BATCH_GAP_MS);
  return Number.isFinite(n) && n >= 0 ? n : 5000;
})();

export function createNoticeQueue(options: NoticeQueueOptions = {}) {
  const batchSize = Math.max(1, Math.floor(options.batchSize ?? DEFAULT_BATCH_SIZE));
  const batchGapMs = Math.max(0, options.batchGapMs ?? DEFAULT_BATCH_GAP_MS);
  const queue: NoticeJob[] = [];
  let pumping = false;

  async function pump(): Promise<void> {
    if (pumping) return;
    pumping = true;
    try {
      // One microtask before the first cut, so a synchronous burst of
      // enqueues (the for-loop in notify*RequiredForAll) fills the first
      // batch to batchSize instead of the pump slicing a batch of one
      // off the very first job. A trickle is unaffected: an idle queue
      // still starts the moment its job lands.
      await Promise.resolve();
      while (queue.length > 0) {
        const batch = queue.splice(0, batchSize);
        // Sequentially within a batch: one SMTP round-trip at a time.
        for (const job of batch) {
          try {
            await job.run();
          } catch (err) {
            console.error(`[notice-queue] "${job.label}" failed:`, err);
          }
        }
        // Rest only while there is more to do — a lone notice (the
        // per-admin case) is never held back by a batch timer.
        if (queue.length > 0 && batchGapMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, batchGapMs));
        }
      }
    } finally {
      pumping = false;
    }
  }

  return {
    enqueue(job: NoticeJob | NoticeJob[]): void {
      if (Array.isArray(job)) queue.push(...job);
      else queue.push(job);
      void pump();
    },
    /** Jobs waiting (not yet in a running batch). */
    get pending(): number {
      return queue.length;
    },
    /** Batch shape, for tests and diagnostics. */
    batchSize,
    batchGapMs,
  };
}

export type NoticeQueue = ReturnType<typeof createNoticeQueue>;

/** The API process's queue. */
export const noticeQueue = createNoticeQueue();

/** Enqueue one requirement notice. Never throws, never blocks. */
export function enqueueNotice(job: NoticeJob): void {
  noticeQueue.enqueue(job);
}
