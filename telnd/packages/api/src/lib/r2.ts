import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

export interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
}

let r2Client: S3Client | null = null;
let r2Config: R2Config | null = null;

export function getR2Config(): R2Config | null {
  return r2Config;
}

export function initR2Client(config: R2Config): S3Client {
  r2Config = config;
  r2Client = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    // R2 is addressed as https://<account-id>.r2.cloudflarestorage.com/<bucket>/...
    // The SDK default (virtual-hosted style) rewrites the host to
    // <bucket>.<account-id>.r2.cloudflarestorage.com, which R2 does not serve.
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return r2Client;
}

export function getR2Client(): S3Client | null {
  return r2Client;
}

export async function convertToWebP(
  buffer: Buffer,
  options?: { width?: number; height?: number; quality?: number }
): Promise<Buffer> {
  let pipeline = sharp(buffer);

  if (options?.width || options?.height) {
    pipeline = pipeline.resize(options.width, options.height, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  return pipeline.webp({ quality: options?.quality ?? 80 }).toBuffer();
}

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string,
  cacheControl?: string
): Promise<string> {
  if (!r2Client || !r2Config) {
    throw new Error('R2 client not initialized. Configure R2 settings first.');
  }

  const command = new PutObjectCommand({
    Bucket: r2Config.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: cacheControl || 'public, max-age=31536000, immutable',
  });

  await r2Client.send(command);
  return `${r2Config.publicUrl.replace(/\/$/, '')}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  if (!r2Client || !r2Config) {
    throw new Error('R2 client not initialized.');
  }

  const command = new DeleteObjectCommand({
    Bucket: r2Config.bucket,
    Key: key,
  });

  await r2Client.send(command);
}

export async function r2KeyExists(key: string): Promise<boolean> {
  if (!r2Client || !r2Config) return false;

  try {
    const command = new HeadObjectCommand({
      Bucket: r2Config.bucket,
      Key: key,
    });
    await r2Client.send(command);
    return true;
  } catch {
    return false;
  }
}

export function generateUploadKey(
  folder: string,
  originalName: string,
  suffix?: string
): string {
  const ext = 'webp';
  const base = originalName
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/\.[^.]+$/, '');
  const id = suffix || Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  return `${folder}/${base}-${id}.${ext}`;
}

export function isImageMime(mime: string): boolean {
  return ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'].includes(mime);
}

export function isFavIconMime(mime: string): boolean {
  return ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/svg+xml'].includes(mime);
}

export async function testR2Connection(
  endpoint: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucket: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('unsupported protocol');
    }
  } catch {
    return {
      success: false,
      error: 'The R2 endpoint is not a valid URL. It should look like https://<account-id>.r2.cloudflarestorage.com',
    };
  }

  if (!bucket.trim()) {
    return { success: false, error: 'Bucket name is required.' };
  }

  const testClient = new S3Client({
    region: 'auto',
    endpoint,
    // Path style: https://<account-id>.r2.cloudflarestorage.com/<bucket>/...
    // The SDK default rewrites the host to <bucket>.<account-id>.r2... instead.
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    const { HeadBucketCommand } = await import('@aws-sdk/client-s3');
    await testClient.send(new HeadBucketCommand({ Bucket: bucket }));
    return { success: true };
  } catch (err: any) {
    return { success: false, error: await describeR2Error(err, testClient, bucket, endpoint) };
  }
}

async function listBucketNames(client: S3Client): Promise<string[] | null> {
  try {
    const { ListBucketsCommand } = await import('@aws-sdk/client-s3');
    const res = await client.send(new ListBucketsCommand({}));
    return (res.Buckets ?? []).map((b) => b.Name).filter((n): n is string => Boolean(n));
  } catch {
    return null;
  }
}

function endpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return endpoint;
  }
}

function formatBucketList(names: string[], limit = 10): string {
  const shown = names.slice(0, limit).join(', ');
  return names.length > limit ? `${shown} … and ${names.length - limit} more` : shown;
}

/**
 * HeadBucket is a HEAD request, so S3-compatible APIs return error responses
 * with an empty body. The AWS SDK then falls back to the literal message
 * "UnknownError", which is meaningless to an admin. Map the status code /
 * error name to something actionable instead.
 */
async function describeR2Error(
  err: any,
  client: S3Client,
  bucket: string,
  endpoint: string
): Promise<string> {
  const status: number | undefined = err?.$metadata?.httpStatusCode;
  const raw: string =
    typeof err?.message === 'string' && err.message.trim() && err.message !== 'UnknownError'
      ? err.message.trim()
      : '';
  const code: string | undefined =
    err?.code || (err?.cause && typeof err.cause === 'object' ? err.cause.code : undefined);

  // No HTTP response at all: DNS, TLS or connection problem
  if (!status) {
    if (code === 'ENOTFOUND' || /ENOTFOUND|getaddrinfo/i.test(raw)) {
      return `The endpoint host could not be found. Check the R2 endpoint — it should look like https://<account-id>.r2.cloudflarestorage.com (current: ${endpoint}).`;
    }
    if (code === 'EPROTO' || /handshake|SSL routines|TLS/i.test(raw)) {
      return `A secure connection to the endpoint could not be established. The endpoint hostname is likely wrong — copy it again from Cloudflare Dashboard > R2 > Overview > S3 API (current: ${endpoint}).`;
    }
    if (/Invalid URL/i.test(raw)) {
      return 'The R2 endpoint is not a valid URL. It should look like https://<account-id>.r2.cloudflarestorage.com';
    }
    return raw || `Could not reach the R2 endpoint (${endpoint}). Check the endpoint URL and your network connection.`;
  }

  const host = endpointHost(endpoint);

  // HTTP response received: interpret the status code
  if (status === 404 || err?.name === 'NotFound' || err?.name === 'NoSuchBucket') {
    // Ask the endpoint what it actually holds — this separates a typo'd bucket
    // name from an endpoint that points at a different Cloudflare account.
    const names = await listBucketNames(client);
    if (names) {
      if (names.length === 0) {
        return `Endpoint ${host} and the access keys are valid, but this account has no buckets. Either the endpoint belongs to a different Cloudflare account, or the bucket has not been created yet.`;
      }
      const exact = names.find((n) => n === bucket);
      const ci = names.find((n) => n.toLowerCase() === bucket.toLowerCase());
      if (!exact && ci) {
        return `Bucket name casing mismatch: you entered "${bucket}", but the bucket on ${host} is "${ci}". Bucket names are case-sensitive — use "${ci}".`;
      }
      if (!exact) {
        return `Bucket "${bucket}" does not exist on ${host} (HTTP 404). Buckets on this endpoint: ${formatBucketList(names)}. Check the bucket name, and make sure the endpoint belongs to the same Cloudflare account as the bucket.`;
      }
    }
    return `Bucket "${bucket}" was not found on ${host} (HTTP 404). Check the bucket name, and make sure the endpoint belongs to the same Cloudflare account as the bucket.`;
  }
  if (status === 403 || err?.name === 'AccessDenied') {
    return `Access denied (HTTP 403) on ${host}. Check the Access Key ID and Secret Access Key, and make sure the R2 API token has "Object Read & Write" permission for this bucket.`;
  }
  if (status === 401) {
    return 'Unauthorized (HTTP 401). The Access Key ID or Secret Access Key is incorrect.';
  }
  if (raw) return `R2 returned an error (HTTP ${status}): ${raw}`;
  const name = err?.name && !/^(Unknown|UnknownError|\d+)$/.test(String(err.name)) ? `, ${err.name}` : '';
  return `Connection failed (HTTP ${status}${name}). Check the endpoint, keys and bucket name.`;
}
