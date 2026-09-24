import { Hono } from 'hono';
import { roleGuard } from '../middleware/auth.js';
import {
  initR2Client,
  convertToWebP,
  uploadToR2,
  deleteFromR2,
  generateUploadKey,
  isImageMime,
  getR2Config,
  type R2Config,
} from '../lib/r2.js';
import { prisma } from '@telnd/database';

const upload = new Hono();

async function loadR2Config(): Promise<R2Config | null> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'r2' } });
    if (!setting) return null;
    const val = setting.value as Record<string, unknown>;
    if (!val.enabled || !val.endpoint || !val.accessKeyId || !val.secretAccessKey || !val.bucket || !val.publicUrl) {
      return null;
    }
    return {
      endpoint: val.endpoint as string,
      accessKeyId: val.accessKeyId as string,
      secretAccessKey: val.secretAccessKey as string,
      bucket: val.bucket as string,
      publicUrl: val.publicUrl as string,
    };
  } catch {
    return null;
  }
}

async function ensureR2() {
  const existing = getR2Config();
  if (existing) return existing;
  const config = await loadR2Config();
  if (!config) throw new Error('R2 not configured');
  initR2Client(config);
  return config;
}

upload.post('/image', roleGuard('ADMIN'), async (c) => {
  try {
    await ensureR2();
  } catch (e: any) {
    return c.json({ success: false, error: { message: e.message || 'R2 not configured' } }, 400);
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'uploads';
    const maxWidth = formData.get('maxWidth') ? parseInt(formData.get('maxWidth') as string) : undefined;
    const maxHeight = formData.get('maxHeight') ? parseInt(formData.get('maxHeight') as string) : undefined;
    const quality = formData.get('quality') ? parseInt(formData.get('quality') as string) : 80;

    if (!file) {
      return c.json({ success: false, error: { message: 'No file provided' } }, 400);
    }

    if (!isImageMime(file.type)) {
      return c.json({ success: false, error: { message: 'File must be an image (JPEG, PNG, GIF, WebP, SVG)' } }, 400);
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return c.json({ success: false, error: { message: 'File size must be less than 10MB' } }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let webpBuffer: Buffer;
    if (file.type === 'image/svg+xml') {
      webpBuffer = buffer;
    } else {
      webpBuffer = await convertToWebP(buffer, {
        width: maxWidth,
        height: maxHeight,
        quality,
      });
    }

    const key = generateUploadKey(folder, file.name);
    const contentType = file.type === 'image/svg+xml' ? 'image/svg+xml' : 'image/webp';
    const url = await uploadToR2(key, webpBuffer, contentType);

    return c.json({
      success: true,
      data: { url, key, width: maxWidth, height: maxHeight },
    });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || 'Upload failed' } }, 500);
  }
});

upload.delete('/image', roleGuard('ADMIN'), async (c) => {
  let config: R2Config;
  try {
    config = await ensureR2();
  } catch (e: any) {
    return c.json({ success: false, error: { message: e.message || 'R2 not configured' } }, 400);
  }

  try {
    const body = await c.req.json();
    const { key, url } = body as { key?: string; url?: string };

    // The admin UI stores public URLs in settings, not object keys — derive the
    // key back from the URL using the configured public base URL.
    let objectKey = typeof key === 'string' && key ? key : '';
    if (!objectKey && typeof url === 'string' && url) {
      const base = config.publicUrl.replace(/\/+$/, '');
      if (url.startsWith(base + '/')) {
        objectKey = url.slice(base.length + 1);
      }
    }

    if (!objectKey) {
      const message = !key && !url
        ? 'No key provided'
        : 'Could not derive an object key from the given URL — it does not start with the configured R2 public URL.';
      return c.json({ success: false, error: { message } }, 400);
    }

    await deleteFromR2(objectKey);
    return c.json({ success: true, data: { deleted: true, key: objectKey } });
  } catch (err: any) {
    return c.json({ success: false, error: { message: err.message || 'Delete failed' } }, 500);
  }
});

export default upload;
