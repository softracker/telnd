export interface AdminRole {
  id: string;
  name: string;
  description?: string;
  permissions: AdminPermissions;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminPermissions {
  users?: PermissionSet;
  jobs?: PermissionSet;
  companies?: PermissionSet;
  merchants?: PermissionSet;
  courses?: PermissionSet;
  reports?: PermissionSet;
  support?: PermissionSet;
  analytics?: PermissionSet;
  settings?: PermissionSet;
  packages?: PermissionSet;
  coupons?: PermissionSet;
  features?: PermissionSet;
}

export interface PermissionSet {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve?: boolean;
  suspend?: boolean;
}

export interface AdminUser {
  id: string;
  userId: string;
  roleId: string;
  role?: AdminRole;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminAction {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  allowedRoles: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceMode {
  id: string;
  isActive: boolean;
  message?: string;
  startTime?: Date;
  endTime?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalJobs: number;
  activeJobs: number;
  totalCompanies: number;
  totalMerchants: number;
  totalRevenue: number;
  pendingReports: number;
  openTickets: number;
}

export interface AdminAnalytics {
  userGrowth: { date: string; value: number }[];
  jobPostings: { date: string; value: number }[];
  revenue: { date: string; value: number }[];
  topCategories: CategoryStat[];
  geographicDistribution: GeoStat[];
}

export interface CategoryStat {
  category: string;
  count: number;
  percentage: number;
}

export interface GeoStat {
  city: string;
  count: number;
  percentage: number;
}
