import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '@telnd/database';
import { authMiddleware, roleGuard, requireAdmin, requirePermission, requireAnyPermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { featureFlagSchema, maintenanceModeSchema, reportSchema, adminRoleSchema, suspendUserSchema, createAdminSchema, updateAdminSchema } from '@telnd/validation';
import { sendAdminInviteEmail, sendTwoFactorNoticeEmail } from '../lib/email';
import { issuePasswordToken, discardPasswordToken, adminUrl } from '../lib/passwordTokens';
import { deleteRecoveryCodes } from '../lib/recoveryCodes';
import { clearOtp } from '../lib/twoFactor';
import { clearPinAttempts, requirePinApproval } from '../lib/securityPin';
import { notifyTwoFactorRequired, notifyTwoFactorRequiredForAll, notifyPinRequired, notifyPinRequiredForAll, actorNameOf } from '../lib/requirementNotices';
import { ACTIVITY_TYPES, activityCategory, activityWhere, isActivityType } from '../lib/activityFeed';
import { getIp } from '../lib/getIp';

type AdminEnv = {
  Variables: {
    user: any;
    userId: string;
    admin: any;
    validatedData: any;
  };
};

const admin = new Hono<AdminEnv>();

// All admin routes require auth + admin role + an AdminUser row with the
// matching permission (see requirePermission in middleware/auth).
admin.use('*', authMiddleware, roleGuard('ADMIN'));

function clampLimit(value: string | undefined, max = 100): number {
  const parsed = parseInt(value || '20');
  if (isNaN(parsed) || parsed < 1) return 20;
  return Math.min(parsed, max);
}

function clampPage(value: string | undefined): number {
  const parsed = parseInt(value || '1');
  if (isNaN(parsed) || parsed < 1) return 1;
  return parsed;
}

// Super admin = the "*" wildcard in a role's permission list. A super admin
// is invisible to anyone who isn't one: the Admins list filters them out,
// and the direct-ID routes below answer 404 as if the account didn't exist
// — only a super admin may see, edit, suspend or delete one.
const isSuper = (permissions: unknown): boolean =>
  Array.isArray(permissions) && permissions.includes('*');

// Escalation guard for role grants and role assignments (#4, #5): holding
// roles.create/roles.edit or admins.create says you may operate on the
// entity, not that you may hand out power you don't have. Two rules: the
// "*" wildcard (super) only ever moves between super admins, and a
// non-super actor may only grant permissions their own role already holds —
// otherwise a limited admin could mint (or assign) a stronger role and
// walk out of their own permission set. Returns the denial message when the
// grant is NOT allowed, null when it is; super passes everything.
const grantDenied = (actorPermissions: unknown, granted: unknown): string | null => {
  const actorPerms: unknown[] = Array.isArray(actorPermissions) ? actorPermissions : [];
  if (isSuper(actorPerms)) return null;
  const grantedPerms: unknown[] = Array.isArray(granted) ? granted : [];
  if (grantedPerms.includes('*')) {
    return 'Only a super admin can grant or assign the "*" (super admin) permission.';
  }
  const missing = grantedPerms.filter((p) => !actorPerms.includes(p));
  return missing.length > 0 ? `You cannot grant permissions you do not hold: ${missing.join(', ')}` : null;
};

// Log admin action
const logAction = async (adminId: string, action: string, targetType: string, targetId?: string, details?: any, c?: any) => {
  await prisma.adminAction.create({
    data: {
      adminId,
      action,
      targetType,
      targetId,
      details,
      // Same trust model as rate limiting (#28): the client-written
      // forwarding headers are not evidence of anything — record the
      // peer address (or the stamped one when TRUST_PROXY is set).
      ipAddress: c && getIp(c) !== 'unknown' ? getIp(c) : undefined,
      userAgent: c?.req.header('user-agent'),
    },
  });
};

// Which account a row's target was. The activity log must answer "which
// admin, which account" from the details alone — even for DELETE_ADMIN,
// where the account row is gone by the time anyone reads the log. Email
// plus display name; a nameless account falls back to its address.
const targetIdentity = (
  u: { email?: string | null; firstName?: string | null; lastName?: string | null } | null | undefined,
) => {
  if (!u?.email) return {};
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return { email: u.email, name: name || u.email };
};

// ============================================
// Dashboard
// ============================================
admin.get('/dashboard', requireAdmin, requirePermission('dashboard.view'), async (c) => {
  const [totalUsers, activeUsers, newUsersToday, totalJobs, activeJobs, totalCompanies, totalMerchants, pendingReports, openTickets] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastActiveAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.job.count(),
    prisma.job.count({ where: { status: 'PUBLISHED' } }),
    prisma.company.count(),
    prisma.merchant.count(),
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
  ]);

  return c.json({
    totalUsers,
    activeUsers,
    newUsersToday,
    totalJobs,
    activeJobs,
    totalCompanies,
    totalMerchants,
    pendingReports,
    openTickets,
  });
});

// ============================================
// Users Management
// ============================================
admin.get('/users', requireAdmin, requirePermission('users.view'), async (c) => {
  const page = clampPage(c.req.query('page'));
  const limit = clampLimit(c.req.query('limit'));
  const search = c.req.query('search');
  const role = c.req.query('role');

  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (role) {
    where.capabilities = { some: { type: role } };
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { capabilities: true },
    }),
    prisma.user.count({ where }),
  ]);

  // Credential material never leaves the API — the password hash never did
  // (it was leaked by accident), and the TOTP secret must not either.
  const safeUsers = users.map(({ passwordHash, twoFactorSecret, ...u }) => u);
  return c.json({ users: safeUsers, total, page, limit, totalPages: Math.ceil(total / limit) });
});

