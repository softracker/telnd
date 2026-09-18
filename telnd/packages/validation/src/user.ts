import { z } from 'zod';
import { phoneSchema } from './common';

export const updateProfileSchema = z.object({
  aboutMe: z.string().max(2000).optional(),
  currentPosition: z.string().max(200).optional(),
  desiredPosition: z.string().max(200).optional(),
  careerLevel: z.enum(['entry', 'junior', 'mid', 'senior', 'lead', 'manager', 'director', 'vp', 'c_level']).optional(),
  experienceYears: z.number().int().min(0).max(50).optional(),
  industries: z.array(z.string()).optional(),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'internship', 'freelance']).optional(),
  expectedSalary: z.number().int().positive().optional(),
  expectedSalaryCurrency: z.string().default('BDT'),
  preferredLocations: z.array(z.string()).optional(),
  workPreference: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  availability: z.string().max(200).optional(),
  noticePeriod: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  nationality: z.string().max(100).optional(),
  languages: z.array(z.string()).optional(),
});

export const addEducationSchema = z.object({
  institution: z.string().min(1).max(200),
  degree: z.string().min(1).max(100),
  major: z.string().min(1).max(100),
  graduationYear: z.number().int().min(1950).max(2050),
  gpa: z.number().min(0).max(4).optional(),
  description: z.string().max(1000).optional(),
});

export const addExperienceSchema = z.object({
  company: z.string().min(1).max(200),
  position: z.string().min(1).max(200),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().max(2000).optional(),
  achievements: z.array(z.string()).default([]),
});

export const addSkillSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(['technical', 'soft', 'industry']),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  yearsOfExperience: z.number().int().min(0).max(50).optional(),
});

export const addPortfolioSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  url: z.string().url(),
  type: z.enum(['project', 'github', 'linkedin', 'website', 'other']),
});

export const updateCompanySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  website: z.string().url().optional(),
  industry: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddEducationInput = z.infer<typeof addEducationSchema>;
export type AddExperienceInput = z.infer<typeof addExperienceSchema>;
export type AddSkillInput = z.infer<typeof addSkillSchema>;
export type AddPortfolioInput = z.infer<typeof addPortfolioSchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
