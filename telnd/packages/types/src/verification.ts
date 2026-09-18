export interface VerificationRequest {
  id: string;
  userId: string;
  type: VerificationType;
  status: VerificationProcessStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  documents?: Document[];
  faceMatch?: FaceMatch;
}

export type VerificationType = 
  | 'national_id'
  | 'passport'
  | 'driving_license'
  | 'student_id'
  | 'professional_cert';

export type VerificationProcessStatus = 
  | 'pending'
  | 'processing'
  | 'verified'
  | 'rejected'
  | 'flagged_for_review';

export interface Document {
  id: string;
  verificationRequestId: string;
  fileUrl: string;
  fileType: string;
  ocrData: Record<string, unknown> | null;
  extractedText: string | null;
  isAuthentic: boolean | null;
  tamperingScore: number | null;
  createdAt: string;
}

export interface FaceMatch {
  id: string;
  verificationRequestId: string;
  selfieUrl: string;
  idPhotoUrl: string;
  matchScore: number | null;
  isMatch: boolean | null;
  createdAt: string;
}

export interface VideoInterview {
  id: string;
  applicationId: string;
  scheduledAt: string;
  duration: number;
  meetingUrl: string | null;
  status: string;
  recordingUrl: string | null;
  transcriptUrl: string | null;
  createdAt: string;
  updatedAt: string;
  analysis?: InterviewAnalysis;
}

export interface InterviewAnalysis {
  id: string;
  interviewId: string;
  overallScore: number | null;
  communicationScore: number | null;
  technicalScore: number | null;
  confidenceScore: number | null;
  fillerWordCount: number | null;
  transcript: string | null;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  createdAt: string;
}