admin.get('/users/:id', requireAdmin, requirePermission('users.view'), async (c) => {
  const id = c.req.param('id');
  const user = await prisma.user.findUnique({
    where: { id },
    include: { capabilities: true },
  });
  if (!user) return c.json({ error: 'User not found' }, 404);
  const { passwordHash, twoFactorSecret, ...safeUser } = user;
  return c.json(safeUser);
});

admin.patch('/users/:id/suspend', requireAdmin, requireAnyPermission('users.edit', 'admins.edit'), validate(suspendUserSchema), rateLimit({ windowMs: 60000, max: 30 }), async (c) => {
  // Suspension revokes a live account — a sensitive action like delete,
  // so it carries the same PIN approval (#9).
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const id = c.req.param('id');
  const body = c.get('validatedData');
  const reason = body.reason;
  const adminUser = c.get('admin');

  const user = await prisma.user.findUnique({
    where: { id },
    include: { adminUser: { include: { role: true } } },
  });
  if (!user) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }
  // A super admin doesn't exist for a non-super caller — not in the lists,
  // and a direct suspend gets the same 404.
  if (isSuper(user.adminUser?.role?.permissions) && !isSuper(adminUser?.role?.permissions)) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  // Revoke all active sessions for the suspended user
  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.refreshToken.deleteMany({ where: { userId: id } });

  await logAction(adminUser.userId, 'SUSPEND_USER', 'user', id, { reason, ...targetIdentity(user) }, c);
  // Never echo the full row: it carries passwordHash + twoFactorSecret (#3).
  const { passwordHash, twoFactorSecret, ...safeUser } = updated;
  return c.json(safeUser);
});

admin.patch('/users/:id/activate', requireAdmin, requireAnyPermission('users.edit', 'admins.edit'), rateLimit({ windowMs: 60000, max: 30 }), async (c) => {
  // Restoring access is the mirror sensitive action (#9).
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const id = c.req.param('id');
  const adminUser = c.get('admin');

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { adminUser: { include: { role: true } } },
  });
  if (!existing) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }
  // Same invisibility rule as suspend: a super admin is not reachable by a
  // non-super caller.
  if (isSuper(existing.adminUser?.role?.permissions) && !isSuper(adminUser?.role?.permissions)) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: true },
  });

  await logAction(adminUser.userId, 'ACTIVATE_USER', 'user', id, { ...targetIdentity(user) }, c);
  // Never echo the full row: it carries passwordHash + twoFactorSecret (#3).
  const { passwordHash, twoFactorSecret, ...safeUser } = user;
  return c.json(safeUser);
});

// ============================================
// Admin Accounts (the people who can log into this panel)
// ============================================
admin.get('/admins', requireAdmin, requirePermission('admins.view'), async (c) => {
  const search = String(c.req.query('search') ?? '').trim().toLowerCase();
  const roleFilter = String(c.req.query('role') ?? '').trim();
  // With any query param it switches to DataTables-style paging (server-side
  // search + role filter + slice); bare GET keeps the legacy full-list shape.
  const wantsPaging =
    search.length > 0 ||
    roleFilter.length > 0 ||
    c.req.query('page') !== undefined ||
    c.req.query('pageSize') !== undefined;

  // Your own account lives in the My Account card above this list — the
  // Admins list deliberately never includes the viewer themselves, so the
  // same row isn't shown twice. (Self password reset moves to a future
  // Security tab; other admins' regenerate action is unaffected.)
  const selfId = c.get('user')?.id;
  const actorIsSuper = isSuper(c.get('admin')?.role?.permissions);

  const users = await prisma.user.findMany({
    where: { role: 'ADMIN', ...(selfId ? { NOT: { id: selfId } } : {}) },
    orderBy: { createdAt: 'desc' },
    include: { adminUser: { include: { role: true } } },
  });

  const all = users
    .map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      avatar: u.avatar,
      isActive: u.isActive,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      roleId: u.adminUser?.roleId ?? null,
      roleName: u.adminUser?.role?.name ?? null,
      permissions: (u.adminUser?.role?.permissions as unknown as string[] | null) ?? [],
      isSelf: u.id === selfId,
      // 2FA state for the Admins list: "required" means a super admin
      // demands setup at next sign-in; "enabled" means it's actually on.
      twoFactorEnabled: u.twoFactorEnabled,
      twoFactorMethod: u.twoFactorMethod,
      twoFactorRequired: u.twoFactorEnforced,
      // Security PIN state for the row controls: whether one is on file
      // (never the hash) and whether a super admin demands one.
      securityPinSet: Boolean(u.adminUser?.pinHash),
      securityPinRequired: u.adminUser?.pinRequired ?? false,
    }))
    // Super admins appear only for a super admin. Filtering before paging
    // keeps totals honest for everyone else.
    .filter((u) => actorIsSuper || !u.permissions.includes('*'));

  if (!wantsPaging) {
    return c.json({ admins: all, total: all.length });
  }

  let filtered = roleFilter ? all.filter((u) => u.roleId === roleFilter) : all;
  if (search) {
    filtered = filtered.filter((u) =>
      [
        `${u.firstName} ${u.lastName}`.trim(),
        u.email ?? '',
        u.roleName ?? '',
        u.isActive ? 'active' : 'suspended',
      ].some((v) => v.toLowerCase().includes(search)),
    );
  }

  const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('pageSize') ?? '5', 10) || 5));
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Clamp so an out-of-range page (e.g. after a delete) returns the last page.
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return c.json({
    items: filtered.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    totalPages,
    filteredTotal: filtered.length,
    total: all.length,
  });
});

