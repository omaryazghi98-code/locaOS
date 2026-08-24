# Phase 0 — Critical Analysis

Findings, contradictions, assumptions, and technically questionable requirements identified
before proposing the architecture. Sources: the Master Agent Instructions (present) and
external verification ([verification register](../verification/register.md)).

---

## 1. The source-of-truth research document is missing — blocking finding

`docs/research/moroccan-rental-platform-research.md` does not exist in the repository
(see [`docs/research/README.md`](../research/README.md)). The instructions require reading it
before architectural decisions and treating its claims as research, not truth. Consequence:

- Phase 0 proceeds from the Master Agent Instructions alone.
- **No research-derived claim is treated as verified.** All 14 claims currently tracked in the
  verification register that would have come from the research remain UNVERIFIED.
- Product decisions below are proposals explicitly staged for owner review — which §28
  ("present the architecture for review") already mandates.

This must be resolved before Phase 1 exits its first milestone.

## 2. Vehicle state machine — the 14-state list overloads one axis

The required state vocabulary mixes **three different concepts**:

| Concept | Example states | Nature |
|---|---|---|
| Operational readiness of the physical asset | MAINTENANCE, ACCIDENT, IMMOBILIZED, CLEANING, UNAVAILABLE | Set by staff / events |
| Rental pipeline position | RESERVED, PREPARING, CONTRACT_READY, IN_TRANSIT, RENTED, AWAITING_INSPECTION, INSPECTED | Derived from reservation/contract workflow |
| Derived condition | OVERDUE | Computed (rented past contract end) |

Specific issues:

- **`RESERVED` is not a vehicle state.** A vehicle with a reservation starting in 3 weeks is
  physically `AVAILABLE`. Flipping status on booking would make the fleet calendar lie and
  break overbooking detection. Proposal: vehicle status moves to `RESERVED`→`PREPARING` only
  inside a configurable preparation window before pickup; future commitments live in the
  reservation calendar, and "blocked" is a *derived* view (reservations ∪ maintenance ∪ holds).
- **`OVERDUE` is a condition, not a transition.** Materializing it as a state is useful for
  queries/alerts, but it must be entered/exited by a scheduled evaluator, never by hand, or a
  later return will strand the state. Rule: derived states are owned by the system.
- **`RETURNED` is missing** — the list jumps RENTED→OVERDUE→AWAITING_INSPECTION. We model the
  return moment as the `RENTED → AWAITING_INSPECTION` transition (check-in), which is fine,
  but the transition table must make this explicit.
- **Fleet lifecycle is missing entirely.** Nothing represents acquisition or disposal.
  Proposal: a separate, slow-changing axis `fleetStatus: IN_FLEET | FOR_SALE | SOLD | RETIRED`
  independent of operational status.
- **Exceptional states conflict with the pipeline.** A rented vehicle that crashes is
  simultaneously `RENTED` (contract open) and `ACCIDENT` (physical reality). A single enum
  forces losing one fact. Mitigation for Phase 0–2: keep one enum (as instructed) but define
  precedence + mandatory exit paths (e.g., ACCIDENT must resolve to MAINTENANCE or
  AWAITING_INSPECTION, never silently back to AVAILABLE); revisit a two-axis model
  (physical state × rental pipeline) before GPS phase if state explosions occur in practice.

## 3. Reservations — "detect double bookings" requires database-level enforcement

Application-level checks race under concurrency. PostgreSQL exclusion constraints
(`EXCLUDE USING gist (vehicle_id WITH =, period WITH &&)`) make overlapping *active*
reservations per vehicle physically impossible — the correct backbone; the UI check becomes
UX, not integrity. Same for maintenance windows (a maintenance "hold" is modeled as a blocking
calendar entry, not ad-hoc if-statements).

## 4. Contract engine — the blank-contract workflow creates a reconciliation liability

Issuing numbered blank paper contracts means **numbers leave the system and come back later**.
Required mechanics (missing from the brief but implied by "reconcilable"):

- Issuing a blank contract *reserves* a number and creates a stub record
  (`status = BLANK_ISSUED`, actor, branch, timestamp).
- Reconciliation links the paper sheet to a reservation/contract or records it
  `VOIDED` with a reason — gaps in sequences are visible, explainable, auditable.
- Unsigned paper and digital records must never fork numbering: one per-agency sequence,
  one numbering authority (the database).

