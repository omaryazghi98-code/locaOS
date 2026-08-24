export const env = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://locaos:locaos@127.0.0.1:5432/locaos',
  apiPort: Number(process.env.API_PORT ?? 3001),
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-only-insecure-secret-change-me',
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? 30),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  storageDir: process.env.STORAGE_DIR ?? './data/storage',
  chromiumExecutable: process.env.CHROMIUM_EXECUTABLE || '',
  enableScheduler: process.env.ENABLE_SCHEDULER !== 'false',
  seedPassword: process.env.SEED_PASSWORD ?? 'locaos-demo-2026',
  nodeEnv: process.env.NODE_ENV ?? 'development',
};
export type Env = typeof env;
