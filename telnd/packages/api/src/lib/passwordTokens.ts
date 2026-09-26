import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@telnd/database';

export type PasswordTokenKind = 'reset' | 'invite';

// Self-service recovery links are short-lived; an admin invitation gets
// days, because it sits unsolicited in an inbox until it is noticed.
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 60 minutes
export const INVITE_TOKEN_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Absolute URL inside the admin panel (ADMIN_URL defaults to local dev). */
export function adminUrl(path: string): string {
  return `${(process.env.ADMIN_URL || 'http://localhost:3002').replace(/\/+$/, '')}${path}`;
}

/**
 * Issue a fresh single-use token and return the raw value — the ONLY copy,
 * meant to go straight into an emailed link. Only its SHA-256 hash is stored,
 * so a database leak never yields a usable link. Issuing deletes any previous
 * live token of the same kind: at most one working link per user+kind exists,
 * and re-sending always invalidates the older mail.
 */
export async function issuePasswordToken(userId: string, kind: PasswordTokenKind): Promise<string> {
  const raw = randomBytes(32).toString('base64url'); // 256 bits
  const ttl = kind === 'invite' ? INVITE_TOKEN_TTL_MS : RESET_TOKEN_TTL_MS;
  // Create FIRST, then sweep everything except the fresh row. The obvious
  // delete-then-insert order lets two concurrent issuances both delete the
  // old row and both insert — two live links, so a re-send would fail to
  // invalidate the older mail. With this order a sweep can only end holding
  // the new row, one rival's row, or nothing: at most one live link ever,
  // and the rare mutual-sweep outcome fails closed (zero links — the admin
  // simply sends again).
  const row = await prisma.passwordToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      kind,
      expiresAt: new Date(Date.now() + ttl),
    },
  });
  await prisma.passwordToken.deleteMany({ where: { userId, kind, NOT: { id: row.id } } });
  return raw;
}

/**
 * Look up a usable token: it must exist, match one of the expected kinds,
 * and be neither expired nor already consumed (consumers delete the row
 * when they spend it, so "not found" covers reuse attempts).
 */
export async function findUsablePasswordToken(raw: string, kinds: PasswordTokenKind[]) {
  if (!raw || raw.length < 20 || raw.length > 200) return null;
  const row = await prisma.passwordToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!row) return null;
  if (!kinds.includes(row.kind as PasswordTokenKind)) return null;
  if (row.usedAt || row.expiresAt < new Date()) return null;
  return row;
}

export type PasswordTokenCheck = 'valid' | 'expired' | 'invalid';

/**
 * Dry-run validation for the set-password page — reports WHY a link won't
 * work without spending it, so the page can announce "link expired" the
 * moment it opens rather than after someone has typed a password and
 * submitted. Mirrors findUsablePasswordToken's rules; "expired" is split
 * out because the row still exists and the timeout is the one dead-link
 * reason we can name precisely.
 */
export async function checkPasswordToken(raw: string, kinds: PasswordTokenKind[]): Promise<PasswordTokenCheck> {
  if (!raw || raw.length < 20 || raw.length > 200) return 'invalid';
  const row = await prisma.passwordToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!row || !kinds.includes(row.kind as PasswordTokenKind)) return 'invalid';
  if (row.usedAt) return 'invalid'; // spent — its row is normally deleted anyway
  if (row.expiresAt < new Date()) return 'expired';
  const user = await prisma.user.findUnique({ where: { id: row.userId }, select: { isActive: true } });
  if (!user || !user.isActive) return 'invalid'; // suspended accounts are refused at submit too
  return 'valid';
}

/** Roll back a token whose email never went out (email-first hygiene). */
export async function discardPasswordToken(userId: string, kind: PasswordTokenKind): Promise<void> {
  await prisma.passwordToken.deleteMany({ where: { userId, kind } });
}
