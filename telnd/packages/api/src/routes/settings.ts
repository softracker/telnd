import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { roleGuard, requireAdmin, hasPermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { testSmtpSchema } from '@telnd/validation';
import { testSmtpConnection } from '../lib/email';
import { testR2Connection, resetR2Client } from '../lib/r2';
import { RATE_LIMITS, RATE_LIMIT_BOUNDS, RATE_LIMIT_GROUPS } from '../lib/rateLimitConfig';
import { requirePinApproval } from '../lib/securityPin';

type SettingsEnv = {
  Variables: {
    user: any;
    userId: string;
    validatedData: any;
    admin: any;
  };
};

const settings = new Hono<SettingsEnv>();

settings.use('*', roleGuard('ADMIN'), requireAdmin);

// Settings keys are gated per section so an admin with the matching
// "<resource>.view" / "<resource>.edit" grant only sees/changes that section.
// Unknown keys are reserved for super admins ("*").
const KEY_PERMISSIONS: Record<string, { view: string; edit: string }> = {
  general: { view: 'general.view', edit: 'general.edit' },
  r2: { view: 'storage.view', edit: 'storage.edit' },
  smtp: { view: 'email.view', edit: 'email.edit' },
  captcha: { view: 'captcha.view', edit: 'captcha.edit' },
  security: { view: 'security.view', edit: 'security.edit' },
  // §14.60 — the rate-limit editor rides the security grant: it is abuse
  // posture, not a resource section, and needs no new permission.
  rateLimits: { view: 'security.view', edit: 'security.edit' },
  loginProviders: { view: 'loginProviders.view', edit: 'loginProviders.edit' },
  offices: { view: 'offices.view', edit: 'offices.edit' },
  organization: { view: 'organization.view', edit: 'organization.edit' },
  payment: { view: 'payment.view', edit: 'payment.edit' },
  gateway: { view: 'gateway.view', edit: 'gateway.edit' },
  team: { view: 'team.view', edit: 'team.edit' },
};

function canViewKey(admin: any, key: string): boolean {
  const perm = KEY_PERMISSIONS[key];
  return hasPermission(admin?.role, perm ? perm.view : '*');
}

function canEditKey(admin: any, key: string): boolean {
  const perm = KEY_PERMISSIONS[key];
  return hasPermission(admin?.role, perm ? perm.edit : '*');
}

function requireKeyEdit(key: string) {
  return async (c: any, next: any) => {
    if (!canEditKey(c.get('admin'), key)) {
      const perm = KEY_PERMISSIONS[key];
      return c.json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Missing permission: ${perm ? perm.edit : '*'}` },
      }, 403);
    }
    await next();
  };
}

function requireKeyView(key: string) {
  return async (c: any, next: any) => {
    if (!canViewKey(c.get('admin'), key)) {
      const perm = KEY_PERMISSIONS[key];
      return c.json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Missing permission: ${perm ? perm.view : '*'}` },
      }, 403);
    }
    await next();
  };
}

// (#18) Settings sections hold live credentials (SMTP password, R2 secret,
// SMS API key, …). A caller holding only the VIEW grant must never receive
// them in plaintext: masking costs them nothing because the PUT path below
// requires the matching EDIT grant for every key (unknown keys need "*"), so
// they cannot write the mask back — while an edit-holder gets the real value,
// which they could overwrite anyway. Only true secrets are masked; display /
// non-secret fields (host, port, logos, names, accessKeyId, siteKey, storeId,
// usernames) pass through untouched.
const SECRET_FIELDS: Record<string, string[][]> = {
  // `pass` is the field lib/email.ts actually reads (val.pass); `password` is
  // masked too in case a client stores the password under that name.
  smtp: [['pass'], ['password']],
  r2: [['secretAccessKey']], // NOT accessKeyId — that is an identifier, not a secret
  captcha: [['secretKey']], // NOT siteKey — the site key is public by design
  // OAuth sign-in providers: the client secret is the secret; the client ID
  // is a public identifier, like R2's accessKeyId / captcha's siteKey.
  loginProviders: [
    ['google', 'clientSecret'],
    ['facebook', 'clientSecret'],
    ['linkedin', 'clientSecret'],
  ],
  gateway: [
    ['sms', 'alphaNet', 'apiKey'],
    // The gateway section also stores the SSLCommerz credentials.
    ['payment', 'sslcommerz', 'storePassword'],
  ],
};

const SECRET_MASK = '••••••';

