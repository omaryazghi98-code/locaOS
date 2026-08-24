# locaOS — Roadmap (post-research-reconciliation)

Cut into a shippable **MVP** and versioned increments V1–V3, reconciled with the research
priority matrix ([reconciliation](research-reconciliation.md) §E–F). A scope item exits only
when its acceptance criteria pass; advanced systems stay out until their version. Internal
phase numbers (1–9) remain for engineering sequencing inside the MVP.

---

## MVP — "Run the desk, the paper, and the drawer" (Phases 1–6 + slices)

Small enough to ship, strong enough to sell: reservations → contracts → inspections → money,
with the cash-reconciliation moat (killer feature #1) included. Zero external dependencies.

### Phase 1 — Foundations
Monorepo scaffold, Docker Compose, CI, Postgres + Prisma, migrations, Agency/Branch/User/
Role/Permission/Session (Owner/Manager/Agent/Field agent/Accountant/Mechanic seed), login
(argon2id sessions), RBAC guards, tenant transaction wrapper + RLS, audit log skeleton, web
shell (FR default, AR RTL; EN UI in V1).
**Exit:** multi-agency login; cross-tenant tests pass at both layers; permission denials
tested; auth events audited; seeded demo agency; CI green.

### Phase 2 — Fleet & customers
Vehicles via state-machine service (14 states + transitions + audit, ADR-0010), categories,
models, vehicle documents (VT/insurance/vignette expiries → first alert rules), customers +
encrypted identity documents + human-confirmed flags, consent records (CNDP), compliance
pack (fleet-size/age-cap monitors — OFF by default, G.2), search-first dense UI.
**Exit:** illegal transitions rejected with reasons; legal transitions audited; expiry rules
fire; identity numbers encrypted + masked; tenancy tests extended.

### Phase 3 — Reservations
Reservation lifecycle, versioned quotes with **floor-price warning** (MAP), calendar
(vehicle/branch/category), exclusion-constraint conflict detection, category→vehicle
assignment with retry, cancellation/no-show, employee assignments + conflict checks, flight
fields captured (no tracking yet).
**Exit:** concurrent booking race test (one txn loses cleanly → 409 with conflict list);
maintenance windows block reservations; readiness checklist generated; E2E booking suite.

### Phase 4 — Contracts
Structured templates (**FR + AR in MVP; EN V1**), per-agency numbering authority, full
generation from reservation data, versions + amendments (vehicle replacement carries
deposit/insurance continuity), insurance block (franchise/CDW/Super CDW/exclusions →
inspection zones), cross-border authorization block, driver eligibility pack, image
signatures + content hash, **Blank Slate issue/reconcile/void + gap report + scanned-sheet
evidence**, PDF pipeline (Arabic RTL verified).
**Exit:** content is structured JSON; regeneration = new version; numbering race test;
Arabic PDF golden test; amendment price change audited with actor+reason.

### Phase 5 — Inspections & field operations (PWA offline)
Departure/return inspections, standardized photo slots, damage departure/return diff,
acknowledgements, offline outbox + idempotent sync, delivery/pickup + cleaning tasks
(**triage by next departure**) feeding vehicle states, field day-view. Performance budget:
**full handover < 60 s** (research requirement, adopted).
**Exit:** airplane-mode E2E without duplicates; conflicting edits → anomaly alert; vehicle
pipeline RENTED→…→AVAILABLE end-to-end; uploads hardened.

### Phase 6 — Payments, deposits, reconciliation
Payments append-only (cash incl. **EUR/USD at human-confirmed rate**/card/transfer) +
reversals, deposit lifecycle (cash, manual preauth record, `preauth_expires_at` signal),
charges require Approval, invoices (Art. 145 CGI mentions validation) + lines, cash sessions
(per-currency counts, variance, explanation), settlement, outstanding balances.
**Exit:** immutability trigger test; correction = reversal; "what should be in the drawer"
answered per branch/day; variance attributed; finance audit complete.

### MVP slices (thin versions of later phases)
- **Brief (from Phase 6 data):** in-app morning/EOD brief — departures, returns,
  utilization, expected cash **+ expected cautions**, critical items (snapshot-based, <500 ms).
- **Alert core + seed rule pack (~25 rules):** rule engine + signals (ADR-0009/0010) with
  document expiries, readiness, missing caution/contract, overdue, cash variance, compliance
  monitors (off by default).

**NOT in MVP:** GPS hardware ingestion (MOCK adapter only), WhatsApp API, qualified
e-signature, CMI/Fatourati, DGI clearance, OCR/CV, AI copilot, dynamic pricing, predictive
maintenance, risk score, fines module, transfer optimization.

## V1 — Money & channels (≈ research SHOULD-HAVE)

CMI online payments + Fatourati payment links (pending creditor-onboarding facts), card
pre-authorization (PLBS) integration for deposits, WhatsApp Business notifications
(confirmations, reminders, doc requests, payment links — G.4; manual share-links as interim),
qualified e-signature pilot Damanesign/Barid eSign (G.3), invoice UBL/CII export config
(Art. 145 hard validation), customer intake links (pre-arrival population), 2FA step-up,
garage SLA views, EN templates + EN UI, reconciliation polish, briefs via WhatsApp push.

## V2 — Fleet intelligence & Moroccan moat (≈ research DIFFERENTIATOR)

Teltonika adapter (real devices) + geofences (Ceuta/Melilla/Tanger Med), signals live
(ghost/phantom/unauthorized/maintenance-conflict), EV pack (SoC events, charging-time
calendar blocking), NARSA fine matcher manual-assist → OCR bet (G.7), transparent customer
risk score (G.6 — objective events, suggestions only), true vehicle P&L (maintenance,
insurance, GPS subscriptions, depreciation), fleet rebalancing advisor, B2B churn +
profit-padding reports, flight tracking for airport dispatch, subrogation dossier compiler.

## V3 — Prediction & copilot (≈ research ADVANCED AI, minus rejected items)

AI copilot (grounded, typed FACT/INFERENCE/RECOMMENDATION/UNCERTAINTY, per-tenant, no write
path, AiProvider port), predictive maintenance, dynamic pricing **advisor** (owner-approved
rules only), CV damage triage (only after inspection workflows are proven, §9), liquidation
advisor (manual valuations), weather pricing signals. Permanently excluded: "smart
contracts", fine-tuned LLM, covert profiling, automated immobilization.

## Standing rules across all versions

- Every PR references affected ADRs; new external claims enter the verification register.
- No integration ships without its adapter's honest status label (MOCK/SIMULATED/
  UNAVAILABLE/CONNECTED).
- Each version ends with a demo script ("a day in the agency") exercising its flows.
- Deferred features live behind ports/config/rule records so no decision above requires
  rework of the core (see reconciliation §G readiness note).