**Legal caution:** whether Moroccan law/regulation prescribes mandatory contract clauses for
location de voitures is UNVERIFIED (register #8/#14). Templates ship as *configurable data*
with a default derived from common agency practice, labeled "not legal advice."

## 5. Offline-first inspections vs. data integrity — the brief is silent on conflicts

Offline capture (photos, signatures, mileage) implies ** concurrent mutation of the same
inspection** after reconnect (two employees, or employee + office). Requirements implied but
unstated: idempotent submission (client-generated UUIDs), server-side last-write-wins per
*field group* with full version history retained, photos uploaded out-of-band with checksum
verification. Also: `location` capture on inspection is a privacy-sensitive field (Law 09-08,
register #3) — retention policy must be configurable, not infinite.

## 6. Alert engine — "rules engine" must not become an unbounded DSL

Risk: building a pseudo-programming language inside the product before the domain is stable.
Phase-appropriate design: **declarative rule records** (event type + JSON conditions +
severity + action template + dedup window) evaluated by one engine, with hard-coded *system*
rules for tenant-isolation/security. Rules are data (versioned, auditable), not user-authored
code. The `DETECT → EXPLAIN → HUMAN CONFIRMS` gate (§14) applies to every rule whose action
touches money, contracts, customers, or third parties — encoded as an `actionKind` that
requires an approval record.

## 7. GPS intelligence — "GPS contradiction" alerts need epistemics

GPS is noisy (urban canyons, tunnels, device sleep, timezone-drifty trackers). A naive
"vehicle moved while AVAILABLE → CRITICAL" rule will produce false accusations — precisely
what §14 forbids by default ("accuse customers of fraud"). Requirements: hysteresis
(distance × duration × ignition), device-health state, and alert text that states evidence,
not conclusions. The telematics *port* must normalize provider quirks (Teltonika codec
specifics, AVL ACK semantics) behind internal events, with integration-status labels
(MOCK/SIMULATED/UNAVAILABLE/CONNECTED) surfaced in UI.

## 8. Financial integrity — corrections, not edits, and reconciliation needs a model

The brief covers immutability + audit but not the mechanism. Proposal: financial records
(payments, deposits, invoices) are **append-only; corrections are linked reversal entries**.
Daily cash reconciliation requires three distinct concepts: *expected* (sum of cash movements
by drawer/session), *counted* (staff-declared physical count per denomination), and
*variance* (explained/unexplained, attributed to sessions and actors). Without modeled
sessions (open/close by employee, per branch), "who handled it" is unanswerable.

## 9. Multi-tenancy — "backend enforcement" needs defense in depth

One mechanism fails silently. Proposal: (1) application layer — tenant-scoped repositories
that *cannot* be constructed without an agency context; (2) database layer — PostgreSQL RLS
policies keyed on a session variable set per transaction; (3) tests that attempt cross-tenant
reads/writes and assert rejection. Super-admin cross-agency access, if ever built, must be an
explicit, separately-authorized path with its own audit records — not a bypass of scoping.

## 10. AI layer — answer typing must be structural, not stylistic

"FACT / INFERENCE / RECOMMENDATION / UNCERTAINTY" only works if enforced by the response
schema and grounded in retrieved records (every FACT cites record IDs). Phase 0 decision: the
AI layer is a *reader* with no write path to domain data; any recommendation executes through
the same guarded domain services humans use. No fabrication is structurally impossible, but
grounding + citation + typed output + confidence is the achievable bar.

## 11. The morning brief requires a computed snapshot, not 40 live queries

Departures/returns/utilization/expected cash per day per branch should be materialized
incrementally (events update the snapshot) rather than aggregated on page load — otherwise the
dashboard that must feel instant becomes the slowest screen. Snapshot table, event-driven
updates, recomputable from source events (deterministic rebuild = testability).

## 12. Morocco-first facts — several are assumptions, two conflict

- Timezone: Africa/Casablanca shifts to UTC+0 around Ramadan (register #10) — all scheduling
  must use stored UTC + IANA tz rendering, never fixed offsets.
- Money: MAD; store integer centimes despite market habit of whole-dirham pricing.
- NARSA technical-inspection periodicity **conflicts across secondary sources** (register #5)
  — expiry-date fields ship configurable; no automatic compliance verdicts.
- CMI verified as the online-payment path (register #1); card payments must never be assumed
  (§18) — cash and transfer are first-class methods.
- CNDP/Law 09-08 (register #3/#4): prior declaration and cross-border transfer rules exist —
  a deployment/hosting concern surfaced in docs, not a product-code rule.

## 13. Scope discipline — §4's entity list vs. §3's "don't build everything"

The 30+ entities are the *target* domain model, not the Phase 1 schema. Database tables are
introduced per phase, but each table's design must not contradict the target model — hence
documenting the full model now, implementing incrementally.

## 14. Security posture — additions the brief implies but doesn't list

Rate limiting + input validation + CSRF are named; the offline/PWA + API architecture also
requires: per-device session management (inspectors use shared/poor networks), photo upload
hardening (type/size verification, EXIF stripping option for privacy), and object-store access
control (signed URLs, no public buckets). Secrets only via environment variables; no
provider credentials in code — already absolute.

---

## Assumptions register (product-level, pre-research-document)

| # | Assumption | Impact if wrong |
|---|---|---|
| A1 | Agencies operate 1–3 branches; owner is primary user | Authorization model granularity |
| A2 | Cash + card + bank transfer cover Phase 6; online payment (CMI) is later | Payment module sequencing |
| A3 | French-first UI, Arabic RTL + English required for contracts & UI | i18n/PDF complexity (Arabic shaping in PDFs) |
| A4 | PWA meets offline inspection needs (no native app required initially) | Mobile architecture; BLE/OBD would force native later |
| A5 | Hybrid paper/digital contracts persist for years | Contract reconciliation subsystem is core, not transitional |
| A6 | Agencies own vehicles directly (no third-party owner settlements in v1) | Fleet financial model |
| A7 | GPS hardware is aftermarket trackers (Teltonika-class), not OEM | Telematics adapter design |

All subject to revision when the research document is supplied.
