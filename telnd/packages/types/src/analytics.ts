export interface AnalyticsDashboard {
  overview: AnalyticsOverview;
  users: UserAnalytics;
  jobs: JobAnalytics;
  revenue: RevenueAnalytics;
  engagement: EngagementAnalytics;
}

export interface AnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalJobs: number;
  activeJobs: number;
  totalMerchants: number;
  totalCourses: number;
  revenue: number;
  growth: GrowthMetrics;
}

export interface GrowthMetrics {
  users: number;
  jobs: number;
  revenue: number;
  merchants: number;
}

export interface UserAnalytics {
  total: number;
  active: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  byRole: RoleDistribution[];
  byLocation: LocationDistribution[];
  retentionRate: number;
  averageSessionDuration: number;
}

export interface RoleDistribution {
  role: string;
  count: number;
  percentage: number;
}

export interface LocationDistribution {
  city: string;
  count: number;
  percentage: number;
}

export interface JobAnalytics {
  total: number;
  active: number;
  newToday: number;
  applications: number;
  hireRate: number;
  averageTimeToHire: number;
  byCategory: CategoryDistribution[];
  byType: TypeDistribution[];
}

export interface CategoryDistribution {
  category: string;
  count: number;
  percentage: number;
}

export interface TypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

export interface RevenueAnalytics {
  total: number;
  thisMonth: number;
  lastMonth: number;
  growth: number;
  bySource: SourceDistribution[];
  averagePerUser: number;
}

export interface SourceDistribution {
  source: string;
  amount: number;
  percentage: number;
}

export interface EngagementAnalytics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averagePostsPerUser: number;
  averageApplicationsPerUser: number;
  topFeatures: FeatureUsage[];
}

export interface FeatureUsage {
  feature: string;
  usageCount: number;
  uniqueUsers: number;
  percentage: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

export interface AnalyticsTimeRange {
  start: Date;
  end: Date;
  period: 'day' | 'week' | 'month' | 'year';
}

export interface UserInsights {
  profileViews: number;
  searchAppearances: number;
  applicationCount: number;
  interviewCount: number;
  hireRate: number;
  skillEndorsements: number;
  recommendationScore: number;
}

export interface EmployerInsights {
  jobPostings: number;
  totalApplications: number;
  averageApplicationsPerJob: number;
  hireConversionRate: number;
  averageTimeToHire: number;
  costPerHire: number;
  candidateQualityScore: number;
}

export interface TutorInsights {
  totalHours: number;
  totalEarnings: number;
  averageRating: number;
  studentCount: number;
  classAttendanceRate: number;
  popularSubjects: string[];
  repeatStudentRate: number;
}