admin.post('/admins', requireAdmin, requirePermission('admins.create'), validate(createAdminSchema), rateLimit({ windowMs: 60000, max: 10 }), async (c) => {
  // Sensitive: creating an admin grants panel access — approve with PIN.
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const body = c.get('validatedData');
  const adminUser = c.get('admin');

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return c.json({ success: false, error: { code: 'CONFLICT', message: 'An account with this email already exists' } }, 409);
  }
  const role = await prisma.adminRole.findUnique({ where: { id: body.roleId } });
  if (!role) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Role not found' } }, 404);
  }
  // Assigning a role hands over everything it holds, so the target role's
  // permissions must pass the same escalation guard as a grant (#5): the
  // "*" role only goes to a super admin, and a non-super creator can only
  // assign roles made of permissions they already hold themselves.
  const deniedGrant = grantDenied(adminUser?.role?.permissions, role.permissions);
  if (deniedGrant) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: deniedGrant } }, 403);
  }

  // Nobody types a password: the account is created WITHOUT one and a
  // single-use invite link (72-hour expiry, stored only as a hash) is
  // emailed to the confirmed address — the new admin chooses their own
  // password through it, so no credential ever appears in email. Login is
  // impossible until the link is used (a null hash is rejected at login).
  const user = await prisma.user.create({
    data: {
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      role: 'ADMIN',
      isEmailVerified: true,
      adminUser: { create: { roleId: body.roleId } },
    },
    include: { adminUser: { include: { role: true } } },
  });

  const inviteToken = await issuePasswordToken(user.id, 'invite');
  const loginUrl = adminUrl('/login');
  const emailed = await sendAdminInviteEmail({
    to: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    setPasswordUrl: adminUrl(`/reset-password?token=${inviteToken}`),
    loginUrl,
    roleName: role.name,
    expiresLabel: '72 hours',
  });

  if (!emailed) {
    // Roll back: an admin nobody can log in as is worse than no admin at
    // all. The unused invite token cascades away with the user row.
    try {
      await prisma.$transaction([
        prisma.adminUser.deleteMany({ where: { userId: user.id } }),
        prisma.user.delete({ where: { id: user.id } }),
      ]);
    } catch (rollbackErr) {
      console.error('Rollback after failed invite email failed:', rollbackErr);
    }
    return c.json({
      success: false,
      error: {
        code: 'EMAIL_FAILED',
        message: 'The invitation email could not be sent, so the admin was not created. Check the SMTP settings and try again.',
      },
    }, 502);
  }

  await logAction(adminUser.userId, 'CREATE_ADMIN', 'user', user.id, { roleId: body.roleId, ...targetIdentity(user) }, c);
  return c.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    roleId: user.adminUser?.roleId ?? null,
    roleName: user.adminUser?.role?.name ?? null,
    permissions: user.adminUser?.role?.permissions ?? [],
  }, 201);
});

admin.patch('/admins/:id', requireAdmin, requirePermission('admins.edit'), validate(updateAdminSchema), rateLimit({ windowMs: 60000, max: 30 }), async (c) => {
  // Editing an admin — including a role change — is escalation-adjacent:
  // approve with PIN like the delete beside it (#9).
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const id = c.req.param('id');
  const body = c.get('validatedData');
  const adminUser = c.get('admin');
  const selfId = c.get('user')?.id;

  if (id === selfId && body.roleId) {
    return c.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'You cannot change your own role' } }, 400);
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { adminUser: { include: { role: true } } },
  });
  if (!user || user.role !== 'ADMIN') {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }
  // Super admins are absent from a non-super viewer's list — a direct call
  // must look the same, and only a super admin may edit one.
  if (isSuper(user.adminUser?.role?.permissions) && !isSuper(adminUser?.role?.permissions)) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }

  if (body.email && body.email !== user.email) {
    const duplicate = await prisma.user.findUnique({ where: { email: body.email } });
    if (duplicate) {
      return c.json({ success: false, error: { code: 'CONFLICT', message: 'An account with this email already exists' } }, 409);
    }
  }
  if (body.roleId) {
    const role = await prisma.adminRole.findUnique({ where: { id: body.roleId } });
    if (!role) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Role not found' } }, 404);
    }
    // Reassigning a role hands over everything it holds — same escalation
    // guard as create (#5): the "*" role only goes to a super admin, and a
    // non-super actor can only assign roles made of permissions they hold
    // themselves. (Changing your own role is already blocked above.)
    const deniedGrant = grantDenied(adminUser?.role?.permissions, role.permissions);
    if (deniedGrant) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: deniedGrant } }, 403);
    }
  }

  const data: Record<string, unknown> = {};
  if (body.email !== undefined) data.email = body.email;
  if (body.firstName !== undefined) data.firstName = body.firstName;
  if (body.lastName !== undefined) data.lastName = body.lastName;
  if (body.roleId !== undefined) {
    data.adminUser = {
      upsert: {
        where: { userId: id },
        update: { roleId: body.roleId },
        create: { roleId: body.roleId },
      },
    };
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    include: { adminUser: { include: { role: true } } },
  });

  await logAction(adminUser.userId, 'UPDATE_ADMIN', 'user', id, { ...body, ...targetIdentity(updated) }, c);
  return c.json({
    id: updated.id,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    isActive: updated.isActive,
    roleId: updated.adminUser?.roleId ?? null,
    roleName: updated.adminUser?.role?.name ?? null,
    permissions: updated.adminUser?.role?.permissions ?? [],
  });
});

