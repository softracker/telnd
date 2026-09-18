import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const admin = new Hono();

// Middleware: require admin role
const requireAdmin = async (c: any, next: any) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
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
    prisma.jobPosting.count(),
    prisma.jobPosting.count({ where: { status: 'ACTIVE' } }),
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
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
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

admin.patch('/users/:id/suspend', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const { reason } = await c.req.json();
  const adminUser = c.get('admin');

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

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

admin.post('/features', requireAdmin, async (c) => {
  const body = await c.req.json();
  const adminUser = c.get('admin');

  const feature = await prisma.featureFlag.create({ data: body });
  await logAction(adminUser.userId, 'CREATE_FEATURE', 'feature', feature.id, body, c);
  return c.json(feature, 201);
});

admin.patch('/features/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
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

admin.post('/maintenance', requireAdmin, async (c) => {
  const body = await c.req.json();
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
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
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

admin.patch('/reports/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
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
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
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

admin.post('/roles', requireAdmin, async (c) => {
  const body = await c.req.json();
  const adminUser = c.get('admin');

  const role = await prisma.adminRole.create({ data: body });
  await logAction(adminUser.userId, 'CREATE_ROLE', 'role', role.id, body, c);
  return c.json(role, 201);
});

export default admin;
