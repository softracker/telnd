import { z } from 'zod';

export const smtpSettingsSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().optional(),
  pass: z.string().optional(),
  from: z.string().email('Invalid from email address'),
});

export const testSmtpSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().optional(),
  pass: z.string().optional(),
  from: z.string().email(),
});

export const userPreferencesSchema = z.object({
  language: z.enum(['en', 'bn']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
});

export type SmtpSettingsInput = z.infer<typeof smtpSettingsSchema>;
export type TestSmtpInput = z.infer<typeof testSmtpSchema>;
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;
