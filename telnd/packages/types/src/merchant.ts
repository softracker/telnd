export interface Merchant {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  type: MerchantType;
  description?: string;
  logo?: string;
  coverImage?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  lat?: number;
  lng?: number;
  rating?: number;
  totalReviews: number;
  isVerified: boolean;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type MerchantType = 'COACHING_CENTER' | 'SCHOOL' | 'COLLEGE' | 'UNIVERSITY' | 'TRAINING_INSTITUTE' | 'OTHER';

export interface MerchantStaff {
  id: string;
  merchantId: string;
  userId: string;
  role: StaffRole;
  isApproved: boolean;
  joinedAt: Date;
  leftAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type StaffRole = 'OWNER' | 'ADMIN' | 'TEACHER' | 'ACCOUNTANT' | 'SUPPORT' | 'CUSTOM';

export interface MerchantStudent {
  id: string;
  merchantId: string;
  userId: string;
  courseId?: string;
  enrolledAt: Date;
  leftAt?: Date;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantCourse {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  duration?: number;
  fee?: number;
  currency: string;
  maxStudents?: number;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantAttendance {
  id: string;
  merchantId: string;
  studentId: string;
  date: Date;
  status: AttendanceStatus;
  checkIn?: Date;
  checkOut?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface MerchantExam {
  id: string;
  merchantId: string;
  studentId: string;
  courseId?: string;
  title: string;
  description?: string;
  totalMarks: number;
  obtainedMarks?: number;
  percentage?: number;
  grade?: string;
  examDate: Date;
  status: string;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantAnnouncement {
  id: string;
  merchantId: string;
  title: string;
  content: string;
  type: string;
  target: string;
  isPinned: boolean;
  attachments?: Record<string, unknown>[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantFee {
  id: string;
  merchantId: string;
  studentId: string;
  title: string;
  amount: number;
  currency: string;
  dueDate: Date;
  paidDate?: Date;
  status: FeeStatus;
  paymentId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type FeeStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface MerchantRoutine {
  id: string;
  merchantId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacher?: string;
  room?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