function maskSecrets(key: string, value: unknown): unknown {
  const paths = SECRET_FIELDS[key];
  if (!paths || value === null || typeof value !== 'object') return value;
  // JSON round-trip deep-clones: stored settings values are JSON, and we must
  // not mutate the row we are only reading.
  const clone: any = JSON.parse(JSON.stringify(value));
  for (const path of paths) {
    let ref: any = clone;
    for (let i = 0; i < path.length - 1; i++) {
      ref = ref?.[path[i]];
    }
    const leaf = path[path.length - 1];
    if (ref && typeof ref === 'object' && typeof ref[leaf] === 'string' && ref[leaf] !== '') {
      ref[leaf] = SECRET_MASK;
    }
  }
  return clone;
}

// ── Login methods for the USER sign-in page (§ next: user-facing auth) ───
// Email and phone are built-in methods — a switch, nothing to configure —
// while the three OAuth providers carry stored credentials. Admin sign-in
// never reads this section. The shape is validated and whitelisted here
// rather than trusted: only the known methods, only known fields, trimmed
// strings, sane length caps — and an OAuth provider's `enabled` can never
// be saved without the credentials that provider's token exchange needs
// (fail closed, like every other gate in this file).
const LOGIN_PROVIDERS = ['email', 'emailLink', 'phone', 'google', 'facebook', 'linkedin'] as const;
const OAUTH_PROVIDERS = ['google', 'facebook', 'linkedin'] as const;

type SanitizedProviders =
  | { value: Record<string, unknown>; error?: undefined; code?: undefined }
  | { error: string; code: string; value?: undefined };

function sanitizeLoginProviders(raw: unknown): SanitizedProviders {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'loginProviders must be an object', code: 'INVALID_LOGIN_PROVIDERS' };
  }
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!(LOGIN_PROVIDERS as readonly string[]).includes(key)) {
      return { error: `Unknown login provider '${key}'`, code: 'INVALID_LOGIN_PROVIDERS' };
    }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return { error: `loginProviders.${key} must be an object`, code: 'INVALID_LOGIN_PROVIDERS' };
    }
    const src = entry as Record<string, unknown>;
    if ('enabled' in src && typeof src.enabled !== 'boolean') {
      return { error: `loginProviders.${key}.enabled must be a boolean`, code: 'INVALID_LOGIN_PROVIDERS' };
    }
    if (!(OAUTH_PROVIDERS as readonly string[]).includes(key)) {
      // Built-in method (email / phone): a switch and nothing else — any
      // credential-shaped field sent along is dropped by the whitelist.
      out[key] = { enabled: src.enabled === true };
      continue;
    }
    for (const field of ['clientId', 'clientSecret'] as const) {
      if (field in src && typeof src[field] !== 'string') {
        return { error: `loginProviders.${key}.${field} must be a string`, code: 'INVALID_LOGIN_PROVIDERS' };
      }
    }
    const enabled = src.enabled === true;
    const clientId = typeof src.clientId === 'string' ? src.clientId.trim() : '';
    const clientSecret = typeof src.clientSecret === 'string' ? src.clientSecret.trim() : '';
    if (clientId.length > 512 || clientSecret.length > 1024) {
      return { error: `loginProviders.${key} credentials are too long`, code: 'INVALID_LOGIN_PROVIDERS' };
    }
    if (enabled && (!clientId || !clientSecret)) {
      return {
        error: `loginProviders.${key}: Client ID and Client Secret are required to enable this provider`,
        code: 'CREDENTIALS_REQUIRED',
      };
    }
    out[key] = { enabled, clientId, clientSecret };
  }
  return { value: out };
}

// ── Rate limits (§14.60) ─────────────────────────────────────────────────
// The editor writes `{ [key]: { windowSec, max } }` — validated and
// whitelisted here rather than trusted: only registry keys, only integer
// bounds, nothing else stored. A rejected entry never reaches the row, so
// the middleware can keep treating stored values as already-checked
// (belt-and-braces there too for rows written by other code versions).
type SanitizedRateLimits =
  | { value: Record<string, { windowSec: number; max: number }>; error?: undefined }
  | { error: string; value?: undefined };

