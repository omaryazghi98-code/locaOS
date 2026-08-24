# V1 Readiness Report

Date: 2026-08-24 · Commits: Phase 1 `f3b4ba8` → V1 `e03447a` → hardening pass (this commit)
Scope: hardening/production-readiness only — no new product features (per instruction).

## PASS — production-ready now

- **Multi-tenancy (two walls, tested):** app-layer scoping (`withTenant`) + PostgreSQL RLS
  (FORCE) via non-superuser `locaos_app` role. Cross-tenant sweep across 19 API surfaces and
  16 tables returns zero leaks (API + raw RLS tests).
- **Financial integrity:** integer centimes everywhere; append-only payments/audit
  (DB triggers, tested from SQL); refunds are linked reversal entries capped at the original
  (cumulative, tested); multi-currency requires explicit human-confirmed FX (MAD equivalent
  stored); payments on BLANK_ISSUED/VOIDED contracts rejected — blank paper can never carry an
  invisible financial record (tested); cash expected = deterministic sum of session payments;
  counted entered separately per currency; variance computed once at closing — double-close
  rejected (tested).
- **Conflict-proof availability:** DB exclusion constraints (reservations, maintenance
  windows) + scenario-C guard (`VEHICLE_STILL_OUT`) — all → 409 with explanation (tested).
- **Vehicle state machine:** domain-validated transitions; row-level lock (`SELECT … FOR
  UPDATE`) makes concurrent conflicting transitions safe — exactly one wins (tested);
  append-only transition log + audit.
- **Contracts:** per-agency numbering authority (row-locked), immutable versions with
  content hashes, amendments (vehicle replacement keeps deposit/insurance continuity,
  new version — tested), Blank-Slate lifecycle with reconciliation/void + scanned evidence,
  FR + AR (RTL, embedded Noto Naskh) PDFs verified end-to-end. PRINTED is not a stored
  status by design: blank issue → print is an output action on `BLANK_ISSUED`; the lifecycle
  is DRAFT/GENERATED → SIGNATURE_REQUESTED → SIGNED → ACTIVE → CLOSED (+AMENDED/VOIDED).
- **Inspections:** idempotent offline submissions (`clientUuid`, tested for duplicates);
  too-fast detection; damage evidence — no automated financial/contractual side effects
  possible from the field client.
- **Audit log:** covers price overrides, transitions, contract lifecycle, payments/refunds/
  deposits, transfers, compliance toggles, integration actions, document upload/download
  (metadata documents), identity reveal; immutable (trigger, tested).
- **Storage:** HMAC signed URLs now require an authenticated session AND embed the owning
  agency in the signature — a leaked link is useless cross-tenant (tested); path traversal
  neutralized (tested); files never public.
- **Scheduler:** per-agency advisory lock per tick → two API replicas skip rather than
  double-run; every check is idempotent (alerts deduped by day+entity; transfers deduped by
  partial unique index, migration 0005); transitions guarded by the state machine.
- **Integrations:** honest MOCK/UNAVAILABLE only (ADR-0012) — no faked success anywhere
  (tested for signature + messaging).

## NEEDS CONFIGURATION (production infrastructure/credentials)

- Managed PostgreSQL (EU region recommended — Law 09-08 posture) + run migrations +
  `provision-app-role.mjs`; API must connect as the app role.
- System Chromium (`CHROMIUM_EXECUTABLE`) for PDF; `SESSION_SECRET` (stable — derives the
  identity-doc encryption key); `COOKIE_SECURE=true` behind TLS; persistent `STORAGE_DIR`.
- Live integrations (optional): `DAMANESIGN_*`, `WHATSAPP_*`, `TELEMATICS_INGEST_TOKEN` —
  absent ⇒ MOCK/UNAVAILABLE, clearly labeled.
- Demo credentials: `SEED_PASSWORD` value — **demo-only**, labeled in README/.env.example;
  seeder refuses `NODE_ENV=production` unless `SEED_ALLOW_PRODUCTION=true` + explicit password.

## V2 (intentionally deferred)

Worker-process extraction for the scheduler/outbox (safe today for a single API replica —
the advisory lock already tolerates accidental dual replicas); S3-compatible storage adapter
(interface ready — exact migration path below); real PWA service-worker caching + offline
photo upload queue (today: offline inspection submissions work, photos require connectivity);
full UI Arabic translation (contracts fully AR; UI labels partial); metrics/tracing exporter;
`/healthz` endpoint; multi-replica websockets none; staging validation of the Damanesign call
shape with real credentials; onboarding flow for first production agency (no self-serve).

**S3 migration path (documented, not implemented):** implement `StoragePort`
(`put/get/signedUrl/verify`) over the S3 SDK with per-agency key prefixes
(`${agencyId}/${kind}/…` — already the key layout); `signedUrl` becomes S3 presigned GET (or
keep HMAC via a streaming route); swap the single `storage` instance in
`modules/storage/storage.ts`; no other code changes (callers depend on the port only);
migrate existing objects with a one-off key-preserving `aws s3 sync`.

## KNOWN RISKS

- Single API replica assumption for background work (mitigated by advisory locks; V2 worker).
- Damanesign request shape is from public docs, unvalidated against the live API.
- Telematics thresholds (hysteresis constants) are engineering defaults, not field-tuned.
- Alert rules: compliance monitors depend on secondary sources (register #15) — OFF by default.
- Local-storage backups are filesystem-level; no PITR for documents until S3.

## SECURITY (verification performed)

Committed-secret scan clean; `.env` git-ignored; SQL parameterized everywhere (drizzle) —
raw-SQL templates use bound params; no CORS enabled (same-origin proxy + origin check on
mutations); cookies HttpOnly+SameSite=Lax (+Secure via env); login rate-limited; RBAC on
every route (field-agent denial tested); IDOR/tenant-ID manipulation covered by RLS sweep;
uploads sniffed by magic bytes + size-capped; no debug endpoints; logs contain no
credentials (grep-verified). Fixed during this pass: tenant-scoped signed URLs + session
requirement, refund cap, blank-contract payment block, transition row-lock, seed production
guard, `??`→`COALESCE` raw-SQL bugs (would have 500'd, not corrupted).

## TEST RESULTS (final, from a clean environment)

- Database: reset → 7 migrations → seed — OK.
- Builds: domain, api (tsc), web (Next, 18 pages) — OK.
- **Domain tests: 25 passed.** **Integration tests: 47 passed** (1 file). Lint: 0 errors
  (45 unused-import warnings). Typecheck: 0 errors.
- Scenario coverage: A double-book (409), B maintenance conflict (409), C late-return
  overlap (409 + post-period OK), D replacement amendment (versioned), E cancel-after-payment
  (payment preserved), F concurrent transitions (exactly one wins), G cross-branch same
  vehicle (409 via exclusion).

## DEPLOYMENT (before a real agency uses the system)

1. Managed PG + migrations + app role; API `DATABASE_URL` → app role. 2. System Chromium +
   fonts stay bundled. 3. TLS terminator + `COOKIE_SECURE=true`. 4. Persistent storage volume
   (or early S3 adapter). 5. Single API replica (`ENABLE_SCHEDULER=true`) until the V2
   worker. 6. Owner onboarding: create agency/admin via script (no public signup — correct
   for B2B). 7. Backups: PG PITR + storage volume snapshots. Full guide: `docs/deployment.md`.

## RECOMMENDATION

**The repository is ready to begin V2.** The foundation (tenancy, financial integrity,
state machine, contracts, alert/event spine, honest integrations) is tested end-to-end from
a clean environment, and every deferral is documented with its migration path rather than
hidden.
