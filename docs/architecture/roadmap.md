# locaOS — Phased Roadmap (Phase 0 proposal)

Sequencing follows Master Instructions §3 (foundations → advanced) and §25 (feature =
DB + backend + logic + UI + validation + error handling + tests). **A phase exits only when
its acceptance criteria pass; advanced systems stay out until their phase.**

---

## Phase 0 — Architecture (this document set) `IN REVIEW`

Deliverables: critical analysis, architecture, domain model, database model, app structure,
tech stack, roadmap, ADRs 0001–0009, AGENTS.md, copilot-instructions, README.

**Exit criteria:** owner review complete; open decisions below resolved or explicitly
deferred; **research document supplied** (blocking, critical-analysis §1).

Open decisions for review:
1. Tech stack ratification (ADR-0001..0009).
2. Vehicle status: single-enum now vs two-axis (physical × pipeline) — we propose single enum
   with documented precedence, revisit at GPS phase (critical-analysis §2).
3. Hosting region + CNDP formalities stance (register #3/#4) — deployment-time decision,
   documented not hardcoded.
4. PWA vs native for field operations (assumption A4).

## Phase 1 — Foundations

Scope: monorepo scaffold, Docker Compose, CI pipeline, Postgres + Prisma, migrations tooling,
Agency/Branch/User/Role/Permission/Session, login (argon2id sessions), RBAC guards, tenant
transaction wrapper + RLS, audit log skeleton, web shell (layout, nav, i18n fr/ar/en, RTL).

**Acceptance:** authenticated multi-agency login; cross-tenant access tests pass (both layers);
permission denial tested; audit rows for auth events; zero-trust CI green; a seeded demo agency.

## Phase 2 — Fleet & customers

Scope: Vehicle CRUD via state-machine service (states + transitions + audit), categories,
models, vehicle documents with expiry alert rule (first alert-rule usage), customer profiles +
encrypted identity documents + flags (human-confirmed), search-first UI (dense tables).

**Acceptance:** illegal transitions rejected with reasons; every legal transition audited;
document-expiry rule fires; identity numbers encrypted at rest + masked in UI; tenant
isolation tests extended; PDF of vehicle doc report (first PDF path).

## Phase 3 — Reservations

Scope: reservation lifecycle, quotes (versioned pricing policy), calendar (per vehicle/branch/
category), conflict detection via exclusion constraints, category→vehicle assignment with
retry, cancellation/no-show, employee assignments + conflict checks.

**Acceptance:** concurrent booking race test (one txn loses cleanly, 409 with conflict list);
maintenance windows block reservations; readiness checklist generated; calendar UI renders a
week of a 50-vehicle fleet with departures/returns; E2E booking flow (first Playwright suite).

## Phase 4 — Contracts

Scope: structured templates (fr/ar/en), numbering authority, full contract generation from
reservation data, versions + amendments (vehicle replacement, drivers, price change with
permission+reason), signatures (image capture), **blank contract issue/reconcile/void**,
PDF pipeline (Chromium; Arabic shaping verified).

**Acceptance:** contract content is structured JSON (no HTML blobs); regeneration = new
version; blank contract number reconciliation with gap report; Arabic PDF renders RTL
correctly; amendment price change audited with actor+reason; tests for numbering races.

## Phase 5 — Inspections & field operations (PWA offline)

Scope: departure/return inspections, checklists, photo slots, damages (departure/return diff),
customer+employee acknowledgement, offline outbox + idempotent sync, delivery/pickup tasks +
cleaning tasks feeding vehicle states, day-view for field agents.

**Acceptance:** full inspection completed with airplane mode, synced without duplicates;
conflicting edits produce anomaly alert not silent overwrite; vehicle pipeline
RENTED→AWAITING_INSPECTION→INSPECTED→CLEANING→AVAILABLE driven end-to-end; photo upload
hardened (type/size/checksum).

## Phase 6 — Payments, deposits, reconciliation

Scope: payments (cash/card/transfer; append-only + reversals), deposit lifecycle (hold/
preauth→release→charge with approval gate), invoices + lines, cash sessions (open/count/close/
variance), outstanding balances, contract settlement, daily reconciliation report.

**Acceptance:** payments immutable (DB trigger test); correction = reversal entry; deposit
charge requires Approval; variance report attributes to session/actor; "what should be in the
drawer" answered per branch/day; finance audit events complete.

## Phase 7 — Maintenance

Scope: maintenance tasks + blocking windows, records with costs/downtime, document renewals
(VT/insurance/vignette expiries → configurable lead-time alerts; periodicity configurable —
register #5), vehicle downtime history.

**Acceptance:** maintenance window blocks reservation (constraint + UI warning); costs feed
vehicle P&L; expiry alerts configurable per agency; conflicting maintenance vs reservation
attempts produce actionable errors.

## Phase 8 — Alerts & notifications engine

Scope: rule registry (declarative records), evaluation worker on domain events, dedup,
severity, acknowledgement workflow, in-app notifications; system rule pack (operational,
financial, compliance basics); Approval actions from §14.

**Acceptance:** new alert class added by inserting a rule record (no code change); dedup
windows hold; REQUIRE_APPROVAL actions execute nothing without human decision; alert storm
test (100 events → bounded alert count).

## Phase 9 — Reporting, morning brief, profitability

Scope: daily ops snapshots (event-materialized, rebuildable), morning/end-of-day briefs
(§16 format), fleet utilization, revenue/downtime per vehicle, cash outstanding views,
utilization vs price sanity reports.

**Acceptance:** brief matches ground truth on seeded scenarios (golden tests); snapshot
rebuild == incremental result; brief loads < 500ms on 100k reservation dataset.

## Phase 10+ — Advanced systems (each gated by its own ADR before start)

| Phase | System | Entry gate |
|---|---|---|
| 10 | Fines & customer intelligence | Attribution workflow reviewed (§14); sources verified (register #13) |
| 11 | GPS/telematics ingestion + geofences | Real device data contract + provider selected; hysteresis design reviewed (critical-analysis §7) |
| 12 | WhatsApp / SMS notifications | Meta business API cost/policy review; opt-in + consent handling |
| 13 | AI copilot (read-only, typed answers) | Data model cited-record grounding; ADR-0009 scope accepted |
| 14 | Predictive maintenance, dynamic pricing, OCR/CV damage assist | Historical dataset volume threshold; §9/§15 constraints restated in ADR |

## Standing rules across all phases

- Every phase's PR references affected ADRs; new assumptions go to the verification register.
- No integration ships without its adapter's honest status label.
- Each phase ends with a demo script ("a day in the agency") exercising its flows end-to-end.
