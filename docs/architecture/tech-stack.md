# Technology Stack Recommendation (Phase 0)

Status: **PROPOSED — awaiting review.** Each row that implies a binding decision has a
matching ADR in [`docs/decisions/`](../decisions/README.md).

## Summary

| Layer | Choice | Alternatives considered | ADR |
|---|---|---|---|
| Language | TypeScript everywhere (node 22 LTS) | TS backend + Kotlin/Swift mobile; Go backend | [0001](../decisions/0001-modular-monolith-typescript.md) |
| Repository | pnpm workspaces monorepo (+ Turborepo task graph) | Polyrepo; Nx | [0004](../decisions/0004-monorepo-web-pwa.md) |
| Backend | NestJS modular monolith (REST + OpenAPI) | Fastify bare; Django; Laravel; Rails | [0001](../decisions/0001-modular-monolith-typescript.md) |
| Database | PostgreSQL 16+ (single datastore) | MySQL; Mongo; per-module DBs | [0002](../decisions/0002-postgresql-single-datastore.md) |
| ORM / migrations | Prisma (typed client + migrations) + raw SQL where RLS/exclusion constraints require | Drizzle; TypeORM; raw SQL | [0002](../decisions/0002-postgresql-single-datastore.md) |
| Tenancy | Shared schema + `agency_id` + PostgreSQL RLS, app-layer scoping as first wall | Schema-per-tenant; DB-per-tenant | [0003](../decisions/0003-multitenancy-shared-schema-rls.md) |
| Frontend | Next.js (App Router) + React 19 | Remix; SPA+API; Vue | [0004](../decisions/0004-monorepo-web-pwa.md) |
| UI system | Tailwind CSS + shadcn/ui (dense operational layouts, RTL-capable) | Ant Design; MUI | [0004](../decisions/0004-monorepo-web-pwa.md) |
| Client state/data | TanStack Query + React Hook Form + Zod | Redux; native fetch | — |
| Offline (mobile) | PWA: service worker (Serwist/Workbox) + IndexedDB outbox | React Native; Capacitor | [0005](../decisions/0005-offline-pwa-inspections.md) |
| Auth | Cookie sessions (opaque token, server-side session table, argon2id hashing) | JWT access/refresh; Auth.js; Keycloak | [0006](../decisions/0006-authn-authz-sessions-rbac.md) |
| Jobs / queue | pg-boss (Postgres-backed) initially; BullMQ+Redis only on proven need | Celery-equivalents; Redis day one | [0001](../decisions/0001-modular-monolith-typescript.md) |
| Validation | Zod schemas shared client/server (`packages/api-contracts`) | class-validator; Joi | [0007](../decisions/0007-contract-engine-structured-pdf.md) |
| PDF | Structured templates → HTML → headless Chromium (Playwright) | pdf-lib; Typst; LaTeX | [0007](../decisions/0007-contract-engine-structured-pdf.md) |
| i18n | French (default), Arabic (RTL), English; ICU message catalogs | Per-page dictionaries | [0004](../decisions/0004-monorepo-web-pwa.md) |
| Money | Integer centimes (`bigint`/`int64`), currency default `MAD`; never floats | Decimal columns w/ ORM decimals | [0008](../decisions/0008-financial-integrity-ledger.md) |
| Testing | Vitest (unit/domain) + Testcontainers (integration) + Playwright (E2E, from Phase 3) | Jest; Cypress | — |
| Observability | pino structured logs; OpenTelemetry traces; health endpoints | Grafana stack day one | — |
| Dev infra | Docker Compose (api, web, postgres); CI via GitHub Actions | K8s (explicitly rejected for now) | [0001](../decisions/0001-modular-monolith-typescript.md) |
| File storage | S3-compatible object store (signed URLs; never public buckets) | DB blobs | — |

## Rationale — the decisions that matter most

### One language, one process first: TypeScript modular monolith
The domain (state machines, conflict detection, pricing, reconciliation) is the product.
Sharing those types and rules between web, api, and offline mobile clients — with a single
test suite — is worth more than any polyglot split. A modular monolith with enforced module
boundaries (per-module `package.json`, lint rules against cross-imports) delays the
microservices decision until a real boundary appears (§21).

### PostgreSQL as the integrity backbone
The product's hardest requirements are *integrity* requirements: no double bookings
(exclusion constraints), tenant isolation (RLS), append-only financial/audit history,
transactional outbox for events, materialized daily snapshots. Postgres does all of this
natively; a second datastore before Phase 8 would be speculative.

### Sessions over JWTs; RBAC over roles-only
Opaque server-side sessions are revocable (shared devices, staff turnover), avoid
token-leakage classes, and keep authz server-side where §5 demands it. Authorization =
permission matrix (`role × permission` per agency), evaluated in guards; UI never decides.

### PWA over native (for now)
Inspections/deliveries need offline capture, camera, and signatures — a PWA with an IndexedDB
outbox and background sync covers this on staff Android devices, one codebase. The escape
hatch is explicit: if BLE/OBD or background-GPS tracking becomes a hard requirement, that
feature may go native (React Native) later without changing the backend contract
(register assumption A4).

### Headless-Chromium PDF rendering
Arabic (RTL, shaping) in generated contracts is a hard requirement (§8). Browser-grade text
layout is the only rendering path that handles FR/AR/EN with one template pipeline. Cost
(managed Chromium in the worker) is accepted; pdf-lib/Typst remain fallbacks for
deterministic-only Latin documents.

## Explicitly deferred

- Redis, Kafka, microservices, Kubernetes — until a measured need (ADR-0001).
- CMI payment adapter — design the `PaymentGateway` port now, implement when merchant
  credentials exist; label status UNAVAILABLE (§26).
- AI provider — the reasoning layer has no write path (ADR-0009); provider choice is a
  Phase 10 decision, not an architecture commitment.
- WhatsApp Business Cloud API — cost/policy review required first (register #12).

## Security baseline (applies to every choice above)

- No secrets in code; `.env` files git-ignored; CI uses GitHub Actions secrets.
- Dependencies pinned; `pnpm audit` + Dependabot + CodeQL enabled from Phase 1.
- Rate limiting at API edge; body size limits; Zod validation on every boundary.
- CSRF: SameSite=Lax cookies + origin checks (session cookies are bearer-equivalent).
- Uploads: signed URLs, MIME sniffing, size caps, EXIF-strip option (Law 09-08, register #3).
- All security-relevant events land in the append-only audit log.
