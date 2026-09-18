import { z } from 'zod';

export const mapPinSchema = z.object({
  targetType: z.enum(['job', 'merchant', 'tutor', 'creator', 'company']),
  targetId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().max(500).optional(),
  area: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).default('Bangladesh'),
  isExact: z.boolean().default(true),
});

export const mapSearchSchema = z.object({
  query: z.string().min(1).max(200).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  zoom: z.number().min(1).max(20).optional(),
  type: z.array(z.enum(['job', 'merchant', 'tutor', 'creator', 'company'])).optional(),
  city: z.string().max(100).optional(),
  area: z.string().max(100).optional(),
  radius: z.number().min(0.1).max(100).optional(), // km
  category: z.string().max(100).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const geocodeSchema = z.object({
  address: z.string().min(1).max(500),
  language: z.string().length(2).default('en'),
});

export const reverseGeocodeSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  language: z.string().length(2).default('en'),
});

export const mapBoundsSchema = z.object({
  north: z.number().min(-90).max(90),
  south: z.number().min(-90).max(90),
  east: z.number().min(-180).max(180),
  west: z.number().min(-180).max(180),
});

export type MapPinInput = z.infer<typeof mapPinSchema>;
export type MapSearchInput = z.infer<typeof mapSearchSchema>;
export type GeocodeInput = z.infer<typeof geocodeSchema>;
export type ReverseGeocodeInput = z.infer<typeof reverseGeocodeSchema>;