admin.delete('/admins/:id', requireAdmin, requirePermission('admins.delete'), async (c) => {
  // Sensitive: removing an admin revokes their access — approve with PIN.
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const id = c.req.param('id');
  const adminUser = c.get('admin');
  const selfId = c.get('user')?.id;

  if (id === selfId) {
    return c.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'You cannot delete your own account' } }, 400);
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { adminUser: { include: { role: true } } },
  });
  if (!user || user.role !== 'ADMIN') {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }
  // Only a super admin can delete a super admin — everyone else gets the
  // same 404 their list implies, permission to delete or not.
  if (isSuper(user.adminUser?.role?.permissions) && !isSuper(adminUser?.role?.permissions)) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }

  // Revoke panel access and sessions first, then remove the account.
  await prisma.adminUser.deleteMany({ where: { userId: id } });
  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.refreshToken.deleteMany({ where: { userId: id } });

  try {
    await prisma.user.delete({ where: { id } });
  } catch (err: any) {
    if (err?.code === 'P2003') {
      return c.json({
        success: false,
        error: { code: 'IN_USE', message: 'This account has linked records and cannot be deleted. Suspend it instead.' },
      }, 409);
    }
    throw err;
  }

  await logAction(adminUser.userId, 'DELETE_ADMIN', 'user', id, { ...targetIdentity(user) }, c);
  return c.json({ success: true });
});

// Regenerate an admin's password: issues a fresh single-use reset link and
// emails it to that admin's address (the UI has no password field — this
// email is the only way a new credential ever reaches an account). Super
// admin only, since it starts sign-in recovery for any account. The link is
// emailed first; a failed send discards it, so a failed request leaves the
// current password untouched. Nothing changes until the link is used.
admin.post('/admins/:id/regenerate-password', requireAdmin, rateLimit({ windowMs: 60000, max: 10 }), async (c) => {
  const id = c.req.param('id');
  const actor = c.get('admin');
  const actorPerms: unknown[] = Array.isArray(actor?.role?.permissions) ? actor.role.permissions : [];
  if (!actorPerms.includes('*')) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super admin access is required to regenerate passwords.' },
    }, 403);
  }

  // Starting sign-in recovery for another account is sensitive — approve
  // with PIN (#9). After the super check on purpose: a non-super caller
  // gets its403 without a pointless PIN prompt.
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { adminUser: { include: { role: true } } },
  });
  if (!user || user.role !== 'ADMIN' || !user.adminUser) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }
  if (!user.email) {
    return c.json({
      success: false,
      error: { code: 'NO_EMAIL', message: 'This admin has no email address, so a reset link cannot be delivered.' },
    }, 400);
  }

  const resetToken = await issuePasswordToken(user.id, 'reset');
  const loginUrl = adminUrl('/login');
  const emailed = await sendAdminInviteEmail({
    to: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    setPasswordUrl: adminUrl(`/reset-password?token=${resetToken}`),
    loginUrl,
    roleName: user.adminUser.role?.name ?? '',
    kind: 'reset',
    expiresLabel: '60 minutes',
  });

  if (!emailed) {
    // Email-first: a link nobody received must not stay live — and the
    // current password was never touched either way.
    await discardPasswordToken(user.id, 'reset');
    return c.json({
      success: false,
      error: {
        code: 'EMAIL_FAILED',
        message: 'The reset link could not be emailed, so the current password was left unchanged. Check the SMTP settings and try again.',
      },
    }, 502);
  }

  await logAction(actor.userId, 'REGENERATE_ADMIN_PASSWORD', 'user', user.id, { ...targetIdentity(user) }, c);
  return c.json({ success: true, data: { email: user.email } });
});

// ============================================
// Two-factor administration (super admin only)
// ============================================

// Require (or release) 2FA for one admin from the Admins list. Requiring
// doesn't provision anything for them — an unenrolled account blocks on the
// setup screen at its next sign-in; an enrolled one starts challenging
// immediately and can no longer be self-disabled. Releasing wipes the
// enrollment entirely (fresh secret when it's turned back on).
admin.patch('/admins/:id/two-factor', requireAdmin, validate(z.object({ required: z.boolean() })), rateLimit({ windowMs: 60000, max: 10 }), async (c) => {
  const actor = c.get('admin');
  if (!isSuper(actor?.role?.permissions)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super admin access is required to manage two-factor authentication.' },
    }, 403);
  }

  const id = c.req.param('id');
  const { required } = c.get('validatedData') as { required: boolean };

  // Sensitive only in the release direction: turning 2FA OFF removes
  // protection (requiring it adds protection and needs no approval).
  if (!required) {
    const pinGate = await requirePinApproval(c);
    if (pinGate) return pinGate;
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { adminUser: { include: { role: true } } },
  });
  if (!user || user.role !== 'ADMIN' || !user.adminUser) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }

  // The wipe below only means something when the account was actually
  // enrolled — remember that before the update for the notice.
  const wasEnrolled = user.twoFactorEnabled;
  const data = required
    ? { twoFactorEnforced: true }
    : { twoFactorEnforced: false, twoFactorEnabled: false, twoFactorMethod: null, twoFactorSecret: null };
  const updated = await prisma.user.update({ where: { id }, data });
  // A code sent for the released enrollment must not linger either.
  clearOtp(user.id);

  if (required && !user.twoFactorEnabled) {
    // The requirement went up for an account that has not enrolled: its
    // already-issued session would keep running for up to 7 days with no
    // challenge at all (#17). Revoke sessions + refresh lineage so the
    // next sign-in walks straight into the enrollment gate.
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  }

  if (!required) {
    // Recovery codes are part of the factor they belong to — they die with it.
    await deleteRecoveryCodes(user.id);
    const targetEmail = user.email;
    if (wasEnrolled && targetEmail) {
      // The owner did not turn this off themselves: tell them, so a
      // covert removal cannot go unnoticed. Resolve who acted — by
      // account NAME, matching the requirement notices — fire-and-forget
      // so a slow or dead mail server never stalls or fails the
      // administrative action.
      void actorNameOf(actor.userId)
        .then((actorName) => sendTwoFactorNoticeEmail(targetEmail, actorName))
        .catch(() => {
          // Deliberately swallowed — see above.
        });
    }
  } else if (!user.twoFactorEnforced && user.email) {
    // The requirement went UP for this account: tell the holder (on the
    // transition only). Queued through the batched notice queue — never
    // inline — so it cannot stall or fail the update above.
    notifyTwoFactorRequired({ email: user.email, enrolled: user.twoFactorEnabled }, actor.userId);
  }

  await logAction(actor.userId, required ? 'REQUIRE_TWO_FACTOR' : 'DISABLE_TWO_FACTOR', 'user', id, { ...targetIdentity(user) }, c);
  return c.json({
    success: true,
    data: {
      twoFactorEnabled: updated.twoFactorEnabled,
      twoFactorMethod: updated.twoFactorMethod,
      twoFactorRequired: updated.twoFactorEnforced,
    },
  });
});

