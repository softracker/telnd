import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '@telnd/database';
import { authMiddleware, roleGuard } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { featureFlagSchema, maintenanceModeSchema, reportSchema, adminRoleSchema, suspendUserSchema } from '@telnd/validation';

type AdminEnv = {
  Variables: {
    user: any;
    userId: string;
    admin: any;
    validatedData: any;
  };
};

const admin = new Hono<AdminEnv>();

// All admin routes require auth + admin role
admin.use('*', authMiddleware, roleGuard('ADMIN'));

// Middleware: require admin role
const requireAdmin = async (c: any, next: any) => {
  const user = c.get('user');
  
  const adminUser = await prisma.adminUser.findUnique({
    where: { userId: user.id },
    include: { role: true },
  });
  
  if (!adminUser || !adminUser.isActive) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }
  
  c.set('admin', adminUser);
  await next();
};

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
admin.get('/dashboard', requireAdmin, async (c) => {
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
admin.get('/users', requireAdmin, async (c) => {
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

admin.get('/users/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const user = await prisma.user.findUnique({
    where: { id },
    include: { capabilities: true },
  });
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json(user);
});

admin.patch('/users/:id/suspend', requireAdmin, validate(suspendUserSchema), async (c) => {
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

admin.patch('/users/:id/activate', requireAdmin, async (c) => {
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
// Feature Flags
// ============================================
admin.get('/features', requireAdmin, async (c) => {
  const features = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  return c.json(features);
});

admin.post('/features', requireAdmin, validate(featureFlagSchema), async (c) => {
  const body = c.get('validatedData');
  const adminUser = c.get('admin');

  const feature = await prisma.featureFlag.create({ data: body });
  await logAction(adminUser.userId, 'CREATE_FEATURE', 'feature', feature.id, body, c);
  return c.json(feature, 201);
});

admin.patch('/features/:id', requireAdmin, validate(featureFlagSchema.partial()), async (c) => {
  const id = c.req.param('id');
  const body = c.get('validatedData');
  const adminUser = c.get('admin');

  const feature = await prisma.featureFlag.update({ where: { id }, data: body });
  await logAction(adminUser.userId, 'UPDATE_FEATURE', 'feature', id, body, c);
  return c.json(feature);
});

admin.delete('/features/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const adminUser = c.get('admin');

  await prisma.featureFlag.delete({ where: { id } });
  await logAction(adminUser.userId, 'DELETE_FEATURE', 'feature', id, {}, c);
  return c.json({ success: true });
});

// ============================================
// Maintenance Mode
// ============================================
admin.get('/maintenance', requireAdmin, async (c) => {
  const mode = await prisma.maintenanceMode.findFirst({ where: { isActive: true } });
  return c.json(mode || { isActive: false });
});

admin.post('/maintenance', requireAdmin, validate(maintenanceModeSchema), async (c) => {
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
admin.get('/reports', requireAdmin, async (c) => {
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

admin.patch('/reports/:id', requireAdmin, validate(reportSchema.partial()), async (c) => {
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
admin.get('/audit-log', requireAdmin, async (c) => {
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
// Roles
// ============================================
admin.get('/roles', requireAdmin, async (c) => {
  const roles = await prisma.adminRole.findMany({ orderBy: { name: 'asc' } });
  return c.json(roles);
});

admin.post('/roles', requireAdmin, validate(adminRoleSchema), async (c) => {
  const body = c.get('validatedData');
  const adminUser = c.get('admin');

  const role = await prisma.adminRole.create({ data: body });
  await logAction(adminUser.userId, 'CREATE_ROLE', 'role', role.id, body, c);
  return c.json(role, 201);
});

export default admin;
