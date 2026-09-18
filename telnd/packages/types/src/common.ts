export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export type UserRole = 'candidate' | 'employer' | 'admin' | 'creator' | 'freelancer' | 'agency';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface DateRange {
  start: string;
  end: string | null;
}