// "Require two-factor for all admins" — the switch on the Security page.
// Stored under a Setting key that is deliberately NOT in KEY_PERMISSIONS,
// so the generic settings PUT can never flip it: unknown keys resolve to
// the "*" (super) permission on both read and write.
admin.post('/two-factor-policy', requireAdmin, validate(z.object({ required: z.boolean() })), rateLimit({ windowMs: 60000, max: 10 }), async (c) => {
  const actor = c.get('admin');
  if (!isSuper(actor?.role?.permissions)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super admin access is required to change the two-factor policy.' },
    }, 403);
  }

  const { required } = c.get('validatedData') as { required: boolean };

  // Sensitive only when the policy is being dropped — requiring 2FA for
  // everyone adds protection and needs no approval.
  if (!required) {
    const pinGate = await requirePinApproval(c);
    if (pinGate) return pinGate;
  }

  // Only the OFF->ON transition notifies: re-issuing a policy that is
  // already standing would re-spam every non-compliant admin.
  const previousPolicy = await prisma.setting.findUnique({ where: { key: 'twoFactorPolicy' } });
  const wasRequired = Boolean((previousPolicy?.value as any)?.requireTwoFactor);

  await prisma.setting.upsert({
    where: { key: 'twoFactorPolicy' },
    update: { value: { requireTwoFactor: required } as any },
    create: { key: 'twoFactorPolicy', value: { requireTwoFactor: required } as any },
  });

  if (required && !wasRequired) {
    // Email every admin still without 2FA — and only those (the enrolled
    // have nothing to do). The recipient query runs after the write
    // above, detached and batched through the notice queue.
    notifyTwoFactorRequiredForAll(actor.userId);

    // Sessions of admins that have not enrolled would otherwise run up to
    // 7 days unchallenged under the new policy (#17) — revoke those
    // sessions and their refresh lineage so everyone re-signs in: the
    // unenrolled meet the enrollment gate, the enrolled (whose sessions
    // already passed a challenge) are left alone.
    const unenrolled = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true, twoFactorEnabled: false },
      select: { id: true },
    });
    if (unenrolled.length > 0) {
      const ids = unenrolled.map((u) => u.id);
      await prisma.session.deleteMany({ where: { userId: { in: ids } } });
      await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    }
  }

  await logAction(actor.userId, required ? 'REQUIRE_TWO_FACTOR_ALL' : 'CLEAR_TWO_FACTOR_POLICY', 'setting', undefined, { required }, c);
  return c.json({ success: true, data: { required } });
});

// ============================================
// Security PIN administration (§14.44)
// ============================================

// Reset an admin's security PIN — the only way a forgotten PIN leaves an
// account (there is no self-service removal: the PIN itself approves, so
// a lost one needs a permission-enabled admin to clear it here). The
// requirement survives the reset, so a demanded account must immediately
// choose a fresh one at its next PIN challenge.
admin.post('/admins/:id/pin-reset', requireAdmin, requirePermission('admins.edit'), rateLimit({ windowMs: 60000, max: 10 }), async (c) => {
  // Approving a PIN change with the PIN being changed would defeat it —
  // this gate checks the ACTING admin's own PIN.
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const id = c.req.param('id');
  const actor = c.get('admin');
  const user = await prisma.user.findUnique({
    where: { id },
    include: { adminUser: { include: { role: true } } },
  });
  if (!user || user.role !== 'ADMIN' || !user.adminUser) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }
  // Same invisibility rule as delete: a super admin is managed only by a
  // super admin — everyone else gets the 404 their list implies.
  if (isSuper(user.adminUser.role?.permissions) && !isSuper(actor?.role?.permissions)) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }

  await prisma.adminUser.update({
    where: { id: user.adminUser.id },
    data: { pinHash: null, pinSetAt: null, pinAttempts: 0, pinWindowStart: null },
  });
  // The cleared PIN must not inherit the old one's lockout either.
  await clearPinAttempts(user.id);

  await logAction(actor.userId, 'SECURITY_PIN_RESET', 'user', id, { ...targetIdentity(user) }, c);
  return c.json({ success: true, data: { pinSet: false } });
});

