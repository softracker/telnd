// Security PIN plumbing (§14.44): the 4-digit credential behind the
// screen lock and the approval step on sensitive admin actions.
//
// - Stored as bcrypt (cost 12). Legacy sha256(userId + ':' + pin) hashes
//   verify through a compatibility path and are upgraded to bcrypt in
//   place on first successful use — a leaked DB dump can no longer
//   brute-force the 4-digit space instantly (#26).
// - The attempt cap (5 wrong tries in 15 minutes) is durable: counted on
//   AdminUser.pinAttempts / pinWindowStart, so a restart doesn't clear it
//   and concurrent instances share one window (#26).
// - The global "require a security PIN" policy lives in the Setting key
//   `pinPolicy` — deliberately NOT in KEY_PERMISSIONS, exactly like
//   `twoFactorPolicy`, so only super '*' can read or write it.
// - requirePinApproval() is the single gate the sensitive endpoints call:
//   no PIN on file and not required → approve silently (today's
//   behaviour); PIN on file → the X-Admin-Pin header must carry it;
//   required but never set → the caller must set one up first. Every
//   failure mode fails CLOSED (#8): an unknown actor or a broken lookup
//   denies the request instead of approving it.

import { createHash, timingSafeEqual } from 'node:crypto';
import { prisma } from '@telnd/database';

// ── Policy ───────────────────────────────────────────────────────────────

export async function pinPolicyRequired(): Promise<boolean> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'pinPolicy' } });
    return ((row?.value as { requirePin?: unknown } | null)?.requirePin) === true;
  } catch {
    return false;
  }
}

// ── Hashing / normalization ──────────────────────────────────────────────

export function normalizePin(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}$/.test(value) ? value : null;
}

const BCRYPT_PIN_COST = 12;
const BCRYPT_HASH_RE = /^\$2[aby]\$/;

/** New PINs are bcrypt-hashed — see the #26 note at the top of the file. */
export async function hashPin(pin: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(pin, BCRYPT_PIN_COST);
}

/**
 * Compare against the stored hash, whatever generation it is. A legacy
 * sha256 match immediately re-hashes the PIN with bcrypt so every account
 * migrates itself on its next successful approval.
 */
async function comparePin(userId: string, pin: string, stored: string): Promise<boolean> {
  if (BCRYPT_HASH_RE.test(stored)) {
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(pin, stored);
  }
  const candidate = createHash('sha256').update(`${userId}:${pin}`).digest();
  const expected = Buffer.from(stored, 'hex');
  const match = expected.length === candidate.length && timingSafeEqual(expected, candidate);
  if (match) {
    try {
      const upgraded = await hashPin(pin);
      await prisma.adminUser.update({ where: { userId }, data: { pinHash: upgraded } });
    } catch {
      // The upgrade is opportunistic — the verified match still stands.
    }
  }
  return match;
}

// ── Attempt cap (durable; mirrors the challenge cap in lib/twoFactor.ts) ─

const MAX_PIN_ATTEMPTS = 5;
const PIN_WINDOW_MS = 15 * 60 * 1000;

export async function clearPinAttempts(userId: string): Promise<void> {
  await prisma.adminUser
    .updateMany({ where: { userId }, data: { pinAttempts: 0, pinWindowStart: null } })
    .catch(() => {});
}

// ── Verification ─────────────────────────────────────────────────────────

export type PinVerifyResult =
  | { ok: true }
  | { ok: false; reason: 'INVALID' | 'LOCKED' | 'NOT_SET' };

