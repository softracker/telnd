import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { validate } from '../middleware/validate';
import { roleGuard } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { merchantSchema, merchantStaffSchema, merchantCourseSchema, merchantAttendanceSchema, merchantExamSchema, merchantAnnouncementSchema, merchantFeeSchema, merchantRoutineSchema, merchantStudentSchema } from '@telnd/validation';

type MerchantEnv = {
  Variables: {
    user: any;
    userId: string;
    validatedData: any;
  };
};

const merchant = new Hono<MerchantEnv>();

// (#27) page/limit went straight from parseInt into skip/take: 'abc'
// became NaN and 999999999 an unbounded read, so one request could pull
// (or crash on) the whole merchant directory. Same clamp the admin router
// uses.
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

// (#3) Display-only projection of a User nested under staff/student rows.
// The raw row carries passwordHash and the twoFactor* material, so nested
// `user: true` includes are never safe; phone is omitted because no screen
// rendering these payloads shows it (grep of apps/ finds no caller of these
// endpoints at all).
const displayUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatar: true,
  role: true,
  isActive: true,
} as const;

// (#7) Every /:id/... route resolves its merchant from the path, so the
// resolved row must belong to the caller before any read OR write runs —
// otherwise any signed-in user could read or mutate another tenant's data
// by guessing ids. The caller gets the same 404 message the write routes
// already use, so a wrong id and someone else's id are indistinguishable.
// Returns { deny } (return it straight from the handler) or { merchant }.
async function requireOwnedMerchant(c: any, id: string) {
  const user = c.get('user');
  if (!user) return { deny: c.json({ error: 'Unauthorized' }, 401) };
  const existing = await prisma.merchant.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== user.id) {
    return { deny: c.json({ error: 'Not found or unauthorized' }, 404) };
  }
  return { merchant: existing };
}

// ============================================
// List Merchants (Public)
// ============================================
merchant.get('/', async (c) => {
  const { type, city } = c.req.query();
  const pageNum = clampPage(c.req.query('page'));
  const limitNum = clampLimit(c.req.query('limit'));

  const where: any = { isActive: true };
  if (type) where.type = type;
  if (city) where.city = city;

  const [merchants, total] = await Promise.all([
    prisma.merchant.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.merchant.count({ where }),
  ]);

  return c.json({ merchants, total, page: pageNum, limit: limitNum });
});

// ============================================
// Get Merchant by Slug
// ============================================
merchant.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const merchant_ = await prisma.merchant.findUnique({
    where: { slug },
    include: {
      // (#3) Public profile: staff display identity only — the raw user
      // row would ship passwordHash + twoFactor* material to anyone.
      staff: { include: { user: { select: displayUserSelect } } },
      courses: { where: { isActive: true } },
      _count: { select: { students: true, courses: true } },
    },
  });

  if (!merchant_) return c.json({ error: 'Merchant not found' }, 404);
  return c.json(merchant_);
});

// ============================================
// Create Merchant
// ============================================
// (#16) Merchant creation stays self-service — no apps/ caller exists yet,
// and the row is owned by whoever creates it (ownerId is forced to the
// caller below and can never be spoofed from the body) — so the guard
// against merchant factories is a hard cap: 10 new merchants per owner per
// hour (bucketed on the authenticated id, not the IP).
merchant.post('/', rateLimit('merchant.create'), validate(merchantSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = c.get('validatedData');

  // Check slug uniqueness
  const existing = await prisma.merchant.findUnique({ where: { slug: body.slug } });
  if (existing) return c.json({ error: 'Slug already taken' }, 400);

  // (#16) ownerId comes from the session, never the body.
  const merchant_ = await prisma.merchant.create({
    data: { ...body, ownerId: user.id },
  });

  // Create map pin if coordinates provided
  if (body.lat && body.lng) {
    await prisma.mapPin.create({
      data: {
        targetType: 'merchant',
        targetId: merchant_.id,
        lat: body.lat,
        lng: body.lng,
        address: body.address,
        city: body.city,
        country: body.country || 'Bangladesh',
        isExact: true,
      },
    });
  }

  return c.json(merchant_, 201);
});