// Super admin: demand (or release) a security PIN for one admin. Demanding
// provisions nothing — the account must set a PIN at its next PIN
// challenge (lock screen or first sensitive action) and can no longer
// leave the panel without one.
admin.patch('/admins/:id/pin-required', requireAdmin, validate(z.object({ required: z.boolean() })), rateLimit({ windowMs: 60000, max: 10 }), async (c) => {
  const actor = c.get('admin');
  if (!isSuper(actor?.role?.permissions)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super admin access is required to manage security PINs.' },
    }, 403);
  }

  const id = c.req.param('id');
  const { required } = c.get('validatedData') as { required: boolean };

  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { adminUser: true },
  });
  if (!user || user.role !== 'ADMIN' || !user.adminUser) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }

  // Only the OFF->ON transition notifies — re-issuing an already-standing
  // requirement says nothing new. Queued + batched, never inline.
  const wasRequired = user.adminUser.pinRequired;
  await prisma.adminUser.update({ where: { id: user.adminUser.id }, data: { pinRequired: required } });
  if (required && !wasRequired && user.email) {
    notifyPinRequired({ email: user.email, pinSet: Boolean(user.adminUser.pinHash) }, actor.userId);
  }
  await logAction(actor.userId, required ? 'REQUIRE_SECURITY_PIN' : 'CLEAR_SECURITY_PIN_REQUIREMENT', 'user', id, { ...targetIdentity(user) }, c);
  return c.json({ success: true, data: { required } });
});

// "Require security PIN for all admins" — the sibling of the two-factor
// policy, stored the same reserved way (Setting key `pinPolicy`: not in
// KEY_PERMISSIONS, so only super '*' can touch it through the generic
// settings routes).
//
// Unlike the 2FA policy, turning this ON deliberately revokes no
// sessions: the PIN is not a sign-in factor, so there is no "unchallenged
// session" gap to close (#17) — every sensitive call re-reads the policy
// server-side through requirePinApproval, which applies to sessions
// issued months ago exactly as it does to new ones (and fails closed).
admin.post('/pin-policy', requireAdmin, validate(z.object({ required: z.boolean() })), rateLimit({ windowMs: 60000, max: 10 }), async (c) => {
  const actor = c.get('admin');
  if (!isSuper(actor?.role?.permissions)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super admin access is required to change the security PIN policy.' },
    }, 403);
  }

  const { required } = c.get('validatedData') as { required: boolean };

  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  // Only the OFF->ON transition notifies (see the two-factor policy).
  const previousPolicy = await prisma.setting.findUnique({ where: { key: 'pinPolicy' } });
  const wasRequired = Boolean((previousPolicy?.value as any)?.requirePin);

  await prisma.setting.upsert({
    where: { key: 'pinPolicy' },
    update: { value: { requirePin: required } as any },
    create: { key: 'pinPolicy', value: { requirePin: required } as any },
  });

  if (required && !wasRequired) {
    // Email every admin still without a PIN — and only those. Recipient
    // query after the write above, detached and batched.
    notifyPinRequiredForAll(actor.userId);
  }

  await logAction(actor.userId, required ? 'REQUIRE_SECURITY_PIN_ALL' : 'CLEAR_SECURITY_PIN_POLICY', 'setting', undefined, { required }, c);
  return c.json({ success: true, data: { required } });
});

// ============================================
// Feature Flags
// ============================================
admin.get('/features', requireAdmin, requirePermission('maintenance.view'), async (c) => {
  const features = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  return c.json(features);
});

admin.post('/features', requireAdmin, requirePermission('maintenance.edit'), validate(featureFlagSchema), async (c) => {
  const body = c.get('validatedData');
  const adminUser = c.get('admin');

  const feature = await prisma.featureFlag.create({ data: body });
  await logAction(adminUser.userId, 'CREATE_FEATURE', 'feature', feature.id, body, c);
  return c.json(feature, 201);
});

admin.patch('/features/:id', requireAdmin, requirePermission('maintenance.edit'), validate(featureFlagSchema.partial()), async (c) => {
  const id = c.req.param('id');
  const body = c.get('validatedData');
  const adminUser = c.get('admin');

  const feature = await prisma.featureFlag.update({ where: { id }, data: body });
  await logAction(adminUser.userId, 'UPDATE_FEATURE', 'feature', id, body, c);
  return c.json(feature);
});

admin.delete('/features/:id', requireAdmin, requirePermission('maintenance.edit'), async (c) => {
  const id = c.req.param('id');
  const adminUser = c.get('admin');

  await prisma.featureFlag.delete({ where: { id } });
  await logAction(adminUser.userId, 'DELETE_FEATURE', 'feature', id, {}, c);
  return c.json({ success: true });
});

// ============================================
// Maintenance Mode
// ============================================
admin.get('/maintenance', requireAdmin, requirePermission('maintenance.view'), async (c) => {
  const mode = await prisma.maintenanceMode.findFirst({ where: { isActive: true } });
  return c.json(mode || { isActive: false });
});

admin.post('/maintenance', requireAdmin, requirePermission('maintenance.edit'), validate(maintenanceModeSchema), async (c) => {
  const body = c.get('validatedData');
  const adminUser = c.get('admin');

  // Deactivate any existing maintenance
  await prisma.maintenanceMode.updateMany({ where: { isActive: true }, data: { isActive: false } });

  const mode = await prisma.maintenanceMode.create({
    data: { ...body, createdBy: adminUser.userId },
  });
  await logAction(adminUser.userId, 'SET_MAINTENANCE', 'maintenance', mode.id, body, c);
  return c.json(mode);
});

