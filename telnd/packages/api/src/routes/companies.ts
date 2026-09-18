import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { authMiddleware } from '../middleware/auth';

export const companyRoutes = new Hono();

companyRoutes.get('/:slug', async (c) => {
  const slug = c.req.param('slug');

  const company = await prisma.company.findUnique({
    where: { slug },
    include: {
      jobs: {
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!company) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Company not found' },
    }, 404);
  }

  return c.json({ success: true, data: company });
});

companyRoutes.get('/:slug/jobs', async (c) => {
  const slug = c.req.param('slug');

  const company = await prisma.company.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!company) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Company not found' },
    }, 404);
  }

  const jobs = await prisma.job.findMany({
    where: { companyId: company.id, status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ success: true, data: jobs });
});
