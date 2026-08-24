# ADR-0011 — Phase 1/V1 implementation notes (npm-distributed infrastructure & tooling deviations)

- Status: Accepted
- Date: 2026-08-24

## Context

The build environment blocks Debian mirrors and most CDNs (npm + GitHub reachable only).
The approved architecture (ADR-0002: Prisma; system Chromium/Playwright; Postgres via
Docker) could not be installed as documented. Deployment must remain standard.

## Decisions

1. **Drizzle ORM replaces Prisma** (ADR-0002 amendment). Prisma requires engine binaries
   from binaries.prisma.sh (blocked, no mirror). Drizzle is engine-free, and its
   raw-SQL-friendly posture fits our hand-written hardening SQL. Drizzle was the documented
   fallback in ADR-0002.
2. **Embedded PostgreSQL (npm `@embedded-postgres`) for dev/CI** — started/detached via
   `scripts/db.mjs` (pg_ctl). Production uses any managed PostgreSQL (see
   docs/deployment.md); the app is a standard pg client.
3. **Chromium via `@sparticuz/chromium` (npm) + puppeteer-core**, with the package's
   bundled NSS libs (`al2023.tar.br`) extracted when system NSS is absent — replaces the
   Playwright plan (CDN blocked). ADR-0007's substance (headless Chromium, Arabic shaping)
   is preserved; CHROMIUM_EXECUTABLE overrides for system installs.
4. **Fonts via npm** (`@expo-google-fonts/*`), embedded base64 in PDF HTML — replaces
   apt font packages; self-contained everywhere.
5. **Turbo skipped** — plain pnpm scripts (small task graph). **UUID v4 defaults** instead
   of v7 (orderability provided by timestamps). **Inlined worker**: scheduler + outbox
   relay run in the API process (`ENABLE_SCHEDULER`); extraction to a worker process is a
   pre-scale step, not a rewrite.
6. **App role for RLS**: the API connects as non-superuser `locaos_app`
   (scripts/provision-app-role.mjs) — the superuser bootstrap role silently bypassed RLS
   during early development; the dedicated role restored the second wall (ADR-0003).

## Consequences

- Zero sandbox-specific hacks in application code paths; all substitutions are dev/CI
  conveniences with standard production equivalents.
- Prisma users must migrate expectations — schema source of truth is
  `apps/api/src/db/schema.ts` + `apps/api/drizzle/*.sql` (forward-only).
