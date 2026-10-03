import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { logUserActivity } from '../lib/userActivity';

type UserPreferencesEnv = {
  Variables: {
    user: any;
    userId: string;
  };
};

const userPreferences = new Hono<UserPreferencesEnv>();

// (#27) Preferences are just a language + a theme, so the body is capped at
// 16KB, and these keys are rejected at any depth: JSON.parse keeps them as
// own properties, and a later merge/spread of a stored value could turn them
// into real prototype pollution.
const MAX_BODY_BYTES = 16 * 1024;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

userPreferences.get('/', async (c) => {
  const userId = c.get('userId');
  const rows = await prisma.userPreference.findMany({
    where: { userId },
  });
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return c.json({ success: true, data: result });
});

userPreferences.put('/', async (c) => {
  const userId = c.get('userId');
  // (#27) Malformed JSON previously threw a 500; parse defensively, require a
  // plain object, cap the size, and reject prototype-pollution keys before
  // anything touches the database.
  const body = await c.req.json().catch(() => null);

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return c.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Request body must be a JSON object' } }, 400);
  }

  if (JSON.stringify(body).length > MAX_BODY_BYTES) {
    return c.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Request body must be 16KB or smaller' } }, 400);
  }

  if (containsForbiddenKeys(body)) {
    return c.json({
      success: false,
      error: { code: 'INVALID_REQUEST', message: `Prototype pollution keys are not allowed: ${[...FORBIDDEN_KEYS].join(', ')}` },
    }, 400);
  }

  const allowedKeys = ['language', 'theme'];
  const entries = Object.entries(body).filter(([k]) => allowedKeys.includes(k));

  if (entries.length === 0) {
    return c.json({ success: false, error: { code: 'EMPTY_BODY', message: 'No valid preferences provided' } }, 400);
  }

  const updated: Record<string, unknown> = {};

  for (const [key, value] of entries) {
    const row = await prisma.userPreference.upsert({
      where: { userId_key: { userId, key } },
      update: { value: value as any },
      create: { userId, key, value: value as any },
    });
    updated[row.key] = row.value;
  }

  // §14.68 — a preference flip is a change like any other, one feed row
  // for the keys that moved. The activity card renders details as text
  // pairs, so only string values ride along.
  const strings: Record<string, string> = {};
  for (const [key, value] of Object.entries(updated)) {
    if (typeof value === 'string') strings[key] = value;
  }
  logUserActivity(c, { userId, action: 'PREFERENCES_UPDATED', details: strings });

  return c.json({ success: true, data: updated });
});

userPreferences.delete('/:key', async (c) => {
  const userId = c.get('userId');
  const key = c.req.param('key');
  await prisma.userPreference.deleteMany({ where: { userId, key } });
  return c.json({ success: true });
});

// (#27) Iterative walk of the whole parsed body: returns true if
// `__proto__`, `constructor` or `prototype` appears as any key at any depth.
function containsForbiddenKeys(value: unknown): boolean {
  const stack: unknown[] = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
    } else if (current !== null && typeof current === 'object') {
      for (const key of Object.keys(current)) {
        if (FORBIDDEN_KEYS.has(key)) return true;
      }
      for (const item of Object.values(current as Record<string, unknown>)) stack.push(item);
    }
  }
  return false;
}

export default userPreferences;
