import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const phoneSchema = z.string().regex(
  /^\+?[1-9]\d{6,14}$/,
  'Invalid phone number',
);

export const emailSchema = z.string().email('Invalid email address');