// ============================================
// Reports
// ============================================
admin.get('/reports', requireAdmin, requirePermission('reports.view'), async (c) => {
  const page = clampPage(c.req.query('page'));
  const limit = clampLimit(c.req.query('limit'));
  const status = c.req.query('status');

  const where: any = {};
  if (status) where.status = status;

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      // Only identity fields the reports list shows. A raw `reporter: true`
      // would hand a reports.view admin every user's full row, including
      // passwordHash + twoFactorSecret (#3).
      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
            isActive: true,
          },
        },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return c.json({ reports, total, page, limit, totalPages: Math.ceil(total / limit) });
});

admin.patch('/reports/:id', requireAdmin, requirePermission('reports.edit'), validate(reportSchema.partial()), async (c) => {
  const id = c.req.param('id');
  const body = c.get('validatedData');
  const adminUser = c.get('admin');

  const report = await prisma.report.update({
    where: { id },
    data: { ...body, reviewedBy: adminUser.userId, reviewedAt: new Date() },
  });

  await logAction(adminUser.userId, 'REVIEW_REPORT', 'report', id, body, c);
  return c.json(report);
});

// ============================================
// Activity feed — typed view over the action log (the /activity-logs page)
// ============================================
admin.get('/activity', requireAdmin, requirePermission('audit.view'), async (c) => {
  const page = clampPage(c.req.query('page'));
  const limit = clampLimit(c.req.query('limit'), 25);
  const type = c.req.query('type') || 'all';

  if (!isActivityType(type)) {
    return c.json({
      success: false,
      error: { code: 'INVALID_TYPE', message: `Unknown activity type. Valid: ${ACTIVITY_TYPES.join(', ')}` },
    }, 400);
  }

  // Server-side search + date range (the /activity-logs filter bar).
  // Every word of `q` must match somewhere (AND over tokens) and any
  // searchable field can satisfy it (OR inside) — so "E2E Activity"
  // finds a row whose actor is E2E Activity even though the name is
  // stored in two columns. Plain columns match case-insensitively;
  // `details` is JSON, where Prisma's string_contains is case-sensitive
  // AND needs an explicit path (without one it only matches a
  // top-level JSON string, never our object) — the paths below are the
  // very fields the row card displays, plus the query's lowercase form
  // so a caps-typed email still hits its lowercase stored copy.
  // Both filters fold into the SAME `where` that drives the items, the
  // count and the summary, so pagination stays correct server-side.
  const q = (c.req.query('q') ?? '').trim().slice(0, 200);
  const from = c.req.query('from') ?? '';
  const to = c.req.query('to') ?? '';
  const dayOnly = /^\d{4}-\d{2}-\d{2}$/;
  // Bounds come in two shapes: `YYYY-MM-DD` — a whole UTC day, the
  // simple API form — or a full ISO instant, which is what the filter
  // bar sends. Rows DISPLAY with toLocaleString() in the admin's
  // browser, so the day boundaries have to be built in that same
  // timezone (local midnight → instant) or the selected range
  // disagrees with the dates on screen by the whole UTC offset.
  const parseBound = (raw: string, edge: 'start' | 'end'): Date | null | 'invalid' => {
    if (!raw) return null;
    let d: Date;
    if (dayOnly.test(raw)) {
      d = new Date(edge === 'start' ? `${raw}T00:00:00.000Z` : `${raw}T23:59:59.999Z`);
    } else if (raw.includes('T')) {
      d = new Date(raw);
    } else {
      return 'invalid';
    }
    return Number.isNaN(d.getTime()) ? 'invalid' : d;
  };
  const fromD = parseBound(from, 'start');
  const toD = parseBound(to, 'end');
  if (fromD === 'invalid' || toD === 'invalid') {
    return c.json({
      success: false,
      error: { code: 'INVALID_DATE', message: "from/to must be '2026-10-01' or an ISO instant" },
    }, 400);
  }

  const filters: Record<string, unknown>[] = [];
  if (q) {
    const tokens = q.split(/\s+/).filter(Boolean).slice(0, 10);
    const detailKeys = ['name', 'email', 'device', 'title', 'company', 'subject', 'to', 'reason', 'method', 'error'];
    filters.push({
      AND: tokens.map((tok) => ({
        OR: [
          { action: { contains: tok, mode: 'insensitive' } },
          { targetType: { contains: tok, mode: 'insensitive' } },
          { ipAddress: { contains: tok, mode: 'insensitive' } },
          { userAgent: { contains: tok, mode: 'insensitive' } },
          {
            admin: {
              OR: [
                { email: { contains: tok, mode: 'insensitive' } },
                { firstName: { contains: tok, mode: 'insensitive' } },
                { lastName: { contains: tok, mode: 'insensitive' } },
              ],
            },
          },
          ...detailKeys.map((key) => ({ details: { path: [key], string_contains: tok } })),
          ...(tok.toLowerCase() === tok
            ? []
            : detailKeys.map((key) => ({ details: { path: [key], string_contains: tok.toLowerCase() } }))),
        ],
      })),
    });
  }
  // Day-granular bounds: an ISO instant is used verbatim, a bare date
  // becomes a UTC day (start/end edge respectively).
  if (fromD) filters.push({ createdAt: { gte: fromD } });
  if (toD) filters.push({ createdAt: { lte: toD } });

  const where = filters.length ? { AND: [activityWhere(type), ...filters] } : activityWhere(type);
  const [items, total] = await Promise.all([
    prisma.adminAction.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      // The actor: for LOGIN rows that is the account that signed in; for
      // CREATE_JOB rows the employer's account (AdminAction.adminId is a
      // plain User FK, so non-admin actors are legal); null for system
      // rows (SMTP deliveries) — rendered as "System". The adminUser
      // presence is what splits admin activity from future web-app user
      // activity, so the join carries it.
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            adminUser: { select: { id: true } },
          },
        },
      },
    }),
    prisma.adminAction.count({ where }),
  ]);

  // The SMTP section doubles as the delivery counter: how many sends
  // succeeded and how many failed — over the SAME search/date filters
  // as the list, so the chips always describe the rows below them.
  let summary: { sent: number; failed: number } | null = null;
  if (type === 'smtp') {
    const [sent, failed] = await Promise.all([
      prisma.adminAction.count({ where: { AND: [where, { action: 'EMAIL_SENT' }] } }),
      prisma.adminAction.count({ where: { AND: [where, { action: 'EMAIL_FAILED' }] } }),
    ]);
    summary = { sent, failed };
  }

  return c.json({
    success: true,
    data: {
      type,
      // Per-row section, so the All view can badge each entry without
      // re-deriving the partition on the client.
      items: items.map((item) => ({
        id: item.id,
        action: item.action,
        category: activityCategory(item.action, item.targetType, item.admin),
        targetType: item.targetType,
        targetId: item.targetId,
        details: item.details,
        ipAddress: item.ipAddress,
        userAgent: item.userAgent,
        createdAt: item.createdAt,
        actor: item.admin
          ? {
              id: item.admin.id,
              email: item.admin.email,
              name: [item.admin.firstName, item.admin.lastName].filter(Boolean).join(' ') || item.admin.email,
            }
          : null,
      })),
      summary,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ============================================
// Roles (permission sets for the role-based system)
// ============================================
admin.get('/roles', requireAdmin, requirePermission('roles.view'), async (c) => {
  const roles = await prisma.adminRole.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { users: true } } },
  });
  return c.json(roles);
});

