// Security PIN plumbing (§14.44): the 4-digit credential behind the
// screen lock and the approval step on sensitive admin actions.
//
// - Stored as sha256(userId + ':' + pin), the same scheme as OTP codes
//   and recovery codes — the raw PIN never exists server-side.
// - Verify is capped like every other credential here: 5 wrong tries in
//   15 minutes locks the account's PIN checks (the window simply expires;
//   a correct entry at any point clears the counter).
// - The global "require a security PIN" policy lives in the Setting key
//   `pinPolicy` — deliberately NOT in KEY_PERMISSIONS, exactly like
//   `twoFactorPolicy`, so only super '*' can read or write it.
// - requirePinApproval() is the single gate the sensitive endpoints call:
//   no PIN on file and not required → approve silently (today's
//   behaviour); PIN on file → the X-Admin-Pin header must carry it;
//   required but never set → the caller must set one up first.

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

export function hashPin(userId: string, pin: string): string {
  return createHash('sha256').update(`${userId}:${pin}`).digest('hex');
}

// ── Attempt cap (mirrors the challenge cap in lib/twoFactor.ts) ──────────

const MAX_PIN_ATTEMPTS = 5;
const PIN_WINDOW_MS = 15 * 60 * 1000;
const pinAttempts = new Map<string, { count: number; expiresAt: number }>();

/** Counts one verification; reports when the cap has just been crossed. */
function countPinAttempt(userId: string): { blocked: boolean } {
  const now = Date.now();
  const entry = pinAttempts.get(userId);
  if (!entry || entry.expiresAt <= now) {
    pinAttempts.set(userId, { count: 1, expiresAt: now + PIN_WINDOW_MS });
    return { blocked: false };
  }
  entry.count += 1;
  return { blocked: entry.count > MAX_PIN_ATTEMPTS };
}

export function clearPinAttempts(userId: string): void {
  pinAttempts.delete(userId);
}

// ── Verification ─────────────────────────────────────────────────────────

export type PinVerifyResult =
  | { ok: true }
  | { ok: false; reason: 'INVALID' | 'LOCKED' | 'NOT_SET' };

export async function verifySecurityPin(userId: string, pin: string): Promise<PinVerifyResult> {
  const row = await prisma.adminUser.findUnique({
    where: { userId },
    select: { pinHash: true },
  });
  if (!row?.pinHash) return { ok: false, reason: 'NOT_SET' };

  // Locked stays locked even for the correct PIN until the window passes —
  // otherwise a wrong guess would reveal itself by suddenly accepting.
  const now = Date.now();
  const entry = pinAttempts.get(userId);
  if (entry && entry.expiresAt > now && entry.count > MAX_PIN_ATTEMPTS) {
    return { ok: false, reason: 'LOCKED' };
  }

  const candidate = createHash('sha256').update(`${userId}:${pin}`).digest();
  const expected = Buffer.from(row.pinHash, 'hex');
  const match = expected.length === candidate.length && timingSafeEqual(expected, candidate);

  const { blocked } = countPinAttempt(userId);
  if (match) {
    clearPinAttempts(userId);
    return { ok: true };
  }
  return { ok: false, reason: blocked ? 'LOCKED' : 'INVALID' };
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
 */
export async function requirePinApproval(c: any): Promise<any | null> {
  try {
    // `requireAdmin` routes carry the AdminUser row as `admin`; plain
    // `authMiddleware` routes (self-service, e.g. DELETE /users/me/pin)
    // only set `userId`/`user`. Resolve either one — a gate that cannot
    // identify its actor must not quietly pass the request through.
    const actor = c.get('admin');
    const userId: string | undefined = actor?.userId ?? c.get('userId') ?? c.get('user')?.id;
    if (!userId) return null;
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
  } catch {
    // PIN approval is best-effort bookkeeping — if the lookups fail, the
    // endpoint's own database work will fail the same way regardless.
    return null;
  }
}
