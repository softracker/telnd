export interface TutorProfile {
  id: string;
  userId: string;
  bio?: string;
  subjects: string[];
  hourlyRate?: number;
  currency: string;
  experience: number;
  education?: Record<string, unknown>;
  certifications?: Record<string, unknown>;
  availability?: Record<string, unknown>;
  teachingStyle?: string;
  maxStudents: number;
  currentStudents: number;
  rating?: number;
  totalReviews: number;
  totalHours: number;
  isVerified: boolean;
  isAvailable: boolean;
  location?: Record<string, unknown>;
  lat?: number;
  lng?: number;
  address?: string;
  area?: string;
  city?: string;
  country: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TutorBooking {
  id: string;
  studentId: string;
  tutorId: string;
  subject: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  duration: number;
  rate?: number;
  currency: string;
  status: TutorBookingStatus;
  paymentId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TutorBookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';

export interface TutorClass {
  id: string;
  bookingId: string;
  tutorId: string;
  studentId: string;
  subject: string;
  startTime: Date;
  endTime?: Date;
  status: string;
  notes?: string;
  rating?: number;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TutorExam {
  id: string;
  bookingId: string;
  tutorId: string;
  studentId: string;
  title: string;
  type: string;
  questions: Record<string, unknown>;
  totalMarks: number;
  timeLimit?: number;
  startTime?: Date;
  endTime?: Date;
  score?: number;
  percentage?: number;
  status: string;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TutorReport {
  id: string;
  bookingId: string;
  tutorId: string;
  studentId: string;
  guardianId?: string;
  title: string;
  content: string;
  type: string;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}
