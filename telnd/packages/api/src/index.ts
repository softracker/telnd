import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth';
import { jobRoutes } from './routes/jobs';
import { userRoutes } from './routes/users';
import { companyRoutes } from './routes/companies';
import merchant from './routes/merchant';
import lms from './routes/lms';
import analytics from './routes/analytics';
import adminRoutes from './routes/admin';
import mapRoutes from './routes/map';
import packagesRoutes from './routes/packages';
import supportRoutes from './routes/support';
import settingsRoutes from './routes/settings';
import pagesRoutes from './routes/pages';
import userPreferencesRoutes from './routes/user-preferences';
import uploadRoutes from './routes/upload';
import { authMiddleware, roleGuard } from './middleware/auth';
import { prisma } from '@telnd/database';

const app = new Hono().basePath('/api');

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3002'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
}));

// Public routes — no auth required
const publicPaths = ['/api/auth/login', '/api/auth/signup', '/api/auth/otp', '/api/auth/refresh', '/api/auth/reset-password', '/api/health', '/api/jobs', '/api/captcha-config', '/api/settings/general', '/api/settings/team', '/api/pages'];
app.use('*', async (c, next) => {
  const path = new URL(c.req.url).pathname;
  const isPublic = publicPaths.some((p) => path === p || path.startsWith(p + '/'));
  if (isPublic) {
    // Soft auth: populate `user` when a valid token exists so guarded
    // sub-routes (e.g. /api/pages/admin) can still authorize, but never
    // reject anonymous visitors on public paths.
    try {
      await authMiddleware(c, async () => {});
    } catch {
      // Ignore auth failures on public paths — route guards decide.
    }
    return next();
  }
  return authMiddleware(c, next);
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public: only exposes CAPTCHA site key (safe for unauthenticated users)
app.get('/captcha-config', async (c) => {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'captcha' } });
    if (!row) return c.json({ success: true, data: { enabled: false } });
    const val = row.value as any;
    return c.json({ success: true, data: { enabled: val?.enabled === true, siteKey: val?.siteKey || '' } });
  } catch {
    return c.json({ success: true, data: { enabled: false } });
  }
});

// Public: general settings (favicon, logo, meta tags — safe for unauthenticated users).
// Registered BEFORE app.route('/settings', ...) on purpose: Hono runs matching handlers in
// registration order, and the settings router has GET /:key behind roleGuard('ADMIN'), which
// would otherwise shadow this route and return 403 to anonymous visitors.
app.get('/settings/general', async (c) => {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'general' } });
    if (!row) return c.json({ success: true, data: {} });
    return c.json({ success: true, data: row.value });
  } catch {
    return c.json({ success: true, data: {} });
  }
});

// Public: website "Our Team" content (Team & Account in admin settings).
// Same registration-order reason as /settings/general above.
app.get('/settings/team', async (c) => {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'team' } });
    if (!row) return c.json({ success: true, data: {} });
    return c.json({ success: true, data: row.value });
  } catch {
    return c.json({ success: true, data: {} });
  }
});

// Routes
app.route('/auth', authRoutes);
app.route('/jobs', jobRoutes);
app.route('/users', userRoutes);
app.route('/companies', companyRoutes);
app.route('/merchant', merchant);
app.route('/lms', lms);
app.route('/analytics', analytics);
app.route('/admin', adminRoutes);
app.route('/map', mapRoutes);
app.route('/packages', packagesRoutes);
app.route('/support', supportRoutes);
app.route('/settings', settingsRoutes);
app.route('/pages', pagesRoutes);
app.route('/user-preferences', userPreferencesRoutes);
app.route('/upload', uploadRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  const message = process.env.NODE_ENV === 'development' ? String(err?.message || err) : 'An unexpected error occurred';
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  }, 500);
});

export type AppType = typeof app;
export { app };
