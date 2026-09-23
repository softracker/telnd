import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { validate } from '../middleware/validate';
import { lmsCourseSchema, lmsModuleSchema, lmsLessonSchema, lmsQuizSchema, lmsAssignmentSchema, lmsDiscussionSchema, lmsEnrollSchema, lmsProgressSchema } from '@telnd/validation';

type LmsEnv = {
  Variables: {
    user: any;
    userId: string;
    validatedData: any;
  };
};

const lms = new Hono<LmsEnv>();

// ============================================
// List Courses (Public)
// ============================================
lms.get('/courses', async (c) => {
  const { category, level, language, page = '1', limit = '20' } = c.req.query();
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const where: any = { isPublished: true };
  if (category) where.category = category;
  if (level) where.level = level;
  if (language) where.language = language;

  const [courses, total] = await Promise.all([
    prisma.lMSCourse.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: { instructor: true },
    }),
    prisma.lMSCourse.count({ where }),
  ]);

  return c.json({ courses, total, page: pageNum, limit: limitNum });
});

// ============================================
// Get Course by Slug
// ============================================
lms.get('/courses/:slug', async (c) => {
  const slug = c.req.param('slug');
  const course = await prisma.lMSCourse.findUnique({
    where: { slug },
    include: {
      instructor: true,
      modules: {
        include: { lessons: true },
        orderBy: { order: 'asc' },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course) return c.json({ error: 'Course not found' }, 404);
  return c.json(course);
});

// ============================================
// Create Course
// ============================================
lms.post('/courses', validate(lmsCourseSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = c.get('validatedData');

  const existing = await prisma.lMSCourse.findUnique({ where: { slug: body.slug } });
  if (existing) return c.json({ error: 'Slug already taken' }, 400);

  const course = await prisma.lMSCourse.create({
    data: { ...body, instructorId: user.id },
  });

  return c.json(course, 201);
});

// ============================================
// Update Course
// ============================================
lms.patch('/courses/:id', validate(lmsCourseSchema.partial()), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const body = c.get('validatedData');

  const existing = await prisma.lMSCourse.findUnique({ where: { id } });
  if (!existing || existing.instructorId !== user.id) {
    return c.json({ error: 'Not found or unauthorized' }, 404);
  }

  const course = await prisma.lMSCourse.update({ where: { id }, data: body });
  return c.json(course);
});

// ============================================
// Modules
// ============================================
lms.get('/courses/:courseId/modules', async (c) => {
  const courseId = c.req.param('courseId');
  const modules = await prisma.lMSModule.findMany({
    where: { courseId },
    include: { lessons: { orderBy: { order: 'asc' } } },
    orderBy: { order: 'asc' },
  });

  return c.json(modules);
});

lms.post('/courses/:courseId/modules', validate(lmsModuleSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const courseId = c.req.param('courseId')!;
  const body = c.get('validatedData');

  const course = await prisma.lMSCourse.findUnique({ where: { id: courseId } });
  if (!course || course.instructorId !== user.id) {
    return c.json({ error: 'Not found or unauthorized' }, 404);
  }

  const module_ = await prisma.lMSModule.create({
    data: { courseId, ...body },
  });

  return c.json(module_, 201);
});

// ============================================
// Lessons
// ============================================
lms.post('/modules/:moduleId/lessons', validate(lmsLessonSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const moduleId = c.req.param('moduleId')!;
  const body = c.get('validatedData');

  // Verify module exists and derive courseId from the module (prevent courseId spoofing)
  const module_ = await prisma.lMSModule.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!module_) {
    return c.json({ error: 'Module not found' }, 404);
  }

  // Verify the user owns the course this module belongs to
  const course = await prisma.lMSCourse.findUnique({ where: { id: module_.courseId }, select: { instructorId: true } });
  if (!course || course.instructorId !== user.id) {
    return c.json({ error: 'Not found or unauthorized' }, 404);
  }

  const lesson = await prisma.lMSLesson.create({
    data: { moduleId, courseId: module_.courseId, ...body },
  });

  return c.json(lesson, 201);
});

// ============================================
// Enrollment
// ============================================
lms.post('/enroll', validate(lmsEnrollSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { courseId } = c.get('validatedData');

  // Use transaction to prevent race condition (duplicate enrollment + counter desync)
  const enrollment = await prisma.$transaction(async (tx) => {
    const existing = await tx.lMSEnrollment.findUnique({
      where: { courseId_userId: { courseId, userId: user.id } },
    });
    if (existing) throw new Error('ALREADY_ENROLLED');

    const enrollment = await tx.lMSEnrollment.create({
      data: { courseId, userId: user.id },
      include: { course: true },
    });

    await tx.lMSCourse.update({
      where: { id: courseId },
      data: { totalStudents: { increment: 1 } },
    });

    return enrollment;
  }).catch((e: any) => {
    if (e?.message === 'ALREADY_ENROLLED') return null;
    throw e;
  });

  if (!enrollment) {
    return c.json({ error: 'Already enrolled' }, 400);
  }

  return c.json(enrollment, 201);
});

lms.get('/enrollments', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const enrollments = await prisma.lMSEnrollment.findMany({
    where: { userId: user.id },
    include: { course: true },
    orderBy: { createdAt: 'desc' },
  });

  return c.json(enrollments);
});