// ============================================
// Update Merchant
// ============================================
merchant.patch('/:id', validate(merchantSchema.partial()), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id')!;
  const body = c.get('validatedData');

  const existing = await prisma.merchant.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== user.id) {
    return c.json({ error: 'Not found or unauthorized' }, 404);
  }

  const updated = await prisma.merchant.update({ where: { id }, data: body });

  // Update map pin if coordinates changed
  if (body.lat && body.lng) {
    await prisma.mapPin.upsert({
      where: { targetType_targetId: { targetType: 'merchant', targetId: id } },
      update: { lat: body.lat, lng: body.lng, address: body.address, city: body.city },
      create: { targetType: 'merchant', targetId: id, lat: body.lat, lng: body.lng, address: body.address, city: body.city, country: body.country || 'Bangladesh', isExact: true },
    });
  }

  return c.json(updated);
});

// ============================================
// Staff Management
// ============================================
merchant.get('/:id/staff', async (c) => {
  const id = c.req.param('id');
  // (#7) Staff rows belong to the merchant, so the merchant must belong to
  // the caller — this read had no ownership check at all before.
  const gate = await requireOwnedMerchant(c, id);
  if ('deny' in gate) return gate.deny;

  const staff = await prisma.merchantStaff.findMany({
    where: { merchantId: id },
    // (#3) Display projection only — never the raw user row.
    include: { user: { select: displayUserSelect } },
  });
  return c.json(staff);
});

merchant.post('/:id/staff', validate(merchantStaffSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const body = c.get('validatedData');

  const existing = await prisma.merchant.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== user.id) {
    return c.json({ error: 'Not found or unauthorized' }, 404);
  }

  const staff = await prisma.merchantStaff.create({
    data: { merchantId: id, ...body },
  });

  return c.json(staff, 201);
});

merchant.delete('/:id/staff/:staffId', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const staffId = c.req.param('staffId');

  const existing = await prisma.merchant.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== user.id) {
    return c.json({ error: 'Not found or unauthorized' }, 404);
  }

  // (#7) Scope the delete by BOTH merchant id and staff row: deleting by
  // bare staffId let merchant A's owner remove merchant B's staff (the
  // ownership check above only proved A owned *some* merchant).
  const deleted = await prisma.merchantStaff.deleteMany({
    where: { id: staffId, merchantId: id },
  });
  if (deleted.count === 0) {
    return c.json({ error: 'Staff member not found' }, 404);
  }
  return c.json({ success: true });
});

// ============================================
// Student Management
// ============================================
merchant.get('/:id/students', async (c) => {
  const id = c.req.param('id');
  // (#7) Ownership check as on GET /:id/staff — this read was unowned too.
  const gate = await requireOwnedMerchant(c, id);
  if ('deny' in gate) return gate.deny;

  const students = await prisma.merchantStudent.findMany({
    where: { merchantId: id },
    // (#3) Display projection for the nested user — never the raw row.
    include: { user: { select: displayUserSelect }, course: true },
  });
  return c.json(students);
});

merchant.post('/:id/students', validate(merchantStudentSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id')!;
  const body = c.get('validatedData');

  const existing = await prisma.merchant.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== user.id) {
    return c.json({ error: 'Not found or unauthorized' }, 404);
  }

  const student = await prisma.merchantStudent.create({
    data: { merchantId: id, ...body },
  });

  return c.json(student, 201);
});

// ============================================
// Courses
// ============================================
merchant.get('/:id/courses', async (c) => {
  const id = c.req.param('id');
  // (#7) Ownership check as on GET /:id/staff.
  const gate = await requireOwnedMerchant(c, id);
  if ('deny' in gate) return gate.deny;

  const courses = await prisma.merchantCourse.findMany({
    where: { merchantId: id },
    include: { _count: { select: { students: true } } },
  });
  return c.json(courses);
});

merchant.post('/:id/courses', validate(merchantCourseSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id')!;
  const body = c.get('validatedData');

  const existing = await prisma.merchant.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== user.id) {
    return c.json({ error: 'Not found or unauthorized' }, 404);
  }

  const course = await prisma.merchantCourse.create({
    data: { merchantId: id, ...body },
  });

  return c.json(course, 201);
});

// ============================================
// Attendance
// ============================================
merchant.post('/:id/attendance', validate(merchantAttendanceSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id')!;
  const body = c.get('validatedData');

  const existing = await prisma.merchant.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== user.id) {
    return c.json({ error: 'Not found or unauthorized' }, 404);
  }

  const attendance = await prisma.merchantAttendance.upsert({
    where: { merchantId_studentId_date: { merchantId: id, studentId: body.studentId, date: new Date(body.date) } },
    update: { status: body.status, checkIn: body.checkIn, checkOut: body.checkOut, notes: body.notes },
    create: { merchantId: id, ...body, date: new Date(body.date) },
  });

  return c.json(attendance);
});

