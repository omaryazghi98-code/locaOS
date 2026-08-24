# AGENTS.md — Working Contract for locaOS Contributors (humans and agents)

locaOS is the operating system for Moroccan car-rental agencies: vehicles → reservations →
customers → contracts → payments → deposits → inspections → telematics → maintenance →
fines → insurance → employees → operations → profitability → AI. The domain model — not the
frontend — is the architecture.

**Read before working:** [`docs/architecture/proposed-architecture.md`](docs/architecture/proposed-architecture.md),
the [domain model](docs/architecture/domain-model.md), the [ADR index](docs/decisions/README.md),
and the [roadmap phase you're in](docs/architecture/roadmap.md).
**Note:** the product research document is **missing** — see
[`docs/research/README.md`](docs/research/README.md). Never cite it or fabricate its contents.

## Non-negotiable rules

1. **Phase discipline.** Work only the current roadmap phase (plus agreed fixes). Do not
   implement future-phase systems because a task "touches" them. See roadmap entry gates.
2. **Tenant isolation.** Every tenant query goes through agency-scoped repositories inside
   the tenant transaction wrapper. Never write a query without an agency context. Cross-tenant
   tests must exist for every new tenant table.
3. **Vehicle status.** Mutate `operationalStatus` only through the fleet state-machine
   service (guards in `packages/domain`). There is no "update status" endpoint. Every
   transition writes `vehicle_state_transitions` + an audit event.
4. **Money.** Integer centimes + explicit currency. Floats never touch money. Financial
   records are append-only; corrections are reversal entries. Every financial write is
   audited; sensitive ones require a reason.
5. **High-impact actions are human-confirmed.** DETECT → EXPLAIN → ASK. Nothing
   auto-immobilizes, auto-charges, auto-blacklists, auto-contacts, or modifies contracts
   without an Approval record. (§14 of the product brief.)
6. **No dangerous legal encoding.** Legal/regulatory claims are tracked in
   [`docs/verification/register.md`](docs/verification/register.md); UNVERIFIED claims must
   not become hard-coded business rules — make them configuration and label the assumption.
7. **Honest integrations.** External systems (CMI, GPS providers, WhatsApp, e-signature,
   flights) exist only as ports + adapters that self-declare status
   MOCK/SIMULATED/UNAVAILABLE/CONNECTED, visible in the UI. Never silently simulate real
   data; never pretend an integration exists.
8. **No secrets in code.** Credentials live in environment variables / CI secrets. `.env*`
   is git-ignored. No credential values in commits, docs, logs, or test fixtures.
9. **Contracts are structured data.** Contract content is schema-versioned JSON rendered
   through templates; never hand-assembled HTML. Regeneration = new version. Numbering only
   via the per-agency sequence.
10. **Tri-lingual & Morocco-first.** fr (default) / ar (RTL) / en via catalogs — no hardcoded
    copy. MAD centimes, E.164 `+212…` phones, UTC storage + `Africa/Casablanca` rendering
    (tz shifts around Ramadan — never fixed offsets), cash-first payment reality.

## Definition of done (feature complete)

A feature is complete only with **database + backend + business logic + UI + validation +
error handling + tests** — including, where applicable: state-machine transition tests,
conflict tests, tenancy tests, append-only tests, idempotency tests, and i18n (incl. RTL) 
checks. A rendered UI is not "done".

## Workflow (per feature)

1. Understand existing architecture; read relevant ADRs.
2. Identify affected domain entities, workflows, security implications, migrations.
3. Define acceptance criteria (write them in the PR).
4. Backend/domain logic first, with tests → migrations → UI → validation/error handling.
5. Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration` (once scaffolded
   in Phase 1; until then, docs-only changes require nothing to run).
6. Review for regressions; never rewrite unrelated code in a feature PR.
7. Update documentation (ADRs for decisions; verification register for new external claims;
   roadmap checkboxes).

## Code conventions (summary)

TypeScript strict; conventional commits; intention-revealing service methods
(`checkInVehicle()`, not `update()`); typed domain errors mapped to HTTP in one interceptor;
domain package stays framework-free; provider SDKs confined to adapter packages; tests
colocated; migrations forward-only, never edit applied migrations.

## Current status

**Phase 0 (architecture) — in review. No application code exists yet.** Phase 1
(foundations: scaffold, CI, IAM, tenancy, audit, web shell) starts only after review approval
and, ideally, after the research document is supplied.
