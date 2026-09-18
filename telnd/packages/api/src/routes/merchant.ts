import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const merchant = new Hono();

// ============================================
// List Merchants (Public)
// ============================================
merchant.get('/', async (c) => {
  const { type, city, page = '1', limit = '20' } = c.req.query();
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

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
      staff: { include: { user: true } },
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
merchant.post('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();

  // Check slug uniqueness
  const existing = await prisma.merchant.findUnique({ where: { slug: body.slug } });
  if (existing) return c.json({ error: 'Slug already taken' }, 400);

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
merchant.patch('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const body = await c.req.json();

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
  const staff = await prisma.merchantStaff.findMany({
    where: { merchantId: id },
    include: { user: true },
  });
  return c.json(staff);
});

merchant.post('/:id/staff', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const body = await c.req.json();

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

  await prisma.merchantStaff.delete({ where: { id: staffId } });
  return c.json({ success: true });
});

// ============================================
// Student Management
// ============================================
merchant.get('/:id/students', async (c) => {
  const id = c.req.param('id');
  const students = await prisma.merchantStudent.findMany({
    where: { merchantId: id },
    include: { user: true, course: true },
  });
  return c.json(students);
});

merchant.post('/:id/students', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const body = await c.req.json();

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
  const courses = await prisma.merchantCourse.findMany({
    where: { merchantId: id },
    include: { _count: { select: { students: true } } },
  });
  return c.json(courses);
});

merchant.post('/:id/courses', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const body = await c.req.json();

  const course = await prisma.merchantCourse.create({
    data: { merchantId: id, ...body },
  });

  return c.json(course, 201);
});

// ============================================
// Attendance
// ============================================
merchant.post('/:id/attendance', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const body = await c.req.json();

  const attendance = await prisma.merchantAttendance.upsert({
    where: { merchantId_studentId_date: { merchantId: id, studentId: body.studentId, date: new Date(body.date) } },
    update: { status: body.status, checkIn: body.checkIn, checkOut: body.checkOut, notes: body.notes },
    create: { merchantId: id, ...body, date: new Date(body.date) },
  });

  return c.json(attendance);
});

merchant.get('/:id/attendance', async (c) => {
  const id = c.req.param('id');
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
merchant.post('/:id/exams', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const body = await c.req.json();

  const exam = await prisma.merchantExam.create({
    data: { merchantId: id, ...body, examDate: new Date(body.examDate) },
  });

  return c.json(exam, 201);
});

merchant.get('/:id/exams', async (c) => {
  const id = c.req.param('id');
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
  const announcements = await prisma.merchantAnnouncement.findMany({
    where: { merchantId: id },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  });

  return c.json(announcements);
});

merchant.post('/:id/announcements', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const body = await c.req.json();

  const announcement = await prisma.merchantAnnouncement.create({
    data: { merchantId: id, ...body },
  });

  return c.json(announcement, 201);
});

// ============================================
// Fees
// ============================================
merchant.post('/:id/fees', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const body = await c.req.json();

  const fee = await prisma.merchantFee.create({
    data: { merchantId: id, ...body, dueDate: new Date(body.dueDate) },
  });

  return c.json(fee, 201);
});

merchant.get('/:id/fees', async (c) => {
  const id = c.req.param('id');
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
  const routine = await prisma.merchantRoutine.findMany({
    where: { merchantId: id, isActive: true },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  return c.json(routine);
});

merchant.post('/:id/routine', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const body = await c.req.json();

  const routine = await prisma.merchantRoutine.create({
    data: { merchantId: id, ...body },
  });

  return c.json(routine, 201);
});

export default merchant;
