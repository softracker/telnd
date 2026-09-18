/* eslint-disable no-undef */
declare const process: {
  env: {
    [key: string]: string | undefined;
  };
};

function env(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function envInt(key: string, fallback: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : fallback;
}

export const config = {
  app: {
    name: 'TELND',
    description: 'Career & Talent Platform',
    url: env('APP_URL', 'http://localhost:3000'),
    api_url: env('API_URL', 'http://localhost:3001'),
  },
  database: {
    url: env('DATABASE_URL', 'postgresql://telnd:telnd_password@localhost:5432/telnd'),
  },
  redis: {
    url: env('REDIS_URL', 'redis://localhost:6379'),
  },
  auth: {
    jwt_secret: env('JWT_SECRET', 'dev-secret-change-in-production'),
    jwt_expires_in: env('JWT_EXPIRES_IN', '7d'),
    jwt_refresh_expires_in: env('JWT_REFRESH_EXPIRES_IN', '30d'),
  },
  sms: {
    provider: env('SMS_PROVIDER', 'twilio'),
    account_sid: env('SMS_ACCOUNT_SID', ''),
    auth_token: env('SMS_AUTH_TOKEN', ''),
    from_number: env('SMS_FROM_NUMBER', ''),
  },
  email: {
    provider: env('EMAIL_PROVIDER', 'smtp'),
    smtp_host: env('SMTP_HOST', 'localhost'),
    smtp_port: envInt('SMTP_PORT', 1025),
    smtp_user: env('SMTP_USER', ''),
    smtp_pass: env('SMTP_PASS', ''),
    from: env('EMAIL_FROM', 'noreply@telnd.com'),
  },
  s3: {
    endpoint: env('S3_ENDPOINT', ''),
    bucket: env('S3_BUCKET', 'telnd'),
    access_key: env('S3_ACCESS_KEY', ''),
    secret_key: env('S3_SECRET_KEY', ''),
    region: env('S3_REGION', 'auto'),
    public_url: env('S3_PUBLIC_URL', ''),
  },
  ai: {
    provider: env('AI_PROVIDER', 'openai'),
    openai_api_key: env('OPENAI_API_KEY', ''),
    openai_model: env('OPENAI_MODEL', 'gpt-4o'),
  },
  rate_limit: {
    window_ms: envInt('RATE_LIMIT_WINDOW_MS', 900000),
    max_requests: envInt('RATE_LIMIT_MAX_REQUESTS', 100),
  },
} as const;
