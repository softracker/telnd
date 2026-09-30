import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { createJobSchema, jobSearchSchema } from '@telnd/validation';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { getIp } from '../lib/getIp';

type JobsEnv = {
  Variables: {
    user: any;
    userId: string;
    validatedData: any;
  };
};

export const jobRoutes = new Hono<JobsEnv>();

jobRoutes.get('/', async (c) => {
  const query = Object.fromEntries(new URL(c.req.url).searchParams);
  const parsed = jobSearchSchema.safeParse({
    ...query,
    page: query.page ? parseInt(query.page) : 1,
    limit: query.limit ? parseInt(query.limit) : 20,
  });

  const filters = parsed.success ? parsed.data : { page: 1, limit: 20 };
  const { page = 1, limit = 20, ...searchFilters } = filters as { page?: number; limit?: number; query?: string; employmentType?: string[]; workplaceType?: string[] };

  const where: Record<string, unknown> = {
    status: 'PUBLISHED',
  };

  if (searchFilters.query) {
    where.OR = [
      { title: { contains: searchFilters.query, mode: 'insensitive' } },
      { description: { contains: searchFilters.query, mode: 'insensitive' } },
    ];
  }

  if (searchFilters.employmentType?.length) {
    // Same direction as the POST fix: zod's names are lowercase, the
    // Prisma enum is uppercase — un-mapped, any filtered search threw.
    where.employmentType = { in: searchFilters.employmentType.map((v) => v.toUpperCase()) };
  }

  if (searchFilters.workplaceType?.length) {
    where.workplaceType = { in: searchFilters.workplaceType.map((v) => v.toUpperCase()) };
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: { company: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.job.count({ where }),
  ]);

  return c.json({
    success: true,
    data: jobs,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

jobRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      company: true,
      customQuestions: true,
      mandatoryRequirements: true,
    },
  });

  if (!job) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Job not found' },
    }, 404);
  }

  return c.json({ success: true, data: job });
});

jobRoutes.post('/', authMiddleware, validate(createJobSchema), async (c) => {
  const data = c.get('validatedData') as any;
  const userId = c.get('userId');

  // Verify user owns a company
  const company = await prisma.company.findFirst({
    where: { ownerId: userId },
  });

  if (!company) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You must own a company to post jobs' },
    }, 403);
  }

  const job = await prisma.job.create({
    data: {
      companyId: company.id,
      title: data.title,
      department: data.department,
      description: data.description,
      responsibilities: data.responsibilities,
      requirements: data.requirements,
      preferredQualifications: data.preferredQualifications,
      benefits: data.benefits,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      salaryCurrency: data.salaryCurrency,
      // zod validates the lowercase names ('full_time'); the Prisma enum
      // is uppercase (FULL_TIME) — without the mapping prisma.job.create
      // always threw and this route answered 500.
      employmentType: data.employmentType.toUpperCase(),
      workplaceType: data.workplaceType.toUpperCase(),
      location: data.location,
      vacancies: data.vacancies,
      deadline: data.deadline ? new Date(data.deadline) : null,
      visibility: data.visibility.toUpperCase(),
    },
  });

  // Employer activity (§ Activity Logs → Employer Activity): a company
  // owner posted a job. AdminAction.adminId is a plain User FK, so the
  // employer's own account is a legal actor. Fire-and-forget — a log
  // write never fails the post.
  const ip = getIp(c);
  void prisma.adminAction
    .create({
      data: {
        adminId: userId,
        action: 'CREATE_JOB',
        targetType: 'job',
        targetId: job.id,
        details: { title: job.title, companyId: company.id, company: company.name },
        ipAddress: ip === 'unknown' ? null : ip,
        userAgent: c.req.header('user-agent') || undefined,
      },
    })
    .catch(() => {
      // Deliberately swallowed — see above.
    });

  return c.json({ success: true, data: job }, 201);
});