merchant.get('/:id/attendance', async (c) => {
  const id = c.req.param('id');
  // (#7) Ownership check as on GET /:id/staff — attendance was readable
  // cross-tenant by any signed-in user.
  const gate = await requireOwnedMerchant(c, id);
  if ('deny' in gate) return gate.deny;

  const { date, studentId } = c.req.query();

  const where: any = { merchantId: id };
  if (date) where.date = new Date(date);
  if (studentId) where.studentId = studentId;

  const attendance = await prisma.merchantAttendance.findMany({
    where,
    include: { student: true },
    orderBy: { date: 'desc' },
  });

  return c.json(attendance);
});

// ============================================
// Exams
// ============================================
merchant.post('/:id/exams', validate(merchantExamSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id')!;
  const body = c.get('validatedData');

  const existing = await prisma.merchant.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== user.id) {
    return c.json({ error: 'Not found or unauthorized' }, 404);
  }

  const exam = await prisma.merchantExam.create({
    data: { merchantId: id, ...body, examDate: new Date(body.examDate) },
  });

  return c.json(exam, 201);
});

merchant.get('/:id/exams', async (c) => {
  const id = c.req.param('id');
  // (#7) Ownership check as on GET /:id/staff — exams were readable
  // cross-tenant by any signed-in user.
  const gate = await requireOwnedMerchant(c, id);
  if ('deny' in gate) return gate.deny;

  const exams = await prisma.merchantExam.findMany({
    where: { merchantId: id },
    include: { student: true, course: true },
    orderBy: { examDate: 'desc' },
  });

  return c.json(exams);
});

// ============================================
// Announcements
// ============================================
merchant.get('/:id/announcements', async (c) => {
  const id = c.req.param('id');
  // (#7) Ownership check as on GET /:id/staff.
  const gate = await requireOwnedMerchant(c, id);
  if ('deny' in gate) return gate.deny;

  const announcements = await prisma.merchantAnnouncement.findMany({
    where: { merchantId: id },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  });

  return c.json(announcements);
});

merchant.post('/:id/announcements', validate(merchantAnnouncementSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id')!;
  const body = c.get('validatedData');

  const existing = await prisma.merchant.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== user.id) {
    return c.json({ error: 'Not found or unauthorized' }, 404);
  }

  const announcement = await prisma.merchantAnnouncement.create({
    data: { merchantId: id, ...body },
  });

  return c.json(announcement, 201);
});

// ============================================
// Fees
// ============================================
merchant.post('/:id/fees', validate(merchantFeeSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id')!;
  const body = c.get('validatedData');

  const existing = await prisma.merchant.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== user.id) {
    return c.json({ error: 'Not found or unauthorized' }, 404);
  }

  const fee = await prisma.merchantFee.create({
    data: { merchantId: id, ...body, dueDate: new Date(body.dueDate) },
  });

  return c.json(fee, 201);
});

merchant.get('/:id/fees', async (c) => {
  const id = c.req.param('id');
  // (#7) Ownership check as on GET /:id/staff — fee records were readable
  // cross-tenant by any signed-in user.
  const gate = await requireOwnedMerchant(c, id);
  if ('deny' in gate) return gate.deny;

  const { status, studentId } = c.req.query();

  const where: any = { merchantId: id };
  if (status) where.status = status;
  if (studentId) where.studentId = studentId;

  const fees = await prisma.merchantFee.findMany({
    where,
    include: { student: true },
    orderBy: { dueDate: 'desc' },
  });

  return c.json(fees);
});

// ============================================
// Routine
// ============================================
merchant.get('/:id/routine', async (c) => {
  const id = c.req.param('id');
  // (#7) Ownership check as on GET /:id/staff.
  const gate = await requireOwnedMerchant(c, id);
  if ('deny' in gate) return gate.deny;

  const routine = await prisma.merchantRoutine.findMany({
    where: { merchantId: id, isActive: true },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  return c.json(routine);
});

merchant.post('/:id/routine', validate(merchantRoutineSchema), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id')!;
  const body = c.get('validatedData');

  const existing = await prisma.merchant.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== user.id) {
    return c.json({ error: 'Not found or unauthorized' }, 404);
  }

  const routine = await prisma.merchantRoutine.create({
    data: { merchantId: id, ...body },
  });

  return c.json(routine, 201);
});

export default merchant;
