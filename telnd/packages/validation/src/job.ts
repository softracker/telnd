import { z } from 'zod';
import { paginationSchema, coordinatesSchema } from './common';

export const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  department: z.string().max(100).optional(),
  description: z.string().min(10),
  responsibilities: z.array(z.string()).min(1),
  requirements: z.array(z.string()).min(1),
  preferredQualifications: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  salaryCurrency: z.string().default('BDT'),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'internship']),
  workplaceType: z.enum(['remote', 'hybrid', 'onsite']),
  location: z.string().min(1),
  coordinates: coordinatesSchema.optional(),
  vacancies: z.number().int().positive().default(1),
  deadline: z.string().datetime().optional(),
  visibility: z.enum(['normal', 'featured', 'urgent', 'sponsored']).default('normal'),
});

export const jobSearchSchema = z.object({
  query: z.string().optional(),
  location: z.string().optional(),
  distance: z.number().int().positive().optional(),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  experience: z.string().optional(),
  education: z.string().optional(),
  industry: z.string().optional(),
  employmentType: z.array(z.enum(['full_time', 'part_time', 'contract', 'internship'])).optional(),
  workplaceType: z.array(z.enum(['remote', 'hybrid', 'onsite'])).optional(),
  companyId: z.string().uuid().optional(),
  postedAfter: z.string().datetime().optional(),
  remote: z.boolean().optional(),
  ...paginationSchema.shape,
});

export const applicationSchema = z.object({
  jobId: z.string().uuid(),
  cvUrl: z.string().url().optional(),
  coverLetter: z.string().max(5000).optional(),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.string(),
  })).default([]),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type JobSearchInput = z.infer<typeof jobSearchSchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;
