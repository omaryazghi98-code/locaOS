const isProd = (process.env.NODE_ENV ?? 'development') === 'production';

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://locaos:locaos@127.0.0.1:5432/locaos',
  apiPort: Number(process.env.API_PORT ?? 3001),
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-only-insecure-secret-change-me',
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? 30),
  // Dev/preview runs inside a cross-origin HTTPS iframe (the v0 preview), which drops SameSite=Lax
  // cookies — so outside production we default to SameSite=None; Secure. `Secure` is honoured on
  // http://localhost (a secure context) and mandatory for the iframe, so one default works for both
  // local dev and the embedded preview. Production keeps Lax + non-secure unless explicitly overridden.
  cookieSecure: process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : !isProd,
  cookieSameSite: (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none' | undefined) ?? (isProd ? 'lax' : 'none'),
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