admin.post('/roles', requireAdmin, requirePermission('roles.create'), validate(adminRoleSchema), rateLimit({ windowMs: 60000, max: 20 }), async (c) => {
  // Creating a role can mint "*" — approval with PIN before anything else
  // (#9).
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const body = c.get('validatedData');
  const adminUser = c.get('admin');

  // Escalation guard beyond roles.create (#4): minting a "*" role is
  // super-only, and every permission in the new role must already be held
  // by the actor — checked before anything else so a rejected grant never
  // reaches the duplicate check or the write.
  const deniedGrant = grantDenied(adminUser?.role?.permissions, body.permissions);
  if (deniedGrant) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: deniedGrant } }, 403);
  }

  const duplicate = await prisma.adminRole.findUnique({ where: { name: body.name } });
  if (duplicate) {
    return c.json({ success: false, error: { code: 'CONFLICT', message: 'A role with this name already exists' } }, 409);
  }

  const role = await prisma.adminRole.create({
    data: body,
    include: { _count: { select: { users: true } } },
  });
  await logAction(adminUser.userId, 'CREATE_ROLE', 'role', role.id, body, c);
  return c.json(role, 201);
});

admin.put('/roles/:id', requireAdmin, requirePermission('roles.edit'), validate(adminRoleSchema), rateLimit({ windowMs: 60000, max: 20 }), async (c) => {
  // Editing a role's grants is the classic escalation path — approve with
  // PIN first (#9).
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const id = c.req.param('id');
  const body = c.get('validatedData');
  const adminUser = c.get('admin');

  const role = await prisma.adminRole.findUnique({ where: { id } });
  if (!role) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Role not found' } }, 404);
  }
  // Escalation guards beyond roles.edit (#4): touching a role that
  // CURRENTLY holds "*" is super-only (even a downgrade of it), and the
  // incoming permission list obeys the same "cannot grant beyond what you
  // hold" rule as create. Checked before the duplicate lookup or write, so
  // a rejected grant never mutates anything.
  if (isSuper(role.permissions) && !isSuper(adminUser?.role?.permissions)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Only a super admin can edit a role with the "*" (super admin) permission.' },
    }, 403);
  }
  const deniedGrant = grantDenied(adminUser?.role?.permissions, body.permissions);
  if (deniedGrant) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: deniedGrant } }, 403);
  }
  if (role.name !== body.name) {
    const duplicate = await prisma.adminRole.findUnique({ where: { name: body.name } });
    if (duplicate) {
      return c.json({ success: false, error: { code: 'CONFLICT', message: 'A role with this name already exists' } }, 409);
    }
  }

  const updated = await prisma.adminRole.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description ?? null,
      permissions: body.permissions,
    },
    include: { _count: { select: { users: true } } },
  });

  await logAction(adminUser.userId, 'UPDATE_ROLE', 'role', id, { name: updated.name }, c);
  return c.json(updated);
});

admin.delete('/roles/:id', requireAdmin, requirePermission('roles.delete'), rateLimit({ windowMs: 60000, max: 20 }), async (c) => {
  // Removing a role is destructive like every other delete here (#9).
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const id = c.req.param('id');
  const adminUser = c.get('admin');

  const role = await prisma.adminRole.findUnique({ where: { id } });
  if (!role) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Role not found' } }, 404);
  }
  if (role.isSystem) {
    return c.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'The system role cannot be deleted' } }, 400);
  }
  const assigned = await prisma.adminUser.count({ where: { roleId: id } });
  if (assigned > 0) {
    return c.json({ success: false, error: { code: 'IN_USE', message: `Role is assigned to ${assigned} admin(s)` } }, 409);
  }

  await prisma.adminRole.delete({ where: { id } });
  await logAction(adminUser.userId, 'DELETE_ROLE', 'role', id, { name: role.name }, c);
  return c.json({ success: true });
});

export default admin;
