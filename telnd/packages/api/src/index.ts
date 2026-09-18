import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
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

const app = new Hono().basePath('/api');

// Middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
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
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  }, 500);
});

export type AppType = typeof app;
export { app };
