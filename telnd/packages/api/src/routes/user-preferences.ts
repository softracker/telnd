import { Hono } from 'hono';
import { prisma } from '@telnd/database';

type UserPreferencesEnv = {
  Variables: {
    user: any;
    userId: string;
  };
};

const userPreferences = new Hono<UserPreferencesEnv>();

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
  const body = await c.req.json();

  if (!body || typeof body !== 'object') {
    return c.json({ success: false, error: { code: 'INVALID_BODY', message: 'Request body must be a JSON object' } }, 400);
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

  return c.json({ success: true, data: updated });
});

userPreferences.delete('/:key', async (c) => {
  const userId = c.get('userId');
  const key = c.req.param('key');
  await prisma.userPreference.deleteMany({ where: { userId, key } });
  return c.json({ success: true });
});

export default userPreferences;
