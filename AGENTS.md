# AGENTS.md — Working Contract for locaOS Contributors (humans and agents)

locaOS is the operating system for Moroccan car-rental agencies: vehicles → reservations →
customers → contracts → payments → deposits → inspections → telematics → maintenance →
fines → insurance → employees → operations → profitability → AI. The domain model — not the
frontend — is the architecture.

**Read before working:** [`docs/architecture/proposed-architecture.md`](docs/architecture/proposed-architecture.md),
the [domain model](docs/architecture/domain-model.md), the [ADR index](docs/decisions/README.md),
the [roadmap version you're in](docs/architecture/roadmap.md), and — for anything the research
touches — [`docs/architecture/research-reconciliation.md`](docs/architecture/research-reconciliation.md).
The research document is present at
[`docs/research/moroccan-rental-platform-research.md`](docs/research/moroccan-rental-platform-research.md):
read it as product research with citations, **never as verified truth** — its claims are
classified in the [verification register](docs/verification/register.md).

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
   without an Approval record. (§14 of the product brief.) Research "system actions" that
   auto-bill, auto-deduct deposits, auto-tag customers, or auto-send legal statements are
   converted to `SUGGESTION`/`REQUIRE_APPROVAL` — see the conversion list in the
   [research reconciliation](docs/architecture/research-reconciliation.md) §3. Permanently
   rejected: automated starter-kill/immobilization, silent night-profiling of customers,
   employee behavioral/fatigue profiling. Telemetry never mutates vehicle status directly
   (ADR-0010 signals).
6. **No dangerous legal encoding.** Legal/regulatory claims are tracked in
   [`docs/verification/register.md`](docs/verification/register.md); UNVERIFIED claims must
   not become hard-coded business rules — make them configuration and label the assumption.
   Research claims are secondary sources: distinguish confirmed law vs industry practice vs
   recommendation vs hypothesis (reconciliation §5/§C).
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

**Phase 0 (architecture) — reconciled with the research document (2026-08-24); awaiting
product-owner approval of the MVP scope (open decision G.1). No application code exists
yet.** Phase 1 (foundations) starts only after MVP approval. The research terminology
crosswalk lives in the reconciliation §1.3 — preserve research terms (caution, Blank Slate,
ghost state, franchise, visite technique, vignette, Admission Temporaire, MRE, PLBS,
Constat Amiable) in UI copy and code comments.
