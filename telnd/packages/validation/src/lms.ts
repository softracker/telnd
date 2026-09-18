import { z } from 'zod';

export const lmsCourseSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(3).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).optional(),
  price: z.number().min(0).optional(),
  currency: z.string().length(3).default('BDT'),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).default([]),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).default('BEGINNER'),
  language: z.string().length(2).default('en'),
  merchantId: z.string().optional(),
});

export const lmsModuleSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  order: z.number().min(0),
});

export const lmsLessonSchema = z.object({
  moduleId: z.string().min(1),
  title: z.string().min(2).max(200),
  type: z.enum(['VIDEO', 'TEXT', 'QUIZ', 'ASSIGNMENT', 'LIVE_CLASS', 'DOCUMENT']),
  content: z.string().max(50000).optional(),
  videoUrl: z.string().url().optional(),
  duration: z.number().min(0).optional(), // minutes
  order: z.number().min(0),
  isPreview: z.boolean().default(false),
});

export const lmsQuizSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  questions: z.array(z.object({
    type: z.enum(['multiple_choice', 'true_false', 'short_answer']),
    question: z.string().min(5).max(1000),
    options: z.array(z.string().max(200)).optional(),
    correctAnswer: z.union([z.string(), z.array(z.string())]),
    points: z.number().min(1).default(1),
  })).min(1),
  timeLimit: z.number().min(1).optional(), // minutes
  passingScore: z.number().min(0).max(100).default(60),
  maxAttempts: z.number().min(1).default(3),
});

export const lmsAssignmentSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  dueDate: z.string().datetime().optional(),
  maxScore: z.number().min(1).default(100),
  allowLate: z.boolean().default(false),
});

export const lmsDiscussionSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(10).max(10000),
  parentId: z.string().optional(),
});

export const lmsEnrollSchema = z.object({
  courseId: z.string().min(1),
});

export const lmsProgressSchema = z.object({
  lessonId: z.string().min(1),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
  score: z.number().min(0).optional(),
  timeSpent: z.number().min(0).optional(), // seconds
});

export type LMSCourseInput = z.infer<typeof lmsCourseSchema>;
export type LMSModuleInput = z.infer<typeof lmsModuleSchema>;
export type LMSLessonInput = z.infer<typeof lmsLessonSchema>;
export type LMSQuizInput = z.infer<typeof lmsQuizSchema>;
export type LMSAssignmentInput = z.infer<typeof lmsAssignmentSchema>;
export type LMSDiscussionInput = z.infer<typeof lmsDiscussionSchema>;
export type LMSEnrollInput = z.infer<typeof lmsEnrollSchema>;
export type LMSProgressInput = z.infer<typeof lmsProgressSchema>;
