import { z } from 'zod';
import { emailSchema } from './common';

export const adminRoleSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  // Flat list of "resource.action" grants (e.g. "users.edit"), or "*" for
  // super-admins who bypass every permission check.
  permissions: z
    .array(z.string().regex(/^(\*|[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+)$/, 'Invalid permission'))
    .max(300)
    .default([]),
});

// No password is ever accepted from the client: a temporary one is generated
// server-side and emailed to the confirmed address (see POST /admin/admins).
export const createAdminSchema = z
  .object({
    email: emailSchema,
    // Guards against a typo'd address — the credentials only ever go to an
    // address the creator confirmed twice.
    confirmEmail: emailSchema,
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    roleId: z.string().min(1),
  })
  .refine((d) => d.confirmEmail === d.email, {
    message: 'Email addresses do not match',
    path: ['confirmEmail'],
  });

export const updateAdminSchema = z
  .object({
    email: emailSchema.optional(),
    confirmEmail: emailSchema.optional(),
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    roleId: z.string().min(1).optional(),
  })
  .refine((d) => d.email === undefined || d.confirmEmail === d.email, {
    message: 'Email addresses do not match',
    path: ['confirmEmail'],
  });

export const updateAccountSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: emailSchema.optional(),
  // Profile photo: a public URL minted by POST /upload/image (the bytes live
  // in R2), or null/"" to clear it. Raw file data is never accepted here.
  avatar: z.string().max(1000).nullable().optional(),
});

export const contentPageSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lowercase letters, numbers and dashes only'),
  // HTML produced by the admin rich-text editor.
  content: z.string().max(500000).default(''),
  isPublished: z.boolean().default(false),
});

export const adminActionSchema = z.object({
  action: z.string().min(1).max(100),
  targetType: z.string().min(1).max(50),
  targetId: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

export const featureFlagSchema = z.object({
  key: z.string().min(2).max(100).regex(/^[a-z0-9_-]+$/),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  isEnabled: z.boolean().default(false),
  rolloutPercentage: z.number().min(0).max(100).default(100),
  allowedRoles: z.array(z.string()).default([]),
});

export const maintenanceModeSchema = z.object({
  isActive: z.boolean(),
  message: z.string().max(1000).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
});

export const reportSchema = z.object({
  targetType: z.enum(['user', 'job', 'message', 'content']),
  targetId: z.string().min(1),
  reason: z.string().min(5).max(200),
  details: z.string().max(2000).optional(),
});

export const adminDashboardQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']).default('month'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const suspendUserSchema = z.object({
  reason: z.string().min(1).max(1000).optional(),
});

export type AdminRoleInput = z.infer<typeof adminRoleSchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type ContentPageInput = z.infer<typeof contentPageSchema>;
export type AdminActionInput = z.infer<typeof adminActionSchema>;
export type FeatureFlagInput = z.infer<typeof featureFlagSchema>;
export type MaintenanceModeInput = z.infer<typeof maintenanceModeSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type SuspendUserInput = z.infer<typeof suspendUserSchema>;
