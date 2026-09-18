import type { Coordinates, DateRange, PaginatedResponse, PaginationParams } from './common';

export interface Job {
  id: string;
  companyId: string;
  title: string;
  department: string | null;
  description: string;
  responsibilities: string[];
  requirements: string[];
  preferredQualifications: string[];
  benefits: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  employmentType: EmploymentType;
  workplaceType: WorkplaceType;
  location: string;
  coordinates: Coordinates | null;
  vacancies: number;
  deadline: string | null;
  visibility: JobVisibility;
  status: JobStatus;
  applicationConfig: ApplicationConfig;
  createdAt: string;
  updatedAt: string;
}

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship';
export type WorkplaceType = 'remote' | 'hybrid' | 'onsite';
export type JobVisibility = 'normal' | 'featured' | 'urgent' | 'sponsored';
export type JobStatus = 'draft' | 'published' | 'closed' | 'archived';

export interface ApplicationConfig {
  allowExternalCV: boolean;
  requireCV: boolean;
  requirePortfolio: boolean;
  customQuestions: CustomQuestion[];
  assessmentId: string | null;
  mandatoryRequirements: MandatoryRequirement[];
}

export interface CustomQuestion {
  id: string;
  question: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'file';
  required: boolean;
  options?: string[];
}

export interface MandatoryRequirement {
  id: string;
  type: 'university' | 'degree' | 'major' | 'experience' | 'certification' | 'other';
  value: string;
  strict: boolean;
}

export interface JobMatchScore {
  jobId: string;
  overall: number;
  breakdown: {
    skills: number;
    experience: number;
    education: number;
    location: number;
    salary: number;
  };
  isEligible: boolean;
  ineligibleReasons: string[];
}

export interface JobSearchFilters {
  query?: string;
  location?: string;
  distance?: number;
  salaryMin?: number;
  salaryMax?: number;
  experience?: string;
  education?: string;
  industry?: string;
  employmentType?: EmploymentType[];
  workplaceType?: WorkplaceType[];
  companyId?: string;
  postedAfter?: string;
  remote?: boolean;
}

export type JobSearchParams = JobSearchFilters & PaginationParams;

export interface JobSearchResult extends PaginatedResponse<Job> {
  filters: JobSearchFilters;
}
