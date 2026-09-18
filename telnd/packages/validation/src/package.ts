import { z } from 'zod';

export const packageSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
  type: z.enum(['USER', 'EMPLOYER', 'MERCHANT', 'TUTOR']),
  tier: z.enum(['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE', 'CUSTOM']).default('FREE'),
  price: z.number().min(0),
  currency: z.string().length(3).default('BDT'),
  billingCycle: z.enum(['ONE_TIME', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
  features: z.record(z.unknown()).default({}),
  limits: z.record(z.unknown()).default({}),
  isActive: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  sortOrder: z.number().default(0),
  trialDays: z.number().min(0).max(365).optional(),
});

export const subscriptionSchema = z.object({
  packageId: z.string().min(1),
  autoRenew: z.boolean().default(true),
});

export const couponSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Z0-9_-]+$/),
  description: z.string().max(500).optional(),
  type: z.enum(['PERCENTAGE', 'FIXED', 'FREE_TRIAL', 'UPGRADE', 'REFERRAL']),
  value: z.number().min(0),
  currency: z.string().length(3).optional(),
  minPurchase: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).optional(),
  usageLimit: z.number().min(1).optional(),
  perUserLimit: z.number().min(1).default(1),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  applicablePackages: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const couponApplySchema = z.object({
  code: z.string().min(3).max(50),
  packageId: z.string().min(1),
  amount: z.number().min(0),
});

export const walletTopUpSchema = z.object({
  amount: z.number().min(10).max(100000),
  currency: z.string().length(3).default('BDT'),
  gateway: z.enum(['SSLCOMMERZ', 'BKASH', 'NAGAD', 'ROCKET']),
});

export const walletTransferSchema = z.object({
  toUserId: z.string().min(1),
  amount: z.number().min(1).max(100000),
  description: z.string().max(200).optional(),
});

export type PackageInput = z.infer<typeof packageSchema>;
export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
export type CouponApplyInput = z.infer<typeof couponApplySchema>;
export type WalletTopUpInput = z.infer<typeof walletTopUpSchema>;
export type WalletTransferInput = z.infer<typeof walletTransferSchema>;
