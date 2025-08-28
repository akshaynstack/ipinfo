import dotenv from 'dotenv';

dotenv.config();

export const settings = {
  appName: process.env.APP_NAME ?? 'ipapi',
  environment: process.env.ENVIRONMENT ?? 'development',
  port: Number(process.env.PORT ?? '8787'),

  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://user:password@localhost:5432/ipapi',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379/0',

  apiKeyPrefix: process.env.API_KEY_PREFIX ?? 'ipapi_',
  adminApiKey: process.env.ADMIN_API_KEY,
  enforceHttpsForApiKeys: (process.env.ENFORCE_HTTPS_FOR_API_KEYS ?? 'true').toLowerCase() === 'true',

  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,

  defaultRateLimitPerMin: Number(process.env.DEFAULT_RATE_LIMIT_PER_MIN ?? '60'),
  // Path to GeoLite2 database. Default resolves to repo root GeoLite2-Country.mmdb when running from hono/ dir.
  geoipDbPath: process.env.GEOIP_DB_PATH || new URL('../../GeoLite2-Country.mmdb', import.meta.url).pathname,
};
