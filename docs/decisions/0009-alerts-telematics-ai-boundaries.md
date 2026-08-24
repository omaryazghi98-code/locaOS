# ADR-0009 — Alert rules engine, telematics port, read-only AI layer

- Status: Proposed — amended 2026-08-24 after research reconciliation
- Date: 2026-08-24

## Context

Three systems threaten to rot into scattered `if` statements: alerts (§12), GPS/telematics
(§13), and AI (§15). All three must respect "no dangerous automation by default" (§14) and
honest integration labeling (§26).

## Decision

**Alerts = data, not code.** Domain events are appended to an outbox; one evaluator consumes
them against `alert_rules` records (event type + JSON condition + severity + dedup window +
actionKind ∈ {NOTIFY, CREATE_TASK, REQUIRE_APPROVAL}). Adding an alert class = inserting a
rule row (versioned, auditable). Any action touching money, contracts, customers, or third
parties is REQUIRE_APPROVAL: it creates an Approval and executes nothing until a human
decides (DETECT → EXPLAIN → ASK). Security/tenancy system rules ship hard-coded alongside.

**Telematics = port + adapters.** `TelematicsProvider` is an interface in
`packages/telematics`; adapters (mock first; Teltonika when hardware + protocol is verified —
register #11) normalize provider payloads into internal events (VehicleMoved, IgnitionOff,
GpsDisconnected, GeofenceExited, …) ingested idempotently per provider message id. The domain
knows zero provider specifics; every adapter exposes its integration status
(MOCK/SIMULATED/UNAVAILABLE/CONNECTED), visible in the UI. GPS-derived alerts require
hysteresis (distance × duration × ignition) and evidence-stating language — GPS is
testimony, not verdict (critical-analysis §7).

**AI = read-only reasoner with typed answers.** The AI layer (V3; port exists from the start) queries data through
the same tenancy-scoped application services; it has no write path to domain data. Responses
are structured blocks typed FACT / INFERENCE / RECOMMENDATION / UNCERTAINTY, where every FACT
cites record IDs; confidence is explicit; no data is fabricated because answers are grounded
in retrieved records. Provider choice is deferred to its own ADR.

## Consequences

- Alert coverage scales without code sprawl; rule changes are auditable data changes.
- REQUIRE_APPROVAL adds latency to high-impact responses — deliberate (§14).
- Telematics ingestion must be idempotent and replayable (raw payloads retained).
- AI answers inherit RBAC + tenancy of the asking user.

## Alternatives considered

- **Hard-coded alerts per feature** — exactly the §12 anti-pattern; rejected.
- **User-authored rule code/expressions (DSL)** — unsafe and premature; declarative JSON
  conditions only; a DSL can evolve later above the same records.
- **AI with write access ("agentic ops")** — violates §14 until explicitly designed,
  reviewed, and authorized; rejected for the foreseeable roadmap.

## Amendment (research reconciliation, 2026-08-24)

- The research's 100-rule matrix + 20 hidden problems are classified into the six buckets
  (domain events / rules / signals / scheduled jobs / notification templates / AI insights) —
  see [reconciliation](../architecture/research-reconciliation.md) §3; the matrix becomes the
  first seeded rule pack, not new architecture.
- `actionKind` gains `SUGGESTION` (draft a human accepts) — research auto-bill/auto-tag/
  auto-contact concepts converted per §14; rejected concepts recorded with reasons
  (silent night profiling, employee fatigue profiling, automated starter-kill).
- Signals live in the derived-condition layer of ADR-0010, feeding this engine's alerts.
- **AI:** an `AiProvider` port keeps the core provider-agnostic; the research's "fine-tuned
  LLM on the agency database" is replaced by per-tenant grounded RAG + tool calls over the
  same tenancy-scoped application services (freshness, CNDP isolation, cost, lock-in —
  register #30); the research's example AI actions become drafted Approval requests.
  Typed answers (FACT/INFERENCE/RECOMMENDATION/UNCERTAINTY), record-ID citations, and
  confidence are unchanged and match the research's example output shape.
