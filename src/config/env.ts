import 'dotenv/config';

function optional(name: string, fallback?: string): string | undefined {
  return process.env[name]?.trim() ?? fallback;
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development')!,
  isProduction: optional('NODE_ENV', 'development') === 'production',
  port: optionalInt('PORT', 3000),
  logLevel: optional('LOG_LEVEL'),

  database: {
    url: optional('DATABASE_URL'),
    host: optional('DB_HOST', 'localhost')!,
    port: optionalInt('DB_PORT', 5432),
    user: optional('DB_USER', 'postgres')!,
    password: optional('DB_PASSWORD', 'postgres')!,
    name: optional('DB_NAME', 'ticket_reservation')!,
    ssl: optional('DB_SSL') === 'true',
    sslRejectUnauthorized: optional('DB_SSL_REJECT_UNAUTHORIZED') !== 'false',
  },

  auth: {
    jwtSecret: optional('AUTH_JWT_SECRET'),
    jwtExpiresInSeconds: optional('AUTH_JWT_EXPIRES_IN_SECONDS'),
    tokenName: optional('AUTH_TOKEN_NAME', 'auth_token')!,
    cookieSecure: optional('AUTH_COOKIE_SECURE'),
  },

  redis: {
    url: optional('REDIS_URL'),
  },

  rateLimitFallback: optional('RATE_LIMIT_FALLBACK'),

  cloudinary: {
    cloudName: optional('CLOUDINARY_CLOUD_NAME'),
    apiKey: optional('CLOUDINARY_API_KEY'),
    apiSecret: optional('CLOUDINARY_API_SECRET'),
  },

  sentry: {
    dsn: optional('SENTRY_DSN'),
    environment: optional('SENTRY_ENVIRONMENT'),
  },

  google: {
    clientId: optional('GOOGLE_CLIENT_ID'),
  },

  adminGoogleSubs: optional('ADMIN_GOOGLE_SUBS', ''),
  adminCreatedUserDefaultPassword: optional('ADMIN_CREATED_USER_DEFAULT_PASSWORD'),

  cors: {
    frontendOrigin: optional('FRONTEND_ORIGIN'),
  },
} as const;
