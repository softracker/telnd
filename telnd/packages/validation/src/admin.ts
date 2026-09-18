import { z } from 'zod';

export const adminRoleSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  permissions: z.record(z.unknown()).default({}),
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

export type AdminRoleInput = z.infer<typeof adminRoleSchema>;
export type AdminActionInput = z.infer<typeof adminActionSchema>;
export type FeatureFlagInput = z.infer<typeof featureFlagSchema>;
export type MaintenanceModeInput = z.infer<typeof maintenanceModeSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
