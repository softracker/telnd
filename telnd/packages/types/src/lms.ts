export interface LMSCourse {
  id: string;
  instructorId: string;
  merchantId?: string;
  title: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  price?: number;
  currency: string;
  isPublished: boolean;
  isFeatured: boolean;
  category?: string;
  tags: string[];
  level: CourseLevel;
  language: string;
  duration?: number;
  totalStudents: number;
  rating?: number;
  totalReviews: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export interface LMSModule {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  isPublished: boolean;
  lessons?: LMSLesson[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LMSLesson {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  type: LessonType;
  content?: string;
  videoUrl?: string;
  duration?: number;
  order: number;
  isPreview: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type LessonType = 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT' | 'LIVE_CLASS' | 'DOCUMENT';

export interface LMSEnrollment {
  id: string;
  courseId: string;
  userId: string;
  status: EnrollmentStatus;
  progress: number;
  completedAt?: Date;
  certificateUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'DROPPED' | 'EXPIRED';

export interface LMSProgress {
  id: string;
  enrollmentId: string;
  lessonId: string;
  userId: string;
  status: ProgressStatus;
  score?: number;
  timeSpent?: number;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface LMSQuiz {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  timeLimit?: number;
  passingScore: number;
  maxAttempts: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  points: number;
}

export interface LMSAssignment {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  maxScore: number;
  allowLate: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LMSDiscussion {
  id: string;
  courseId: string;
  userId: string;
  title: string;
  content: string;
  parentId?: string;
  upvotes: number;
  downvotes: number;
  isAnswer: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LMSCertificate {
  id: string;
  enrollmentId: string;
  userId: string;
  courseId: string;
  certificateUrl: string;
  issuedAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}