function sanitizeRateLimits(raw: unknown): SanitizedRateLimits {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'rateLimits must be an object' };
  }
  const out: Record<string, { windowSec: number; max: number }> = {};
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length > Object.keys(RATE_LIMITS).length) {
    return { error: 'rateLimits has too many entries' };
  }
  for (const [key, entry] of entries) {
    if (!Object.prototype.hasOwnProperty.call(RATE_LIMITS, key)) {
      return { error: `Unknown rate limit '${key}'` };
    }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return { error: `rateLimits.${key} must be an object` };
    }
    const src = entry as Record<string, unknown>;
    for (const field of ['windowSec', 'max'] as const) {
      if (field in src && typeof src[field] !== 'number') {
        return { error: `rateLimits.${key}.${field} must be a number` };
      }
    }
    const windowSec = Math.floor(src.windowSec as number);
    const max = Math.floor(src.max as number);
    if (!Number.isFinite(windowSec) || windowSec < RATE_LIMIT_BOUNDS.minWindowSec || windowSec > RATE_LIMIT_BOUNDS.maxWindowSec) {
      return { error: `rateLimits.${key}.windowSec must be a whole number between ${RATE_LIMIT_BOUNDS.minWindowSec} and ${RATE_LIMIT_BOUNDS.maxWindowSec}` };
    }
    if (!Number.isFinite(max) || max < RATE_LIMIT_BOUNDS.minMax || max > RATE_LIMIT_BOUNDS.maxMax) {
      return { error: `rateLimits.${key}.max must be a whole number between ${RATE_LIMIT_BOUNDS.minMax} and ${RATE_LIMIT_BOUNDS.maxMax}` };
    }
    out[key] = { windowSec, max };
  }
  return { value: out };
}

// Server-side search + pagination for the Our Team list (DataTables-style).
// Members live in one settings JSON row, so filtering/slicing happens here
// and the client only ever renders one page of results.
settings.get('/team/members', requireKeyView('team'), async (c) => {
  const search = String(c.req.query('search') ?? '').trim().toLowerCase();
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('pageSize') ?? '5', 10) || 5));

  const row = await prisma.setting.findUnique({ where: { key: 'team' } });
  const value = (row?.value ?? {}) as { members?: unknown };
  const members = Array.isArray(value.members) ? (value.members as any[]) : [];

  const filtered = search
    ? members.filter((m) =>
        [m?.name, m?.position, m?.email].some((v) => String(v ?? '').toLowerCase().includes(search)),
      )
    : members;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Clamp so an out-of-range page (e.g. after a delete) returns the last page.
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return c.json({
    success: true,
    data: {
      items: filtered.slice(start, start + pageSize),
      page: safePage,
      pageSize,
      totalPages,
      filteredTotal: filtered.length,
      total: members.length,
    },
  });
});

settings.get('/', async (c) => {
  const admin = c.get('admin');
  const rows = await prisma.setting.findMany();
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    if (canViewKey(admin, row.key)) {
      // (#18) View-only callers get this section's secrets masked; holders of
      // the edit grant see the real values (they can change them anyway).
      result[row.key] = canEditKey(admin, row.key) ? row.value : maskSecrets(row.key, row.value);
    }
  }
  return c.json({ success: true, data: result });
});

