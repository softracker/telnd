export interface Package {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: PackageType;
  tier: PackageTier;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  features: PackageFeatures;
  limits: PackageLimits;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  trialDays?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type PackageType = 'USER' | 'EMPLOYER' | 'MERCHANT' | 'TUTOR';
export type PackageTier = 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE' | 'CUSTOM';
export type BillingCycle = 'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface PackageFeatures {
  maxJobs?: number;
  maxApplications?: number;
  maxTutorHours?: number;
  maxCourses?: number;
  maxStudents?: number;
  maxStorage?: number;
  analytics?: boolean;
  prioritySupport?: boolean;
  customBranding?: boolean;
  apiAccess?: boolean;
  exportData?: boolean;
  advancedSearch?: boolean;
  featuredListing?: boolean;
  videoInterview?: boolean;
  aiMatching?: boolean;
}

export interface PackageLimits {
  dailyRequests?: number;
  monthlyRequests?: number;
  concurrentConnections?: number;
  teamMembers?: number;
}

export interface UserSubscription {
  id: string;
  userId: string;
  packageId: string;
  package?: Package;
  status: SubscriptionStatus;
  startDate: Date;
  endDate?: Date;
  trialEndsAt?: Date;
  autoRenew: boolean;
  cancelAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED' | 'TRIAL';

export interface Invoice {
  id: string;
  userId: string;
  packageId?: string;
  subscriptionId?: string;
  amount: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: Date;
  paidDate?: Date;
  paymentId?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface PaymentTransaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gateway: PaymentGateway;
  gatewayId?: string;
  gatewayResponse?: Record<string, unknown>;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type PaymentGateway = 'SSLCOMMERZ' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'STRIPE' | 'WALLET';

export interface PaymentRefund {
  id: string;
  paymentId: string;
  amount: number;
  reason?: string;
  status: RefundStatus;
  gatewayId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type RefundStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  amount: number;
  type: WalletTxnType;
  balance: number;
  reference?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export type WalletTxnType = 'DEBIT' | 'CREDIT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'REFUND' | 'WITHDRAWAL';

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  type: CouponType;
  value: number;
  currency?: string;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  perUserLimit?: number;
  validFrom: Date;
  validUntil: Date;
  applicablePackages: string[];
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type CouponType = 'PERCENTAGE' | 'FIXED' | 'FREE_TRIAL' | 'UPGRADE' | 'REFERRAL';

export interface CouponUsage {
  id: string;
  couponId: string;
  userId: string;
  orderId?: string;
  amount?: number;
  usedAt: Date;
}
