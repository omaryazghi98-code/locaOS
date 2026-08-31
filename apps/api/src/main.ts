import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './modules/common/errors.js';
import { readCookie } from './modules/auth/guards.js';
import { env } from './env.js';
import { ensureChromiumLibs } from './modules/pdf/pdf.service.js';
import { relayOutbox } from './modules/alerts/evaluator.js';
import { runAllChecks } from './modules/alerts/scheduler.js';
import { shutdownPdf } from './modules/pdf/pdf.service.js';
import { pool } from './db/client.js';

// BigInt → string in every JSON response (money in centimes)
(BigInt.prototype as unknown as { toJSON?: () => string }).toJSON = function (this: bigint) {
  return this.toString();
};

async function bootstrap() {
  // Headless-Chromium NSS libs for restricted hosts (see pdf.service notes)
  const libsRoot = ensureChromiumLibs();
  if (libsRoot) process.env.LD_LIBRARY_PATH = `${libsRoot}/lib:${process.env.LD_LIBRARY_PATH ?? ''}`;

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.use(json({ limit: '12mb' }));
  app.use(urlencoded({ extended: true, limit: '12mb' }));
  app.use(cookieParser());

  // CSRF posture: state-changing requests must come from our own origin (SameSite=Lax + origin check).
  // The API only ever receives browser traffic through the web app's same-origin proxy, so an Origin
  // whose host matches the (forwarded) request host is legitimately same-origin. Extra origins can be
  // allowlisted via WEB_ORIGINS (comma-separated) for split-host deployments.
  const allowedOrigins = [
    `http://localhost:3000`,
    `http://127.0.0.1:3000`,
    ...(process.env.WEB_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  ];
  const isSameOriginAsHost = (origin: string, req: import('express').Request): boolean => {
    try {
      const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim();
      const host = forwardedHost || req.headers.host;
      return Boolean(host) && new URL(origin).host === host;
    } catch {
      return false;
    }
  };
  app.use((req: import('express').Request, res: import('express').Response, next: () => void) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.headers.origin;
      const hasSession = Boolean(readCookie(req.headers.cookie, 'locaos_session'));
      const originAllowed = !origin || allowedOrigins.includes(origin) || isSameOriginAsHost(origin, req);
      if (hasSession && !originAllowed) {
        res.status(403).json({ error: { code: 'ORIGIN_REJECTED', message: 'Origin non autorisée' } });
        return;
      }
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  await app.listen(env.apiPort, '0.0.0.0');
  console.log(`[api] listening on :${env.apiPort}`);

  if (env.enableScheduler) {
    const tick = async () => {
      try {
        await relayOutbox();
        await runAllChecks();
      } catch (e) {
        console.warn('[scheduler] tick failed:', (e as Error).message);
      }
    };
    setInterval(tick, 60_000); // 1-minute cadence for MVP; V1 moves to the worker process
    setTimeout(tick, 5_000);
  }
}

bootstrap();

async function onShutdown() {
  await shutdownPdf();
  await pool.end();
}
process.on('SIGTERM', () => { void onShutdown().then(() => process.exit(0)); });
process.on('SIGINT', () => { void onShutdown().then(() => process.exit(0)); });
