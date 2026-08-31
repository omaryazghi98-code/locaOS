export const env = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://locaos:locaos@127.0.0.1:5432/locaos',
  apiPort: Number(process.env.API_PORT ?? 3001),
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-only-insecure-secret-change-me',
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? 30),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  cookieSameSite: (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none' | undefined) ?? 'lax',
  storageDir: process.env.STORAGE_DIR ?? './data/storage',
  chromiumExecutable: process.env.CHROMIUM_EXECUTABLE || '',
  enableScheduler: process.env.ENABLE_SCHEDULER !== 'false',
  seedPassword: process.env.SEED_PASSWORD ?? 'locaos-demo-2026',
  damanesignApiUrl: process.env.DAMANESIGN_API_URL ?? '',
  damanesignApiKey: process.env.DAMANESIGN_API_KEY ?? '',
  whatsappToken: process.env.WHATSAPP_TOKEN ?? '',
  whatsappPhoneId: process.env.WHATSAPP_PHONE_ID ?? '',
  telematicsIngestToken: process.env.TELEMATICS_INGEST_TOKEN ?? '',
  nodeEnv: process.env.NODE_ENV ?? 'development',
};
export type Env = typeof env;
