// §14.60 — the rate-limit registry.
//
// Every rate-limited route declares its DEFAULT window + allowance HERE
// instead of at the call site, so three consumers read one source of truth:
//
// - the middleware — `rateLimit('auth.login')` resolves the default and
//   layers the admin's live override (settings key `rateLimits`) on top;
// - the settings PUT — the whitelist of known keys and the bounds checks
//   live with the data they govern;
// - the admin editor (Settings → Rate limits) — the catalog endpoint
//   serves these entries so the page can render labels, groups and
//   "default: N / 60s" hints without duplicating the table client-side.
//
// One registry key may back several routes (e.g. `admin.sensitive` guards
// seven admin POSTs): separate buckets per path, one knob per protection
// level, so the editor stays a table of decisions rather than 53 rows of
// near-duplicates. Keys are stable identifiers — they are stored in the
// `rateLimits` settings row, so renaming one resets that override.

export const RATE_LIMIT_BOUNDS = {
  minWindowSec: 10,
  maxWindowSec: 86400,
  minMax: 1,
  maxMax: 10000,
} as const;

export const RATE_LIMIT_GROUPS = [
  'authentication',
  'account',
  'userSecurity',
  'admin',
  'public',
] as const;
export type RateLimitGroup = (typeof RATE_LIMIT_GROUPS)[number];

export interface RateLimitRule {
  group: RateLimitGroup;
  label: string;
  /** Default fixed window, in seconds. */
  windowSec: number;
  /** Default maximum requests per window. */
  max: number;
}

export const RATE_LIMITS = {
  // ── Authentication (auth.ts) ───────────────────────────────────────────
  'auth.login': { group: 'authentication', label: 'Sign-in (password)', windowSec: 60, max: 10 },
  'auth.signupStart': { group: 'authentication', label: 'Sign-up: start (send code)', windowSec: 60, max: 5 },
  'auth.signupVerifyOtp': { group: 'authentication', label: 'Sign-up: verify code', windowSec: 60, max: 10 },
  'auth.signupCheck': { group: 'authentication', label: 'Sign-up: check availability', windowSec: 60, max: 20 },
  'auth.signupComplete': { group: 'authentication', label: 'Sign-up: complete', windowSec: 60, max: 5 },
  'auth.twoFactorChallenge': { group: 'authentication', label: 'Two-factor: begin challenge', windowSec: 60, max: 30 },
  'auth.twoFactorSetup': { group: 'authentication', label: 'Two-factor: begin setup', windowSec: 60, max: 5 },
  'auth.twoFactorSend': { group: 'authentication', label: 'Two-factor: send code', windowSec: 60, max: 4 },
  'auth.twoFactorVerify': { group: 'authentication', label: 'Two-factor: verify code', windowSec: 60, max: 12 },
  'auth.resetCheck': { group: 'authentication', label: 'Password reset: check token', windowSec: 60, max: 60 },
  'auth.resetPassword': { group: 'authentication', label: 'Password reset: submit', windowSec: 60, max: 5 },
  'auth.refresh': { group: 'authentication', label: 'Session refresh', windowSec: 60, max: 10 },
  'auth.otpRequest': { group: 'authentication', label: 'OTP request (phone)', windowSec: 60, max: 3 },
  'auth.forgotPassword': { group: 'authentication', label: 'Forgot password (send email)', windowSec: 60, max: 5 },
  'auth.loginLink': { group: 'authentication', label: 'Login link (send email)', windowSec: 60, max: 3 },
  'auth.loginLinkVerify': { group: 'authentication', label: 'Login link: verify', windowSec: 60, max: 10 },
  'auth.sessionLock': { group: 'authentication', label: 'Screen lock', windowSec: 60, max: 30 },
  'auth.sessionUnlock': { group: 'authentication', label: 'Screen unlock', windowSec: 60, max: 12 },
  'auth.oauthStart': { group: 'authentication', label: 'Social sign-in: start', windowSec: 60, max: 20 },
  'auth.oauthVerify': { group: 'authentication', label: 'Social sign-in: verify', windowSec: 60, max: 10 },
  'auth.oauthLink': { group: 'authentication', label: 'Social sign-in: link account', windowSec: 60, max: 5 },
  'auth.oauthUnlink': { group: 'authentication', label: 'Social sign-in: unlink account', windowSec: 60, max: 5 },

  // ── Account changes (account.ts) ───────────────────────────────────────
  'account.phoneStart': { group: 'account', label: 'Change phone: send code', windowSec: 60, max: 3 },
  'account.phoneVerify': { group: 'account', label: 'Change phone: verify code', windowSec: 60, max: 10 },
  'account.emailStart': { group: 'account', label: 'Change email: send code', windowSec: 60, max: 5 },
  'account.emailVerify': { group: 'account', label: 'Change email: verify code', windowSec: 60, max: 10 },
  'account.setPassword': { group: 'account', label: 'Set password (first one)', windowSec: 60, max: 5 },
  'account.avatar': { group: 'account', label: 'Set profile picture', windowSec: 60, max: 10 },

  // ── User security (users.ts) ───────────────────────────────────────────
  'user.profileUpdate': { group: 'userSecurity', label: 'Profile update', windowSec: 60, max: 5 },
  'user.changePassword': { group: 'userSecurity', label: 'Change password', windowSec: 60, max: 5 },
  'user.regeneratePassword': { group: 'userSecurity', label: 'Regenerate password', windowSec: 60, max: 5 },
  // One knob for both POST (set) and DELETE (remove) — same path, one bucket.
  'user.pin': { group: 'userSecurity', label: 'Set or remove PIN', windowSec: 60, max: 5 },
  'user.pinVerify': { group: 'userSecurity', label: 'Verify PIN', windowSec: 60, max: 12 },
  'user.twoFactorSetup': { group: 'userSecurity', label: 'Two-factor: begin setup', windowSec: 60, max: 5 },
  'user.twoFactorSend': { group: 'userSecurity', label: 'Two-factor: send code', windowSec: 60, max: 4 },
  'user.twoFactorEnable': { group: 'userSecurity', label: 'Two-factor: enable', windowSec: 60, max: 10 },
  'user.twoFactorRecovery': { group: 'userSecurity', label: 'Two-factor: recovery codes', windowSec: 60, max: 3 },
  'user.twoFactorDisable': { group: 'userSecurity', label: 'Two-factor: disable', windowSec: 60, max: 10 },

  // ── Admin actions (admin.ts + the support reply route) ─────────────────
  'admin.write': { group: 'admin', label: 'Write actions (suspend, update, ticket replies)', windowSec: 60, max: 30 },
  'admin.sensitive': { group: 'admin', label: 'Admin accounts and policies', windowSec: 60, max: 10 },
  'admin.roles': { group: 'admin', label: 'Role management', windowSec: 60, max: 20 },

  // ── Public forms (support.ts + merchant.ts) ────────────────────────────
  'support.createTicket': { group: 'public', label: 'Support ticket creation', windowSec: 3600, max: 10 },
  'merchant.create': { group: 'public', label: 'Merchant registration', windowSec: 3600, max: 10 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitKey = keyof typeof RATE_LIMITS;
