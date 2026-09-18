import type { Coordinates, VerificationStatus } from './common';

export interface Company {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  coordinates: Coordinates | null;
  size: CompanySize | null;
  logo: string | null;
  coverImage: string | null;
  isVerified: boolean;
  trustScore: number;
  responseRate: number | null;
  hiringActivity: HiringActivity;
  createdAt: string;
  updatedAt: string;
}

export type CompanySize = 
  | '1-10'
  | '11-50'
  | '51-200'
  | '201-500'
  | '501-1000'
  | '1000+';

export interface HiringActivity {
  activeJobs: number;
  totalHires: number;
  avgTimeToHire: number | null;
}

export interface CompanyTeamMember {
  id: string;
  companyId: string;
  userId: string;
  role: CompanyRole;
  invitedAt: string;
  acceptedAt: string | null;
}

export type CompanyRole = 'owner' | 'admin' | 'recruiter' | 'viewer';
