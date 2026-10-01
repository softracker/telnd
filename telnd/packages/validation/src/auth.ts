import { z } from 'zod';
import { emailSchema, phoneSchema } from './common';

export const loginSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  password: z.string().min(8).optional(),
  otp: z.string().length(6).optional(),
  turnstileToken: z.string().optional(),
  // Which front door the sign-in started on: 'admin' (the panel's login
  // screen) or 'portal' (the user site). It only SAYS where the attempt
  // began — the account decides whether that door is its own, at /login
  // and again when a 2FA challenge closes. Optional so scripts and older
  // clients keep working; absence skips the door check and grants nothing.
  context: z.enum(['admin', 'portal']).optional(),
}).refine(
  (data) => (data.email && data.password) || (data.phone && data.otp),
  {
    message: 'Either email+password or phone+otp is required',
  },
);

// ── Unified sign-in-or-create ─────────────────────────────────────────────
// A channel proof (the emailed 6-digit code, the phone OTP, or the login
// link) comes back as a one-time signup token; these steps ride it: start
// the email proof (no account → code, account → route to sign-in), verify
// the code, check what the token opens, then create the account with the
// password chosen HERE — after the channel is proven, never before. There
// is no standalone signup endpoint — login and signup are one flow, and an
// account only ever exists after its channel was proven.
export const signupStartSchema = z.object({
  email: emailSchema,
});

export const signupVerifyOtpSchema = z.object({
  email: emailSchema,
  code: z.string().length(6),
});

export const signupCheckSchema = z.object({
  token: z.string().min(1),
});

export const signupCompleteSchema = z.object({
  token: z.string().min(1),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  // Chosen on the wizard AFTER the channel proof — same floor as the
  // sign-in password, same bcrypt (12) hash at rest.
  password: z.string().min(8),
  // Optional contact number offered beside the names on the profile step.
  // Accepted in the same BD forms the phone screen accepts (10 digits, a
  // leading 0 tolerated); empty / absent means "no phone". The route
  // validates + normalizes it and — unlike the identifier — it is stored
  // UNVERIFIED: a number typed here never opens a sign-in door until an
  // OTP proves it.
  phone: z.string().max(20).optional(),
});

// ── Social sign-in (OAuth: Google / Facebook / LinkedIn) ──────────────────
// The callback page POSTs the provider's `code` + `state` back; everything
// sensitive (PKCE verifier, nonce, flow binding) lives in the server's own
// `telnd_oauth` cookie from /oauth/:provider/start — this carries only
// what came across the URL bar.
export const oauthVerifySchema = z.object({
  code: z.string().min(1).max(4096),
  state: z.string().min(1).max(512),
});

// Proof that the visitor owns the local account the provider's VERIFIED
// email points at — the password, checked with the same lockout/captcha
// rules as a normal password sign-in. The token binds (provider, sub,
// email) from the callback; it is not a credential on its own.
export const oauthLinkSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1).max(512),
  turnstileToken: z.string().optional(),
});

// Detach a provider identity from the signed-in account (never allowed to
// strand the account with zero ways back in).
export const oauthUnlinkSchema = z.object({
  provider: z.enum(['google', 'facebook', 'linkedin']),
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
// A 6-digit code from the authenticator app (TOTP), an SMS OTP, or an
// emailed OTP. `method` is only supplied while enrolling — an active
// challenge already knows its method from the user row.
// The challenge at sign-in: a 6-digit code from the enrolled factor, or —
// when that factor is gone — one of the single-use recovery codes handed
// out when 2FA was set up. At least one must be present; the handler
// prefers the recovery code when both arrive.
export const twoFactorVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits').optional(),
  recoveryCode: z.string().min(8).max(32).optional(),
  method: z.enum(['totp', 'sms', 'email']).optional(),
}).refine((d) => Boolean(d.code || d.recoveryCode), {
  message: 'A verification code or a recovery code is required',
});

// Turning 2FA on from the Security page: prove possession of the chosen
// second factor before it becomes required at sign-in.
export const twoFactorEnableSchema = z.object({
  method: z.enum(['totp', 'sms', 'email']),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

// Turning it off: proof must be a live code from the ENROLLED factor — the
// account password alone must not switch 2FA off (#37), or a session +
// password attacker could drop the very barrier standing in their way.
export const twoFactorDisableSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

// Regenerating the recovery codes deletes the current set (a revocation as
// well as a refill), so a stolen session must not be able to do it on its
// own (#19): the caller proves the enrolled factor with a live 6-digit code.
export const twoFactorRecoveryRotateSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupCheckInput = z.infer<typeof signupCheckSchema>;
export type SignupCompleteInput = z.infer<typeof signupCompleteSchema>;
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CheckResetTokenInput = z.infer<typeof checkResetTokenSchema>;
export type TwoFactorVerifyInput = z.infer<typeof twoFactorVerifySchema>;
export type TwoFactorEnableInput = z.infer<typeof twoFactorEnableSchema>;
export type TwoFactorDisableInput = z.infer<typeof twoFactorDisableSchema>;
export type TwoFactorRecoveryRotateInput = z.infer<typeof twoFactorRecoveryRotateSchema>;
