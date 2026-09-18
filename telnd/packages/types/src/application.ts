export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  status: ApplicationStatus;
  cvUrl: string | null;
  coverLetter: string | null;
  answers: ApplicationAnswer[];
  assessmentScore: number | null;
  matchScore: number | null;
  appliedAt: string;
  viewedAt: string | null;
  shortlistedAt: string | null;
  assessmentCompletedAt: string | null;
  interviewScheduledAt: string | null;
  offerSentAt: string | null;
  hiredAt: string | null;
  updatedAt: string;
}

export type ApplicationStatus = 
  | 'applied'
  | 'viewed'
  | 'shortlisted'
  | 'assessment'
  | 'interview'
  | 'final_interview'
  | 'offer'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export interface ApplicationAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface Invitation {
  id: string;
  employerId: string;
  candidateId: string;
  jobId: string | null;
  type: InvitationType;
  message: string | null;
  status: InvitationStatus;
  sentAt: string;
  respondedAt: string | null;
}

export type InvitationType = 'interview' | 'job_opportunity' | 'assessment';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'asked_questions';

export interface Interview {
  id: string;
  applicationId: string;
  type: InterviewType;
  scheduledAt: string;
  duration: number;
  location: string | null;
  meetingUrl: string | null;
  notes: string | null;
  status: InterviewStatus;
  feedback: InterviewFeedback | null;
}

export type InterviewType = 'phone' | 'video' | 'onsite' | 'ai_mock';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';

export interface InterviewFeedback {
  rating: number;
  strengths: string[];
  weaknesses: string[];
  notes: string;
  recommendation: 'strong_hire' | 'hire' | 'neutral' | 'no_hire';
}

export interface Offer {
  id: string;
  applicationId: string;
  position: string;
  salary: number;
  salaryCurrency: string;
  benefits: string[];
  joiningDate: string;
  location: string;
  probationPeriod: string | null;
  contractDetails: string | null;
  status: OfferStatus;
  sentAt: string;
  respondedAt: string | null;
}

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'negotiating';
