import { z } from 'zod';

export const merchantSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/),
  type: z.enum(['COACHING_CENTER', 'SCHOOL', 'COLLEGE', 'UNIVERSITY', 'TRAINING_INSTITUTE', 'OTHER']),
  description: z.string().max(5000).optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).default('Bangladesh'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const merchantStaffSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['OWNER', 'ADMIN', 'TEACHER', 'ACCOUNTANT', 'SUPPORT', 'CUSTOM']),
});

export const merchantCourseSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  duration: z.number().min(1).optional(), // weeks
  fee: z.number().min(0).optional(),
  currency: z.string().length(3).default('BDT'),
  maxStudents: z.number().min(1).optional(),
});

export const merchantAttendanceSchema = z.object({
  studentId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export const merchantExamSchema = z.object({
  studentId: z.string().min(1),
  courseId: z.string().optional(),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  totalMarks: z.number().min(1),
  obtainedMarks: z.number().min(0).optional(),
  examDate: z.string().datetime(),
  feedback: z.string().max(2000).optional(),
});

export const merchantAnnouncementSchema = z.object({
  title: z.string().min(2).max(200),
  content: z.string().min(10).max(5000),
  type: z.string().default('general'),
  target: z.string().default('all'),
  isPinned: z.boolean().default(false),
});

export const merchantFeeSchema = z.object({
  studentId: z.string().min(1),
  title: z.string().min(2).max(200),
  amount: z.number().min(0),
  currency: z.string().length(3).default('BDT'),
  dueDate: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

export const merchantRoutineSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  subject: z.string().min(1).max(100),
  teacher: z.string().max(100).optional(),
  room: z.string().max(50).optional(),
});

export const merchantStudentSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1).optional(),
});

export const couponValidateSchema = z.object({
  code: z.string().min(3).max(50),
  packageId: z.string().min(1).optional(),
});

export type MerchantInput = z.infer<typeof merchantSchema>;
export type MerchantStaffInput = z.infer<typeof merchantStaffSchema>;
export type MerchantCourseInput = z.infer<typeof merchantCourseSchema>;
export type MerchantAttendanceInput = z.infer<typeof merchantAttendanceSchema>;
export type MerchantExamInput = z.infer<typeof merchantExamSchema>;
export type MerchantAnnouncementInput = z.infer<typeof merchantAnnouncementSchema>;
export type MerchantFeeInput = z.infer<typeof merchantFeeSchema>;
export type MerchantRoutineInput = z.infer<typeof merchantRoutineSchema>;
export type MerchantStudentInput = z.infer<typeof merchantStudentSchema>;
export type CouponValidateInput = z.infer<typeof couponValidateSchema>;
