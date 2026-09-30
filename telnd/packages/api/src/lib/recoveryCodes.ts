// Recovery codes — the industry-standard escape hatch when the enrolled
// second factor itself is lost (phone wiped, SIM swapped, mailbox locked
// out, authenticator uninstalled). Eight 10-digit codes per set:
//
// - Plaintext exists in exactly one place: the response that creates the
//   set. Storage keeps only a userId-scoped SHA-256 hash, the same scheme
//   the SMS OTP store uses, so a database leak yields nothing usable.
// - Each code is single-use (usedAt stamped with an optimistic guard so
//   two concurrent submissions can't both spend it) and never rotates
//   back — rotation deletes every old row, which is what makes
//   "generate new codes" a revocation.
// - Wrong, spent and malformed codes all return the same `false`, so the
//   challenge endpoint can answer with one indistinguishable message; the
//   per-user attempt cap upstream already bounds guessing (10 digits is
//   33 bits, far outside 5 tries per 15 minutes).

import { createHash, randomInt } from 'node:crypto';
import { prisma } from '@telnd/database';

export const RECOVERY_CODE_COUNT = 8;
const RECOVERY_CODE_DIGITS = 10;

function hashCode(userId: string, code: string): string {
  return createHash('sha256').update(`${userId}:${code}`).digest('hex');
}

/** Strip formatting a user may have pasted or typed (spaces, dashes). */
export function normalizeRecoveryCode(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Ten digits via rejection sampling (randomInt) — no modulo bias. */
function generateCode(): string {
  let out = '';
  for (let i = 0; i < RECOVERY_CODE_DIGITS; i += 1) out += String(randomInt(0, 10));
  return out;
}

/**
 * Replace the user's codes with a fresh set and return the plaintext —
 * the only moment they exist unhashed. Deleting the old rows first is
 * what revokes every previously saved code.
 */
export async function rotateRecoveryCodes(userId: string): Promise<string[]> {
  // Unique within the set: an accidental duplicate would otherwise be two
  // rows with one hash, i.e. a code that can be spent twice.
  const codes = new Set<string>();
  while (codes.size < RECOVERY_CODE_COUNT) codes.add(generateCode());
  const list = [...codes];
  await prisma.$transaction([
    prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
    prisma.twoFactorRecoveryCode.createMany({
      data: list.map((code) => ({ userId, codeHash: hashCode(userId, code) })),
    }),
  ]);
  return list;
}

/** Called wherever 2FA is turned off — stale codes must die with it. */
export async function deleteRecoveryCodes(userId: string): Promise<void> {
  try {
    await prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } });
  } catch {
    // Never fail the disable/release itself over cleanup.
  }
}

export async function unusedRecoveryCodeCount(userId: string): Promise<number> {
  try {
    return await prisma.twoFactorRecoveryCode.count({ where: { userId, usedAt: null } });
  } catch {
    return 0;
  }
}

/**
 * Spend one unused code. Unknown, already-used and malformed codes are
 * indistinguishable (`false`); the `updateMany` guard makes the consume
 * atomic so a replay in flight can't double-spend.
 */
export async function consumeRecoveryCode(userId: string, raw: string): Promise<boolean> {
  const code = normalizeRecoveryCode(raw);
  if (code.length !== RECOVERY_CODE_DIGITS) return false;
  const codeHash = hashCode(userId, code);
  try {
    const row = await prisma.twoFactorRecoveryCode.findFirst({
      where: { userId, codeHash, usedAt: null },
      select: { id: true },
    });
    if (!row) return false;
    const consumed = await prisma.twoFactorRecoveryCode.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    return consumed.count === 1;
  } catch {
    return false;
  }
}