// ============================================
// Progress
// ============================================
lms.post('/progress', validate(lmsProgressSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = c.get('validatedData');

  // Verify the enrollment belongs to this user
  const enrollment = await prisma.lMSEnrollment.findUnique({ where: { id: body.enrollmentId }, select: { userId: true } });
  if (!enrollment || enrollment.userId !== user.id) {
    return c.json({ error: 'Enrollment not found or unauthorized' }, 404);
  }

  const progress = await prisma.lMSProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: body.enrollmentId, lessonId: body.lessonId } },
    update: { status: body.status, score: body.score, timeSpent: body.timeSpent, completedAt: body.status === 'COMPLETED' ? new Date() : null },
    create: { ...body, userId: user.id },
  });

  return c.json(progress);
});

// ============================================
// Quizzes
// ============================================
lms.post('/courses/:courseId/quizzes', validate(lmsQuizSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const courseId = c.req.param('courseId')!;
  const body = c.get('validatedData');

  const course = await prisma.lMSCourse.findUnique({ where: { id: courseId } });
  if (!course || course.instructorId !== user.id) {
    return c.json({ error: 'Not found or unauthorized' }, 404);
  }

  const quiz = await prisma.lMSQuiz.create({
    data: { courseId, ...body },
  });

  return c.json(quiz, 201);
});

lms.get('/courses/:courseId/quizzes', async (c) => {
  const courseId = c.req.param('courseId');
  const quizzes = await prisma.lMSQuiz.findMany({
    where: { courseId },
    orderBy: { createdAt: 'desc' },
  });

  return c.json(quizzes);
});

// ============================================
// Assignments
// ============================================
lms.post('/courses/:courseId/assignments', validate(lmsAssignmentSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const courseId = c.req.param('courseId')!;
  const body = c.get('validatedData');

  const course = await prisma.lMSCourse.findUnique({ where: { id: courseId } });
  if (!course || course.instructorId !== user.id) {
    return c.json({ error: 'Not found or unauthorized' }, 404);
  }

  const assignment = await prisma.lMSAssignment.create({
    data: { courseId, ...body, dueDate: body.dueDate ? new Date(body.dueDate) : undefined },
  });

  return c.json(assignment, 201);
});

// ============================================
// Discussions
// ============================================
lms.post('/courses/:courseId/discussions', validate(lmsDiscussionSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const courseId = c.req.param('courseId');
  const body = c.get('validatedData');

  const discussion = await prisma.lMSDiscussion.create({
    data: { courseId, userId: user.id, ...body },
  });

  return c.json(discussion, 201);
});

lms.get('/courses/:courseId/discussions', async (c) => {
  const courseId = c.req.param('courseId');
  const discussions = await prisma.lMSDiscussion.findMany({
    where: { courseId, parentId: null },
    include: { user: true, replies: { include: { user: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return c.json(discussions);
});

// ============================================
// Certificates
// ============================================
lms.get('/certificates', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const certificates = await prisma.lMSCertificate.findMany({
    where: { userId: user.id },
    include: { course: true },
    orderBy: { issuedAt: 'desc' },
  });

  return c.json(certificates);
});

export default lms;
