import { z } from 'zod';

export const submitVerificationSchema = z.object({
  type: z.enum(['national_id', 'passport', 'driving_license', 'student_id', 'professional_cert']),
  documentUrl: z.string().url(),
  documentType: z.string(),
});

export const submitFaceMatchSchema = z.object({
  verificationRequestId: z.string().uuid(),
  selfieUrl: z.string().url(),
});

export const reviewVerificationSchema = z.object({
  status: z.enum(['verified', 'rejected', 'flagged_for_review']),
  rejectionReason: z.string().max(1000).optional(),
});

export type SubmitVerificationInput = z.infer<typeof submitVerificationSchema>;
export type SubmitFaceMatchInput = z.infer<typeof submitFaceMatchSchema>;
export type ReviewVerificationInput = z.infer<typeof reviewVerificationSchema>;
