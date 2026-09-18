declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: string;
    APP_URL?: string;
    API_URL?: string;
    WEB_URL?: string;
    DATABASE_URL?: string;
    REDIS_URL?: string;
    JWT_SECRET?: string;
    JWT_EXPIRES_IN?: string;
    JWT_REFRESH_EXPIRES_IN?: string;
    SMS_PROVIDER?: string;
    SMS_ACCOUNT_SID?: string;
    SMS_AUTH_TOKEN?: string;
    SMS_FROM_NUMBER?: string;
    EMAIL_PROVIDER?: string;
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_USER?: string;
    SMTP_PASS?: string;
    EMAIL_FROM?: string;
    S3_ENDPOINT?: string;
    S3_BUCKET?: string;
    S3_ACCESS_KEY?: string;
    S3_SECRET_KEY?: string;
    S3_REGION?: string;
    S3_PUBLIC_URL?: string;
    AI_PROVIDER?: string;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    RATE_LIMIT_WINDOW_MS?: string;
    RATE_LIMIT_MAX_REQUESTS?: string;
    SENTRY_DSN?: string;
    LOG_LEVEL?: string;
  }
}
