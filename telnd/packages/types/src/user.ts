import type { Coordinates, VerificationStatus, UserRole } from './common';

export interface User {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  firstName: string;
  lastName: string;
  avatar: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isIdentityVerified: boolean;
  preferredLanguage: string;
  countryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateProfile {
  id: string;
  userId: string;
  aboutMe: string | null;
  currentPosition: string | null;
  desiredPosition: string | null;
  careerLevel: CareerLevel | null;
  experienceYears: number | null;
  industries: string[];
  employmentType: CandidateEmploymentType | null;
  expectedSalary: number | null;
  expectedSalaryCurrency: string;
  preferredLocations: string[];
  workPreference: WorkPreference | null;
  availability: string | null;
  noticePeriod: string | null;
  location: string | null;
  coordinates: Coordinates | null;
  nationality: string | null;
  languages: string[];
  careerScore: number;
  verificationStatus: ProfileVerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileVerificationStatus {
  phone: VerificationStatus;
  email: VerificationStatus;
  identity: VerificationStatus;
  education: VerificationStatus;
  experience: VerificationStatus;
  skills: VerificationStatus;
}

export type CareerLevel = 
  | 'entry'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'manager'
  | 'director'
  | 'vp'
  | 'c_level';

export type CandidateEmploymentType = 
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'internship'
  | 'freelance';

export type WorkPreference = 'remote' | 'hybrid' | 'onsite';

export interface Education {
  id: string;
  profileId: string;
  institution: string;
  degree: string;
  major: string;
  graduationYear: number;
  gpa: number | null;
  description: string | null;
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  yearsOfExperience: number | null;
}

export type SkillCategory = 'technical' | 'soft' | 'industry';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Experience {
  id: string;
  profileId: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  achievements: string[];
}

export interface Portfolio {
  id: string;
  profileId: string;
  title: string;
  description: string | null;
  url: string;
  type: PortfolioType;
}

export type PortfolioType = 'project' | 'github' | 'linkedin' | 'website' | 'other';
