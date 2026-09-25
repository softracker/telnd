import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { updateAccountSchema, changePasswordSchema } from '@telnd/validation';
import { sendPasswordResetEmail } from '../lib/email';
import { issuePasswordToken, discardPasswordToken, adminUrl } from '../lib/passwordTokens';
import { getIp } from '../lib/getIp';

type UsersEnv = {
  Variables: {
    user: any;
    userId: string;
    validatedData: any;
    admin: any;
    token: string;
  };
};

export const userRoutes = new Hono<UsersEnv>();

userRoutes.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      candidateProfile: true,
      companyOwner: true,
    },
  });

  if (!user) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' },
    }, 404);
  }

  const { passwordHash, ...safeUser } = user;

  return c.json({ success: true, data: safeUser });
});

// Own-account management: change name / email (password changes are
// intentionally not handled here).
userRoutes.patch('/me', authMiddleware, validate(updateAccountSchema), async (c) => {
  const userId = c.get('userId') as string;
  const body = c.get('validatedData');

  if (body.email) {
    const existing = await prisma.user.findFirst({
      where: { email: body.email, NOT: { id: userId } },
    });
    if (existing) {
      return c.json({
        success: false,
        error: { code: 'CONFLICT', message: 'An account with this email already exists' },
      }, 409);
    }
  }

  const data: Record<string, unknown> = {};
  if (body.firstName !== undefined) data.firstName = body.firstName;
  if (body.lastName !== undefined) data.lastName = body.lastName;
  if (body.email !== undefined) data.email = body.email;
  // Empty string is normalized to null so "remove photo" and "already empty"
  // end up in the same stored state.
  if (body.avatar !== undefined) data.avatar = body.avatar || null;

  const user = await prisma.user.update({ where: { id: userId }, data });
  const { passwordHash, ...safeUser } = user;

  return c.json({ success: true, data: safeUser });
});

// Audit trail for panel admins only — a candidate changing their own
// credentials is not an admin action.
async function logSelfService(c: any, user: any, action: string, details?: unknown) {
  if (user?.role !== 'ADMIN') return;
  await prisma.adminAction.create({
    data: {
      adminId: user.id,
      action,
      targetType: 'user',
      targetId: user.id,
      details: (details as any) ?? undefined,
      ipAddress: getIp(c),
      userAgent: c.req.header('user-agent') || undefined,
    },
  });
}

// ============================================
// Security (self-service): password + trusted devices
// ============================================

// Active sessions, newest first — the "trusted devices" list on the Security
// page. The caller's own row is flagged so the UI can mark "This device" and
// never offer to revoke it. Device info predating IP/user-agent capture
// comes back null and renders as "Not recorded".
userRoutes.get('/me/sessions', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const token = c.get('token') as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastLoginAt: true },
  });
  const sessions = await prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, token: true, ipAddress: true, userAgent: true, createdAt: true },
  });

  return c.json({
    success: true,
    data: {
      lastLoginAt: user?.lastLoginAt ?? null,
      sessions: sessions.map((s) => ({
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        isCurrent: s.token === token,
      })),
    },
  });
});

// Revoke one other device's session — deleting the row makes the auth
// middleware reject that device on its very next request.
userRoutes.delete('/me/sessions/:id', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const token = c.get('token') as string;
  const id = c.req.param('id');

  const session = await prisma.session.findFirst({ where: { id, userId } });
  if (!session) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } }, 404);
  }
  if (session.token === token) {
    return c.json({
      success: false,
      error: { code: 'CURRENT_SESSION', message: 'The current device cannot be signed out from this list.' },
    }, 400);
  }

  await prisma.session.delete({ where: { id } });
  await logSelfService(c, c.get('user'), 'REVOKE_SESSION');
  return c.json({ success: true, data: { revoked: 1 } });
});

// "Sign out of all other devices" — every session except the caller's own.
userRoutes.delete('/me/sessions', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const token = c.get('token') as string;

  const result = await prisma.session.deleteMany({
    where: { userId, NOT: { token } },
  });
  if (result.count > 0) {
    await logSelfService(c, c.get('user'), 'REVOKE_OTHER_SESSIONS', { revoked: result.count });
  }
  return c.json({ success: true, data: { revoked: result.count } });
});

// Change own password: the current one must be proven first; the new one is
// bcrypt-hashed server-side and never leaves the API. Rate-limited so the
// "current password" field can't be brute-forced from a stolen session.
userRoutes.post(
  '/me/change-password',
  authMiddleware,
  rateLimit({ windowMs: 60000, max: 5 }),
  validate(changePasswordSchema),
  async (c) => {
    const userId = c.get('userId') as string;
    const body = c.get('validatedData') as { currentPassword: string; newPassword: string };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
    }
    if (!user.passwordHash) {
      return c.json({
        success: false,
        error: { code: 'NO_PASSWORD', message: 'This account does not sign in with a password.' },
      }, 400);
    }

    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) {
      return c.json({
        success: false,
        error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Your current password is incorrect.' },
      }, 400);
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await logSelfService(c, user, 'CHANGE_PASSWORD');
    return c.json({ success: true, data: {} });
  },
);

// Self-service regeneration — the mirror of the super-admin's regenerate for
// others, now link-based: a single-use reset link (60-minute expiry, stored
// only as a hash) goes to this admin's OWN confirmed address instead of a
// temporary password, so no credential ever travels over email. Email-first:
// a failed send discards the fresh token and leaves the current password
// untouched. The signed-in session survives; the link is what unlocks a new
// password from any device.
userRoutes.post(
  '/me/regenerate-password',
  authMiddleware,
  requireAdmin,
  rateLimit({ windowMs: 60000, max: 5 }),
  async (c) => {
    const user = c.get('user');

    if (!user.email) {
      return c.json({
        success: false,
        error: { code: 'NO_EMAIL', message: 'This account has no email address, so a reset link cannot be delivered.' },
      }, 400);
    }

    const raw = await issuePasswordToken(user.id, 'reset');
    const emailed = await sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      resetUrl: adminUrl(`/reset-password?token=${raw}`),
      expiresLabel: '60 minutes',
    });

    if (!emailed) {
      // Email-first: a link nobody received must not stay live.
      await discardPasswordToken(user.id, 'reset');
      return c.json({
        success: false,
        error: {
          code: 'EMAIL_FAILED',
          message: 'The reset link could not be emailed, so the current password was left unchanged. Check the SMTP settings and try again.',
        },
      }, 502);
    }

    await logSelfService(c, user, 'REGENERATE_SELF_PASSWORD', { email: user.email });
    return c.json({ success: true, data: { email: user.email } });
  },
);

userRoutes.get('/me/applications', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId },
    include: {
      applications: {
        include: { job: { include: { company: true } } },
        orderBy: { appliedAt: 'desc' },
      },
    },
  });

  return c.json({
    success: true,
    data: (profile as any)?.applications || [],
  });
});
