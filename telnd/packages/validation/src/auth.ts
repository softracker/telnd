import { z } from 'zod';
import { emailSchema, phoneSchema } from './common';

export const loginSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  password: z.string().min(8).optional(),
  otp: z.string().length(6).optional(),
  turnstileToken: z.string().optional(),
}).refine(
  (data) => (data.email && data.password) || (data.phone && data.otp),
  {
    message: 'Either email+password or phone+otp is required',
  },
);

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: phoneSchema.optional(),
  role: z.enum(['candidate', 'employer']).default('candidate'),
});

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

// Dry-run of an emailed set-password link: the page calls this on load so a
// dead link is announced up front instead of after a filled-in form.
export const checkResetTokenSchema = z.object({
  token: z.string().min(1),
});

// ── Two-factor authentication ────────────────────────────────────────────
// A 6-digit code either from the authenticator app (TOTP) or the SMS OTP.
// `method` is only supplied while enrolling — an active challenge already
// knows its method from the user row.
export const twoFactorVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
  method: z.enum(['totp', 'sms']).optional(),
});

// Turning 2FA on from the Security page: prove possession of the chosen
// second factor before it becomes required at sign-in.
export const twoFactorEnableSchema = z.object({
  method: z.enum(['totp', 'sms']),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

// Turning it off: either a live 2FA code or the account password — the
// Security page offers whichever the operator still has in hand.
export const twoFactorDisableSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits').optional(),
  password: z.string().min(1).max(200).optional(),
}).refine((d) => Boolean(d.code || d.password), {
  message: 'A verification code or your password is required',
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CheckResetTokenInput = z.infer<typeof checkResetTokenSchema>;
export type TwoFactorVerifyInput = z.infer<typeof twoFactorVerifySchema>;
export type TwoFactorEnableInput = z.infer<typeof twoFactorEnableSchema>;
export type TwoFactorDisableInput = z.infer<typeof twoFactorDisableSchema>;