settings.put('/', async (c) => {
  // (#27) The raw body was awaited without a catch (malformed JSON threw a
  // 500) and only checked "is an object" — arrays passed, and size was
  // unbounded. Parse defensively, require a plain object, and cap the
  // serialized payload at 64KB before anything is written.
  const body = await c.req.json().catch(() => null);
  const admin = c.get('admin');

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return c.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Request body must be a JSON object' } }, 400);
  }

  if (JSON.stringify(body).length > 64 * 1024) {
    return c.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Request body must be 64KB or smaller' } }, 400);
  }

  const entries = Object.entries(body);
  if (entries.length === 0) {
    return c.json({ success: false, error: { code: 'EMPTY_BODY', message: 'No settings provided' } }, 400);
  }

  for (const [key] of entries) {
    if (!canEditKey(admin, key)) {
      const perm = KEY_PERMISSIONS[key];
      return c.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: perm
            ? `Missing permission: ${perm.edit}`
            : 'Missing permission: super admin access required for this setting key',
        },
      }, 403);
    }
  }

  // Rate-limit menu saves are PIN-approved: any PUT touching `rateLimits`
  // or the Send quotas stored on that same page (`gateway.sendQuota`) must
  // clear the same security-PIN approval as every other sensitive admin
  // action (§14.44). requirePinApproval reads the X-Admin-Pin header — the
  // admin client opens the approval modal on PIN_REQUIRED and retries the
  // exact request once with the verified digits — and approves PIN-less
  // actors silently while no PIN policy is in force, so this gate never
  // stands in the way of unrelated keys.
  const touchesRateLimitMenu =
    'rateLimits' in body ||
    ('gateway' in body &&
      typeof body.gateway === 'object' &&
      body.gateway !== null &&
      !Array.isArray(body.gateway) &&
      'sendQuota' in body.gateway);
  if (touchesRateLimitMenu) {
    const pinGate = await requirePinApproval(c);
    if (pinGate) return pinGate;
  }

  // (#21) Settings values are stored verbatim and rendered back into admin
  // and public pages, so a `javascript:` / `vbscript:` / `data:text/html`
  // string anywhere in the payload would be a persistent XSS vector. Scan
  // deep before writing: one bad string rejects the whole PUT. (`data:image/…`
  // embeds stay allowed.)
  for (const [key, value] of entries) {
    if (containsUnsafeUrl(value)) {
      return c.json({
        success: false,
        error: { code: 'UNSAFE_URL', message: `Setting '${key}' contains an unsafe URL scheme (javascript:/vbscript:/data:text/html)` },
      }, 400);
    }
  }

  // Validate + whitelist the OAuth provider section before anything is
  // written: unknown providers/fields are rejected, values are trimmed to
  // the exact shape the sign-in flow will read, and enabling without
  // credentials answers 400 CREDENTIALS_REQUIRED instead of landing a
  // switch that could never work.
  for (let i = 0; i < entries.length; i++) {
    if (entries[i][0] !== 'loginProviders') continue;
    const sanitized = sanitizeLoginProviders(entries[i][1]);
    if (sanitized.error) {
      return c.json({ success: false, error: { code: sanitized.code, message: sanitized.error } }, 400);
    }
    entries[i][1] = sanitized.value;
  }

  // §14.60 — same treatment for the rate-limit editor: registry keys only,
  // bounded integers only. The whitelist is the registry, so an unknown or
  // malformed entry answers 400 instead of reaching the middleware's reader.
  for (let i = 0; i < entries.length; i++) {
    if (entries[i][0] !== 'rateLimits') continue;
    const sanitized = sanitizeRateLimits(entries[i][1]);
    if (sanitized.error) {
      return c.json({ success: false, error: { code: 'INVALID_RATE_LIMITS', message: sanitized.error } }, 400);
    }
    entries[i][1] = sanitized.value;
  }

  const updated: Record<string, unknown> = {};

  // Shallow-merge plain-object values with what's already stored so a partial
  // write (an API client sending a single field, a test payload, …) can't wipe
  // sibling fields. Arrays and primitives still replace wholesale, and a field
  // explicitly sent as "" still clears (empty string is a value, not absence).
  const keys = entries.map(([key]) => key);
  const existingRows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const existingByKey = new Map(existingRows.map((r) => [r.key, r.value as unknown]));

  for (const [key, value] of entries) {
    let nextValue: unknown = value;
    const existing = existingByKey.get(key);
    if (
      value && typeof value === 'object' && !Array.isArray(value) &&
      existing && typeof existing === 'object' && !Array.isArray(existing)
    ) {
      nextValue = { ...(existing as Record<string, unknown>), ...(value as Record<string, unknown>) };
    }

    const row = await prisma.setting.upsert({
      where: { key },
      update: { value: nextValue as any },
      create: { key, value: nextValue as any },
    });
    updated[row.key] = row.value;
  }

  // The upload routes cache the R2 client in memory — invalidate it whenever
  // the r2 settings change so new credentials/public URL apply immediately.
  if (entries.some(([key]) => key === 'r2')) {
    resetR2Client();
  }

  return c.json({ success: true, data: updated });
});

settings.post('/smtp/test', requireKeyEdit('smtp'), validate(testSmtpSchema), async (c) => {
  const config = c.get('validatedData');
  const result = await testSmtpConnection(config);

  if (result.success) {
    return c.json({ success: true, data: { message: 'SMTP connection successful' } });
  }
  return c.json({ success: false, error: { code: 'SMTP_TEST_FAILED', message: result.error || 'Connection failed' } }, 400);
});

settings.post('/r2/test', requireKeyEdit('r2'), async (c) => {
  const body = await c.req.json();
  if (!body || typeof body !== 'object') {
    return c.json({ success: false, error: { code: 'INVALID_BODY', message: 'Request body must be a JSON object' } }, 400);
  }
  const { endpoint, accessKeyId, secretAccessKey, bucket } = body as {
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
  };
  const result = await testR2Connection(endpoint, accessKeyId, secretAccessKey, bucket);
  if (result.success) {
    return c.json({ success: true, data: { message: 'Connection successful! R2 bucket is accessible.' } });
  }
  return c.json({ success: false, error: { code: 'R2_TEST_FAILED', message: result.error || 'Connection failed' } }, 400);
});

