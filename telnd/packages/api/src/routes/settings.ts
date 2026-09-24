import { Hono } from 'hono';
import { prisma } from '@telnd/database';
import { roleGuard } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { testSmtpSchema } from '@telnd/validation';
import { testSmtpConnection } from '../lib/email';
import { testR2Connection } from '../lib/r2';

type SettingsEnv = {
  Variables: {
    user: any;
    userId: string;
    validatedData: any;
  };
};

const settings = new Hono<SettingsEnv>();

settings.use('*', roleGuard('ADMIN'));

settings.get('/', async (c) => {
  const rows = await prisma.setting.findMany();
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return c.json({ success: true, data: result });
});

settings.put('/', async (c) => {
  const body = await c.req.json();

  if (!body || typeof body !== 'object') {
    return c.json({ success: false, error: { code: 'INVALID_BODY', message: 'Request body must be a JSON object' } }, 400);
  }

  const entries = Object.entries(body);
  if (entries.length === 0) {
    return c.json({ success: false, error: { code: 'EMPTY_BODY', message: 'No settings provided' } }, 400);
  }

  const updated: Record<string, unknown> = {};

  for (const [key, value] of entries) {
    const row = await prisma.setting.upsert({
      where: { key },
      update: { value: value as any },
      create: { key, value: value as any },
    });
    updated[row.key] = row.value;
  }

  return c.json({ success: true, data: updated });
});

settings.post('/smtp/test', validate(testSmtpSchema), async (c) => {
  const config = c.get('validatedData');
  const result = await testSmtpConnection(config);

  if (result.success) {
    return c.json({ success: true, data: { message: 'SMTP connection successful' } });
  }
  return c.json({ success: false, error: { code: 'SMTP_TEST_FAILED', message: result.error || 'Connection failed' } }, 400);
});

settings.post('/r2/test', async (c) => {
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

settings.get('/:key', async (c) => {
  const key = c.req.param('key');
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return c.json({ success: false, error: { code: 'NOT_FOUND', message: `Setting '${key}' not found` } }, 404);
  return c.json({ success: true, data: { [row.key]: row.value } });
});

export default settings;