export async function verifySecurityPin(userId: string, pin: string): Promise<PinVerifyResult> {
  const row = await prisma.adminUser.findUnique({
    where: { userId },
    select: { pinHash: true, pinAttempts: true, pinWindowStart: true },
  });
  if (!row?.pinHash) return { ok: false, reason: 'NOT_SET' };

  const now = Date.now();
  const windowActive =
    row.pinWindowStart !== null && now - row.pinWindowStart.getTime() <= PIN_WINDOW_MS;

  // Locked stays locked even for the correct PIN until the window passes —
  // otherwise a wrong guess would reveal itself by suddenly accepting.
  if (windowActive && row.pinAttempts > MAX_PIN_ATTEMPTS) {
    return { ok: false, reason: 'LOCKED' };
  }

  const match = await comparePin(userId, pin, row.pinHash);
  if (match) {
    await clearPinAttempts(userId);
    return { ok: true };
  }

  // Count the failure durably — same shape as the old in-memory Map (a
  // fresh 15-minute window per first failure, LOCKED once past 5), but a
  // restart no longer resets it (#26).
  const freshWindow = !windowActive;
  const attempts = freshWindow ? 1 : row.pinAttempts + 1;
  await prisma.adminUser
    .update({
      where: { userId },
      data: { pinAttempts: attempts, pinWindowStart: freshWindow ? new Date() : row.pinWindowStart },
    })
    .catch(() => {});
  return { ok: false, reason: attempts > MAX_PIN_ATTEMPTS ? 'LOCKED' : 'INVALID' };
}

// ── The gate for sensitive endpoints ─────────────────────────────────────

/**
 * Approve the current request's sensitive action with the actor's PIN.
 * Returns a ready-to-send error response when approval fails, or null
 * when the action may proceed. Must be called BEFORE any side effect:
 * a rejected request must look exactly like it never ran.
 *
 * Reads the X-Admin-Pin header the client attaches after its PIN modal
 * verifies the entered digits. An actor without a PIN (and not required
 * to have one) passes untouched — the feature is opt-in until a super
 * admin makes it required.
 *
 * Fails CLOSED in every unknown state (#8): an actor that cannot be
 * identified, or a verification that throws, returns a denial — never an
 * approval. The old code returned null (approve) in both cases, silently
 * disabling the gate exactly when it mattered.
 */
export async function requirePinApproval(c: any): Promise<any | null> {
  try {
    // `requireAdmin` routes carry the AdminUser row as `admin`; plain
    // `authMiddleware` routes (self-service, e.g. DELETE /users/me/pin)
    // only set `userId`/`user`. Resolve either one.
    const actor = c.get('admin');
    const userId: string | undefined = actor?.userId ?? c.get('userId') ?? c.get('user')?.id;
    if (!userId) {
      return c.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot verify who is approving this action.' },
      }, 403);
    }
    const row = await prisma.adminUser.findUnique({
      where: { userId },
      select: { pinHash: true, pinRequired: true },
    });
    const required = Boolean(row?.pinRequired) || (await pinPolicyRequired());

    if (!row?.pinHash) {
      if (!required) return null;
      return c.json({
        success: false,
        error: {
          code: 'PIN_REQUIRED',
          message: 'Set up your security PIN to approve this action.',
        },
      }, 403);
    }

    const pin = normalizePin(c.req.header('x-admin-pin'));
    if (!pin) {
      return c.json({
        success: false,
        error: {
          code: 'PIN_REQUIRED',
          message: 'Enter your security PIN to approve this action.',
        },
      }, 403);
    }

    const result = await verifySecurityPin(userId, pin);
    if (result.ok) return null;
    if (result.reason === 'LOCKED') {
      return c.json({
        success: false,
        error: {
          code: 'PIN_LOCKED',
          message: 'Too many wrong PIN attempts. Try again in 15 minutes.',
        },
      }, 429);
    }
    return c.json({
      success: false,
      error: { code: 'PIN_INVALID', message: 'Your security PIN is incorrect.' },
    }, 403);
  } catch (err) {
    // Fail CLOSED (#8): if the approval lookup itself is broken, the
    // action must not run. (An endpoint whose own database work is down
    // would fail anyway — but "would probably fail later" is not an
    // approval.)
    console.error('[securityPin] requirePinApproval error:', err);
    return c.json({
      success: false,
      error: {
        code: 'PIN_CHECK_FAILED',
        message: 'Security approval could not be verified. Please try again.',
      },
    }, 500);
  }
}
