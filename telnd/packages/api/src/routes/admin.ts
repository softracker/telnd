import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '@telnd/database';
import { authMiddleware, roleGuard, requireAdmin, requirePermission, requireAnyPermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { featureFlagSchema, maintenanceModeSchema, reportSchema, adminRoleSchema, suspendUserSchema, createAdminSchema, updateAdminSchema } from '@telnd/validation';
import { sendAdminInviteEmail } from '../lib/email';

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

// Log admin action
const logAction = async (adminId: string, action: string, targetType: string, targetId?: string, details?: any, c?: any) => {
  await prisma.adminAction.create({
    data: {
      adminId,
      action,
      targetType,
      targetId,
      details,
      ipAddress: c?.req.header('x-forwarded-for') || c?.req.header('x-real-ip'),
      userAgent: c?.req.header('user-agent'),
    },
  });
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

  return c.json({ users, total, page, limit, totalPages: Math.ceil(total / limit) });
});

admin.get('/users/:id', requireAdmin, requirePermission('users.view'), async (c) => {
  const id = c.req.param('id');
  const user = await prisma.user.findUnique({
    where: { id },
    include: { capabilities: true },
  });
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json(user);
});

admin.patch('/users/:id/suspend', requireAdmin, requireAnyPermission('users.edit', 'admins.edit'), validate(suspendUserSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.get('validatedData');
  const reason = body.reason;
  const adminUser = c.get('admin');

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  // Revoke all active sessions for the suspended user
  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.refreshToken.deleteMany({ where: { userId: id } });

  await logAction(adminUser.userId, 'SUSPEND_USER', 'user', id, { reason }, c);
  return c.json(user);
});

admin.patch('/users/:id/activate', requireAdmin, requireAnyPermission('users.edit', 'admins.edit'), async (c) => {
  const id = c.req.param('id');
  const adminUser = c.get('admin');

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: true },
  });

  await logAction(adminUser.userId, 'ACTIVATE_USER', 'user', id, {}, c);
  return c.json(user);
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

  const users = await prisma.user.findMany({
    where: { role: 'ADMIN', ...(selfId ? { NOT: { id: selfId } } : {}) },
    orderBy: { createdAt: 'desc' },
    include: { adminUser: { include: { role: true } } },
  });

  const all = users.map((u) => ({
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
  }));

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

admin.post('/admins', requireAdmin, requirePermission('admins.create'), validate(createAdminSchema), async (c) => {
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

  // Nobody types a password: generate a strong temporary one and deliver it
  // only to the confirmed address, via the invite email below.
  const { randomBytes } = await import('node:crypto');
  const bcrypt = await import('bcryptjs');
  const tempPassword = randomBytes(12).toString('base64url');
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      passwordHash,
      role: 'ADMIN',
      isEmailVerified: true,
      adminUser: { create: { roleId: body.roleId } },
    },
    include: { adminUser: { include: { role: true } } },
  });

  const loginUrl = `${(process.env.ADMIN_URL || 'http://localhost:3002').replace(/\/+$/, '')}/login`;
  const emailed = await sendAdminInviteEmail({
    to: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    tempPassword,
    loginUrl,
    roleName: role.name,
  });

  if (!emailed) {
    // Roll back: an admin nobody can log in as is worse than no admin at all.
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

  await logAction(adminUser.userId, 'CREATE_ADMIN', 'user', user.id, { email: body.email, roleId: body.roleId }, c);
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

admin.patch('/admins/:id', requireAdmin, requirePermission('admins.edit'), validate(updateAdminSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.get('validatedData');
  const adminUser = c.get('admin');
  const selfId = c.get('user')?.id;

  if (id === selfId && body.roleId) {
    return c.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'You cannot change your own role' } }, 400);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== 'ADMIN') {
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

  await logAction(adminUser.userId, 'UPDATE_ADMIN', 'user', id, body, c);
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
  const id = c.req.param('id');
  const adminUser = c.get('admin');
  const selfId = c.get('user')?.id;

  if (id === selfId) {
    return c.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'You cannot delete your own account' } }, 400);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== 'ADMIN') {
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

  await logAction(adminUser.userId, 'DELETE_ADMIN', 'user', id, {}, c);
  return c.json({ success: true });
});

// Regenerate an admin's password: issues a fresh temporary password and
// emails it to that admin's address (the UI has no password field — this
// email is the only way credentials ever reach an account). Super admin
// only, since it grants sign-in capability for any account. The email goes
// out BEFORE the hash is swapped, so a failed send leaves the current
// password untouched — an unknown secret is never stored.
admin.post('/admins/:id/regenerate-password', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const actor = c.get('admin');
  const actorPerms: unknown[] = Array.isArray(actor?.role?.permissions) ? actor.role.permissions : [];
  if (!actorPerms.includes('*')) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super admin access is required to regenerate passwords.' },
    }, 403);
  }

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
      error: { code: 'NO_EMAIL', message: 'This admin has no email address, so a new password cannot be delivered.' },
    }, 400);
  }

  const { randomBytes } = await import('node:crypto');
  const bcrypt = await import('bcryptjs');
  const tempPassword = randomBytes(12).toString('base64url');
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const loginUrl = `${(process.env.ADMIN_URL || 'http://localhost:3002').replace(/\/+$/, '')}/login`;
  const emailed = await sendAdminInviteEmail({
    to: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    tempPassword,
    loginUrl,
    roleName: user.adminUser.role?.name ?? '',
    kind: 'reset',
  });

  if (!emailed) {
    return c.json({
      success: false,
      error: {
        code: 'EMAIL_FAILED',
        message: 'The new password could not be emailed, so the current password was left unchanged. Check the SMTP settings and try again.',
      },
    }, 502);
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await logAction(actor.userId, 'REGENERATE_ADMIN_PASSWORD', 'user', user.id, { email: user.email }, c);
  return c.json({ success: true, data: { email: user.email } });
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
      include: { reporter: true },
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
// Audit Log
// ============================================
admin.get('/audit-log', requireAdmin, requirePermission('audit.view'), async (c) => {
  const page = clampPage(c.req.query('page'));
  const limit = clampLimit(c.req.query('limit'), 50);
  const action = c.req.query('action');
  const targetType = c.req.query('targetType');

  const where: any = {};
  if (action) where.action = action;
  if (targetType) where.targetType = targetType;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return c.json({ logs, total, page, limit, totalPages: Math.ceil(total / limit) });
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

admin.post('/roles', requireAdmin, requirePermission('roles.create'), validate(adminRoleSchema), async (c) => {
  const body = c.get('validatedData');
  const adminUser = c.get('admin');

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

admin.put('/roles/:id', requireAdmin, requirePermission('roles.edit'), validate(adminRoleSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.get('validatedData');
  const adminUser = c.get('admin');

  const role = await prisma.adminRole.findUnique({ where: { id } });
  if (!role) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Role not found' } }, 404);
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

admin.delete('/roles/:id', requireAdmin, requirePermission('roles.delete'), async (c) => {
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
