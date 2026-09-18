import { z } from 'zod';

export const createCountrySchema = z.object({
  code: z.string().length(2).toUpperCase(),
  name: z.string().min(1).max(100),
  currency: z.string().length(3),
  currencySymbol: z.string().max(10),
  phoneCode: z.string().max(10),
  phoneFormat: z.string().max(50),
  dateFormat: z.string().max(20).default('DD/MM/YYYY'),
  timeZone: z.string().max(50),
});

export const updateCountrySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isEnabled: z.boolean().optional(),
  currency: z.string().length(3).optional(),
  currencySymbol: z.string().max(10).optional(),
  phoneCode: z.string().max(10).optional(),
  phoneFormat: z.string().max(50).optional(),
  dateFormat: z.string().max(20).optional(),
  timeZone: z.string().max(50).optional(),
});

export const createLanguageSchema = z.object({
  code: z.string().min(2).max(5),
  name: z.string().min(1).max(100),
  nativeName: z.string().min(1).max(100),
});

export const addCountryLanguageSchema = z.object({
  countryId: z.string().uuid(),
  languageId: z.string().uuid(),
  isDefault: z.boolean().default(false),
});

export const createTranslationSchema = z.object({
  languageId: z.string().uuid(),
  key: z.string().min(1).max(255),
  value: z.string().min(1),
  context: z.string().max(255).optional(),
});

export const bulkCreateTranslationsSchema = z.object({
  languageId: z.string().uuid(),
  translations: z.array(z.object({
    key: z.string().min(1).max(255),
    value: z.string().min(1),
    context: z.string().max(255).optional(),
  })).min(1).max(1000),
});

export type CreateCountryInput = z.infer<typeof createCountrySchema>;
export type UpdateCountryInput = z.infer<typeof updateCountrySchema>;
export type CreateLanguageInput = z.infer<typeof createLanguageSchema>;
export type AddCountryLanguageInput = z.infer<typeof addCountryLanguageSchema>;
export type CreateTranslationInput = z.infer<typeof createTranslationSchema>;
export type BulkCreateTranslationsInput = z.infer<typeof bulkCreateTranslationsSchema>;
