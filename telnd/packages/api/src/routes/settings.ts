import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { roleGuard, requireAdmin, hasPermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { testSmtpSchema } from '@telnd/validation';
import { testSmtpConnection } from '../lib/email';
import { testR2Connection, resetR2Client } from '../lib/r2';

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
      result[row.key] = row.value;
    }
  }
  return c.json({ success: true, data: result });
});

settings.put('/', async (c) => {
  const body = await c.req.json();
  const admin = c.get('admin');

  if (!body || typeof body !== 'object') {
    return c.json({ success: false, error: { code: 'INVALID_BODY', message: 'Request body must be a JSON object' } }, 400);
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
// The gateway answers HTTP 200 for failures too, so success is decided from
// the body: every error payload carries a truthy `error` code plus a `msg`.

const ALPHA_SMS_API = 'https://api.sms.net.bd';
const ALPHA_TIMEOUT_MS = 15000;

interface AlphaResponse {
  error?: number | string | null;
  msg?: string;
  message?: string;
  status?: string | boolean;
  success?: boolean;
  balance?: number | string;
  wallet?: number | string;
  data?: { balance?: number | string };
}

function alphaFailed(data: AlphaResponse | null): boolean {
  if (!data || typeof data !== 'object') return true;
  return Boolean(data.error) || data.success === false || data.status === 'error' || data.status === false;
}

function alphaMessage(data: AlphaResponse | null): string | undefined {
  const msg = data?.msg || data?.message;
  return typeof msg === 'string' && msg.trim() ? msg.trim() : undefined;
}

function alphaBalance(data: AlphaResponse | null): string | null {
  const raw = data?.balance ?? data?.wallet ?? data?.data?.balance;
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return null;
}

async function callAlpha(path: string, init: RequestInit): Promise<{ data: AlphaResponse | null; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ALPHA_TIMEOUT_MS);
  try {
    const res = await fetch(`${ALPHA_SMS_API}${path}`, { ...init, signal: controller.signal });
    const data = (await res.json().catch(() => null)) as AlphaResponse | null;
    return { data, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

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

// Registered before the single-segment '/:key' catch-all below.
settings.get('/:key', async (c) => {
  const key = c.req.param('key');
  if (!canViewKey(c.get('admin'), key)) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Missing permission to view this setting' } }, 403);
  }
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return c.json({ success: false, error: { code: 'NOT_FOUND', message: `Setting '${key}' not found` } }, 404);
  return c.json({ success: true, data: { [row.key]: row.value } });
});

export default settings;
