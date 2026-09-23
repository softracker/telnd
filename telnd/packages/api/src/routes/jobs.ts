import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { createJobSchema, jobSearchSchema } from '@telnd/validation';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';

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
    where.employmentType = { in: searchFilters.employmentType };
  }

  if (searchFilters.workplaceType?.length) {
    where.workplaceType = { in: searchFilters.workplaceType };
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
      employmentType: data.employmentType,
      workplaceType: data.workplaceType,
      location: data.location,
      vacancies: data.vacancies,
      deadline: data.deadline ? new Date(data.deadline) : null,
      visibility: data.visibility,
    },
  });

  return c.json({ success: true, data: job }, 201);
});