// ── SMS gateway (Alpha SMS — api.sms.net.bd) ─────────────────────────────
// Shared request/error handling lives in lib/alphaSms (it also powers real
// message sending for 2FA codes); this route only does the balance lookup.

import { callAlpha, alphaFailed, alphaMessage, alphaBalance } from '../lib/alphaSms';

settings.post('/gateways/sms/alpha/balance', requireKeyEdit('gateway'), async (c) => {
  const body = await c.req.json().catch(() => null);
  const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';
  if (!apiKey) {
    return c.json({ success: false, error: { code: 'API_KEY_REQUIRED', message: 'API key is required' } }, 400);
  }

  try {
    const { data, status } = await callAlpha(`/user/balance/?api_key=${encodeURIComponent(apiKey)}`, { method: 'GET' });
    if (status < 200 || status >= 300 || alphaFailed(data)) {
      return c.json({
        success: false,
        error: { code: 'GATEWAY_ERROR', message: alphaMessage(data) || `Gateway responded with status ${status}` },
      }, 400);
    }
    return c.json({ success: true, data: { balance: alphaBalance(data) } });
  } catch {
    return c.json({ success: false, error: { code: 'GATEWAY_UNREACHABLE', message: 'Could not reach the SMS gateway' } }, 502);
  }
});

// §14.60 — the editor's catalog: every registry key with its effective
// window/max (stored override or default), the default beside it, and the
// group order. Registered before the single-segment '/:key' catch-all below.
settings.get('/rate-limits', requireKeyView('rateLimits'), async (c) => {
  const row = await prisma.setting.findUnique({ where: { key: 'rateLimits' } });
  const stored = row?.value && typeof row.value === 'object' && !Array.isArray(row.value)
    ? (row.value as Record<string, unknown>)
    : {};

  const items = Object.entries(RATE_LIMITS).map(([key, rule]) => {
    let windowSec: number = rule.windowSec;
    let max: number = rule.max;
    let overridden = false;
    const raw = stored[key];
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const ov = raw as { windowSec?: unknown; max?: unknown };
      if (typeof ov.windowSec === 'number' && Number.isFinite(ov.windowSec)) {
        windowSec = Math.floor(ov.windowSec);
        overridden = true;
      }
      if (typeof ov.max === 'number' && Number.isFinite(ov.max)) {
        max = Math.floor(ov.max);
        overridden = true;
      }
    }
    return { key, group: rule.group, label: rule.label, windowSec, max, defaultWindowSec: rule.windowSec, defaultMax: rule.max, overridden };
  });

  return c.json({ success: true, data: { items, groups: RATE_LIMIT_GROUPS } });
});

// Registered before the single-segment '/:key' catch-all below.
settings.get('/:key', async (c) => {
  const key = c.req.param('key');
  if (!canViewKey(c.get('admin'), key)) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Missing permission to view this setting' } }, 403);
  }
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return c.json({ success: false, error: { code: 'NOT_FOUND', message: `Setting '${key}' not found` } }, 404);
  // (#18) Same rule as GET /: view-only callers receive masked secrets, edit
  // grant holders receive the real values.
  const value = canEditKey(c.get('admin'), key) ? row.value : maskSecrets(key, row.value);
  return c.json({ success: true, data: { [row.key]: value } });
});

// (#21) Deep scan for script-bearing URL schemes anywhere in an incoming
// settings value. Stored settings are rendered back into the admin panel and
// public pages, so a `javascript:` / `vbscript:` / `data:text/html` string is
// a stored-XSS vector; anything matching rejects the entire PUT. Other
// schemes (https:, mailto:, tel:, `data:image/…` base64 embeds) are allowed.
const UNSAFE_URL_PATTERN = /^\s*(?:javascript|vbscript):/i;
const UNSAFE_DATA_HTML_PATTERN = /^\s*data:text\/html/i;

function containsUnsafeUrl(value: unknown): boolean {
  // Iterative walk with an explicit stack — a deeply nested payload can't
  // blow the call stack the way naive recursion would.
  const stack: unknown[] = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current === 'string') {
      if (UNSAFE_URL_PATTERN.test(current) || UNSAFE_DATA_HTML_PATTERN.test(current)) return true;
    } else if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
    } else if (current !== null && typeof current === 'object') {
      for (const item of Object.values(current as Record<string, unknown>)) stack.push(item);
    }
  }
  return false;
}

export default settings;
