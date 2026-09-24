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

export const generalSettingsSchema = z.object({
  favicon: z.string().url().or(z.string().length(0)).optional(),
  primaryLogoLight: z.string().url().or(z.string().length(0)).optional(),
  primaryLogoDark: z.string().url().or(z.string().length(0)).optional(),
  secondaryLogoLight: z.string().url().or(z.string().length(0)).optional(),
  secondaryLogoDark: z.string().url().or(z.string().length(0)).optional(),
  ogImage: z.string().url().or(z.string().length(0)).optional(),
  siteUrl: z.string().url().or(z.string().length(0)).optional(),
  applicationName: z.string().min(1).max(100).optional(),
  siteDescription: z.string().max(500).optional(),
  metaKeywords: z.string().max(500).optional(),
  metaDescription: z.string().max(160).optional(),
  contactEmail: z.string().email().or(z.string().length(0)).optional(),
  supportEmail: z.string().email().or(z.string().length(0)).optional(),
  copyrightText: z.string().max(200).optional(),
});

export const r2SettingsSchema = z.object({
  enabled: z.boolean(),
  endpoint: z.string().url().optional(),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  bucket: z.string().min(1).optional(),
  publicUrl: z.string().url().optional(),
});

export type SmtpSettingsInput = z.infer<typeof smtpSettingsSchema>;
export type TestSmtpInput = z.infer<typeof testSmtpSchema>;
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;
export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;
export type R2SettingsInput = z.infer<typeof r2SettingsSchema>;
