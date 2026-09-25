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
  await prisma.passwordToken.deleteMany({ where: { userId, kind } });
  await prisma.passwordToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      kind,
      expiresAt: new Date(Date.now() + ttl),
    },
  });
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

/** Roll back a token whose email never went out (email-first hygiene). */
export async function discardPasswordToken(userId: string, kind: PasswordTokenKind): Promise<void> {
  await prisma.passwordToken.deleteMany({ where: { userId, kind } });
}
