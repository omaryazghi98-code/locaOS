# V1 Implementation Plan (from actual codebase inspection)

Inspection date: 2026-08-24 · Phase 1 commit `f3b4ba8` (25 domain + 27 integration tests green, lint clean).

## Verified working (not to be rewritten)

Monorepo (pnpm): `packages/domain` (pure TS) + `apps/api` (NestJS 10, tsc-built) + `apps/web` (Next.js 15).
Drizzle + raw SQL migrations (`apps/api/drizzle/000{0..3}`); RLS enforced via non-superuser `locaos_app` role
(scripts/provision-app-role.mjs); app-layer scoping via `withTenant()`. Append-only triggers on
payments/audit/contract_versions/vehicle_state_transitions; outbox payload-immutable.
Exclusion constraints (reservations, maintenance windows) + LOCAOS_CONFLICT guard triggers → 409s.
Contract engine: numbering authority, Blank-Slate lifecycle, versions, FR/AR PDF via headless Chromium
(npm-distributed binary + bundled NSS libs + embedded Noto Naskh Arabic). Offline inspection PWA.
Cash sessions with per-currency counts. Alert pack (25 rules) + scheduled checks + outbox spine.

## Technical debt found & fixed BEFORE V1 (this commit series)

1. **Global error filter registered only in main.ts** — test/boot bypass lost PG→HTTP mapping. Fixed: APP_FILTER in AppModule.
2. **BigInt JSON polyfill only in main.ts** — moved to db/client.ts (loaded with AppModule).
3. **Drizzle wraps PG errors** (cause chain) — unwrapper walks the chain; conflict detection by code OR message.
4. **Audit writes outside tenant transactions** (login/switch) — RLS-violating under the app role; moved into withTenant.
5. **`raiseAlert` used global db inside tenant scheduler** — now receives the caller tx.
6. Validation errors thrown as 403s in finance — now 400s.
7. Contract content BigInt round-trip (jsonb → string) — domain schema now tolerant.
8. payments append-only test didn't set tenant GUC (RLS silently hid rows) — test corrected.

## V1 scope (ordered per instructions; ~15 build areas mapped to 8 work packages)

WP1 Schema/migration 0004-0005: maintenance_plans, maintenance_records, vendors, vehicle_transfers,
telematics_devices, telematics_events, vehicle_positions, documents (unified), notification_outbox,
compliance_rules (source/effective-date/config/enabled), signature_requests; alerts gain `category`;
contract status enum += SIGNATURE_REQUESTED; vehicles += estimated_value; inspections += zones jsonb.
New tenant tables get RLS+FORCE + policies; telematics_events append-only + idempotency.
WP2 Integration ports (ADR-0012): SignatureProvider (Mock labeled SIMULATED — no fake success;
Damanesign adapter UNAVAILABLE without creds), MessagingProvider (Mock=SIMULATED; WhatsApp adapter
UNAVAILABLE without creds), TelematicsProvider (Mock devices explicitly labeled; secured ingest endpoint).
WP3 Telematics signal evaluator (ADR-0010): AVAILABLE+moving, RENTED+stationary-at-branch,
expired+moving, IN_TRANSIT+wrong-location, GPS-lost — with hysteresis, DETECT→EXPLAIN→ALERT only.
WP4 Maintenance subsystem: plans (km/time/scheduled), records (parts/labor/vendor/downtime), vendors,
deterministic due/approach detection, repeated-fault & cost-ratio & prolonged-downtime rules.
WP5 Multi-branch + recommendations: vehicle_transfers (RECOMMENDED→DONE, human-executed),
branch-mismatch detection for tomorrow, branch stats.
WP6 Intelligence: command-center endpoint+UI (happening/wrong/will-wrong/actions), reports
(fleet/finance/operations/customers/branches + CSV), vehicle profitability (revenue − maintenance −
depreciation estimate), customer 360, inspection zones + before/after compare.
WP7 Compliance registry + briefs upgrade (recommendations with reasons) + alert categories/severities.
WP8 Tests + docs: integration coverage for all new lifecycles + ports honesty; docs/deployment.md
(production reality), ADR-0011/0012, README/AGENTS refresh.

## Deferred (V1 DO-NOT-BUILD honored)

AI copilot/CV damage/predictive maintenance/dynamic pricing/NARSA matcher/auto-decisions/EV
intelligence — untouched; ports exist for none of them except deterministic rules per spec.
