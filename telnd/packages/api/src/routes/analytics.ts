import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const analytics = new Hono();

// ============================================
// Admin Analytics
// ============================================
analytics.get('/admin/overview', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalUsers, activeUsers, newUsersThisMonth, totalJobs, activeJobs, totalMerchants, totalCourses] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastActiveAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.jobPosting.count(),
    prisma.jobPosting.count({ where: { status: 'ACTIVE' } }),
    prisma.merchant.count(),
    prisma.lMSCourse.count(),
  ]);

  return c.json({
    totalUsers,
    activeUsers,
    newUsersThisMonth,
    totalJobs,
    activeJobs,
    totalMerchants,
    totalCourses,
  });
});

analytics.get('/admin/users', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [total, active, newThisWeek, newThisMonth] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastActiveAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
  ]);

  return c.json({ total, active, newThisWeek, newThisMonth });
});

analytics.get('/admin/jobs', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [total, active, newThisWeek, applications] = await Promise.all([
    prisma.jobPosting.count(),
    prisma.jobPosting.count({ where: { status: 'ACTIVE' } }),
    prisma.jobPosting.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.application.count(),
  ]);

  return c.json({ total, active, newThisWeek, applications });
});

// ============================================
// User Analytics
// ============================================
analytics.get('/user/profile', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const [applications, interviews, courses] = await Promise.all([
    prisma.application.count({ where: { applicantId: user.id } }),
    prisma.videoInterview.count({ where: { candidateId: user.id } }),
    prisma.lMSEnrollment.count({ where: { userId: user.id } }),
  ]);

  return c.json({ applications, interviews, courses });
});

// ============================================
// Employer Analytics
// ============================================
analytics.get('/employer/jobs', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const [totalPostings, totalApplications] = await Promise.all([
    prisma.jobPosting.count({ where: { companyId: user.id } }),
    prisma.application.count({ where: { job: { companyId: user.id } } }),
  ]);

  return c.json({ totalPostings, totalApplications });
});

// ============================================
// Tutor Analytics
// ============================================
analytics.get('/tutor/bookings', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const [totalBookings, completedBookings] = await Promise.all([
    prisma.tutorBooking.count({ where: { tutorId: user.id } }),
    prisma.tutorBooking.count({ where: { tutorId: user.id, status: 'COMPLETED' } }),
  ]);

  return c.json({ totalBookings, completedBookings });
});

export default analytics;
