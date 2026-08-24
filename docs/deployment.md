# Deployment Guide & Production Reality

## The sandbox constraint (development-only conveniences)

This repository was developed in a network-restricted sandbox where Debian mirrors and most
CDNs are unreachable (only npm registry + GitHub). Three workarounds exist **for development
and CI only** and must NOT be assumed for production:

| Workaround | Where | Production replacement |
|---|---|---|
| **Embedded PostgreSQL 17 via npm** (`@embedded-postgres/linux-x64`, driven by `scripts/db.mjs`) | dev/CI (`pnpm db:start`) | A real managed PostgreSQL 16+ (RDS/Cloud SQL/managed EU provider). Just set `DATABASE_URL`. The app is a plain pg client — nothing embedded-specific. |
| **Chromium via `@sparticuz/chromium` + bundled NSS libs** (`apps/api/src/modules/pdf/pdf.service.ts` extracts `al2023.tar.br` when system NSS is missing) | dev/CI PDF rendering | A system Chromium/Chrome install; point `CHROMIUM_EXECUTABLE=/usr/bin/chromium`. The extraction path is a harmless fallback when system libs exist. |
| **Fonts via npm** (`@expo-google-fonts/inter`, `@expo-google-fonts/noto-naskh-arabic`, embedded as base64 @font-face) | PDF pipeline (all envs) | Fine everywhere — self-contained, no OS font packages needed. Optionally swap for system Noto packages. |

Migrations are plain SQL files (`apps/api/drizzle/*.sql`) applied by
`apps/api/scripts/run-migrations.mjs` — works against any managed PostgreSQL.
`scripts/provision-app-role.mjs` creates the **non-superuser application role** the API must
connect as (RLS second wall — ADR-0003). Run it once after migrations; set
`DATABASE_URL=postgresql://locaos_app:…@host/db` for the API process.

## Required environment (production)

```
DATABASE_URL=postgresql://locaos_app:<pw>@<host>:5432/<db>   # app role (non-owner!)
SESSION_SECRET=<long random>               # also derives identity-doc encryption key — choose wisely & keep stable
COOKIE_SECURE=true                          # behind HTTPS
CHROMIUM_EXECUTABLE=/usr/bin/chromium       # system Chromium for PDFs
STORAGE_DIR=/var/lib/locaos/storage         # or swap the LocalStorage adapter for S3 (same interface)
ENABLE_SCHEDULER=true                       # single API replica; split to a worker process before scaling out
# Integrations (all optional — absent = honest MOCK/UNAVAILABLE, nothing faked):
DAMANESIGN_API_URL / DAMANESIGN_API_KEY     # qualified e-signature (register #6)
WHATSAPP_TOKEN / WHATSAPP_PHONE_ID          # WhatsApp Business Cloud API
TELEMATICS_INGEST_TOKEN                     # bearer token for the provider push endpoint
```

## Deploy steps

1. Managed PostgreSQL (EU region preferred — Law 09-08 transfer posture, register #4; CNDP
   formalities are the operator's responsibility).
2. Run `node apps/api/scripts/run-migrations.mjs` (forward-only) + `provision-app-role.mjs`
   as the owner role.
3. `pnpm install && pnpm build` → run `apps/api` (`node dist/main.js`) and `apps/web`
   (`next start`) behind a TLS terminator. API binds `0.0.0.0:$API_PORT` (default 3001);
   the web console proxies `/api/*` server-side.
4. Seed a demo/first agency: `pnpm db:seed` (demo data) — production onboarding is V2 work.
5. Health: `GET /api/telematics/positions` requires auth; use process liveness + pg
   connectivity checks (a dedicated `/healthz` is V2 hardening).

## Not yet production-grade (honest gaps)

- In-process scheduler/outbox worker (single-replica assumption) — extract before horizontal scaling.
- Local filesystem storage adapter (signed URLs are HMAC capabilities; no public buckets) — S3 adapter is a V2 swap-in.
- Rate limiting is in-app (login only); no edge/WAF guidance automated.
- No metrics/tracing exporter wired (logs are structured console).
- Arabic UI is RTL-ready but only contract PDFs + key labels are translated; full UI i18n coverage is V2.
