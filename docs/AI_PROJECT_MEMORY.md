# locaOS — Persistent AI Project Memory

**Purpose:** This file is the persistent memory contract for every AI agent, coding assistant, reviewer, designer, or autonomous tool working on locaOS.

> **READ THIS BEFORE CHANGING THE PROJECT.**
>
> Chat history is not the source of truth. AI context may be compressed, sessions may be independent, and agents may not know what was discussed previously. Important product decisions therefore belong in the repository.

## 1. Required reading order

Before implementation, architecture changes, refactors, or feature planning, read:

1. `docs/AI_PROJECT_MEMORY.md` — this file; persistent product/architecture memory.
2. `docs/AI_HANDOFF.md` — current engineering state, verified work, blockers, and workflow audit.
3. `docs/LOCAOS_MASTER_PRODUCT_SPEC.md` — broader product specification and roadmap.
4. `docs/PHASE_ZERO_ARCHITECTURE_GUARDRAILS.md` — non-negotiable architecture seams and future-proofing rules.
5. Relevant UX/design docs under `docs/ux/`.
6. Recent git history and the current branch state before modifying anything.

If these documents disagree, **do not silently choose one**. Determine which document is newer/canonical, preserve the conflict as a documented decision, and update the relevant source-of-truth documents.

## 2. Why this file exists

locaOS is intended to become an operational platform for rental agencies, not merely a CRUD rental application.

The central principle is:

`ONE OPERATIONAL TRUTH → AGENCY CONSOLE + AGENCY-BRANDED CUSTOMER EXPERIENCE + FUTURE FIELD/MOBILE/AI WORKFLOWS`

The product must make money for the agency and protect the agency from operational mistakes. Features that affect reservations, availability, pricing, deposits, payments, contracts, vehicle state, settlement, inventory, or customer commitments must therefore be treated as financial/operational logic, not cosmetic UI.

**Never delete, narrow, or forget a previously agreed capability simply because it is not in the current sprint.** If a feature is deferred, record it as deferred rather than silently removing it from the product model.

## 3. Product north star

locaOS should progressively provide:

- rental reservations and availability
- fleet and vehicle lifecycle management
- customer/driver CRM and identity
- quotes and configurable pricing
- contracts, amendments, signatures and document packages
- departure/return inspections and evidence
- deposits, payments, refunds and cash reconciliation
- authoritative final settlement
- maintenance and workshop operations
- washing/cleaning/preparation operations
- dispatch/task marketplace capabilities
- communications including WhatsApp, SMS, email, push and telephony
- owner/manager reporting and operational control
- compliance and document expiry/risk
- GPS/telemetry integrations
- agency-branded public/customer websites
- customer portal, online booking and payment links
- trip planning, routes, POIs, vehicle recommendations and flight tracking
- loyalty/rewards
- integration adapters for relevant external/government/regulated systems where access and legal basis are actually validated
- operational memory and AI copilot capabilities inspired by the useful parts of Pieces
- eventual mobile/PWA/offline field workflows
- future platform control plane for multi-agency administration, entitlements, billing and support

This list is a **feature memory**, not a claim that every item is implemented today.

## 4. First-class rental extras / add-ons — DO NOT FORGET

A rental reservation must support optional paid or included **extras/add-ons** as real commercial entities.

Examples seen across European rental practices and relevant to Morocco include:

- infant/baby seat
- toddler/child seat
- booster seat
- stroller
- additional driver
- GPS/navigation device where offered
- mobile Wi-Fi/hotspot where offered
- toll/transponder service where offered
- prepaid fuel/refuelling option
- EV charging-related service where applicable
- roadside assistance upgrades
- protection/coverage upgrades
- young-driver service/fee where applicable
- cross-border travel option where offered and permitted
- winter tyres/equipment
- snow chains
- roof rack
- ski rack
- bicycle rack
- surfboard rack
- luggage equipment
- vehicle delivery / collection
- after-hours pickup/return
- one-way/drop-off service
- vehicle upgrade
- agency-defined custom extras

This list is inspiration, **not a hardcoded mandatory catalog**. Agencies must be able to configure their own extras.

### Extras must be modeled properly

Do NOT implement this as vehicle/reservation booleans such as `hasBabySeat=true`.

An extra should have a configurable catalog/product definition and a reservation/quote line when selected. Pricing must support at least:

- per rental
- per day
- quantity-based pricing
- included/free extras
- optional vs required extras
- branch availability
- category/vehicle applicability
- date/season rules where needed
- customer/channel rules where needed
- inventory limits where the extra is physical
- taxes/fees where applicable
- currency and confirmed FX where applicable
- authorized discounts/overrides
- cancellation/refund behavior

### Physical extras are inventory

Baby seats, boosters, GPS devices, racks, Wi-Fi units and similar physical equipment cannot be sold beyond actual inventory.

The architecture should eventually support:

`EXTRA CATALOG → EXTRA INVENTORY → RESERVATION ALLOCATION → HANDOVER → RETURN → CONDITION/LOSS/DAMAGE → SETTLEMENT`

A physical extra may itself require inspection/condition evidence and can generate a settlement charge if lost/damaged/late returned, subject to agency policy and applicable law.

### Commercial truth

Selected extras must flow through the same financial truth as the rental:

`CATALOG → QUOTE → RESERVATION → CONTRACT SNAPSHOT → SETTLEMENT → PAYMENT/REFUND → REPORTING`

Historical signed/closed records must retain the exact extra, quantity, price, currency, policy/rule version, and applicable taxes/fees used at the time.

## 5. Pieces-inspired operational memory

The project previously identified **Pieces** as an important inspiration. The goal is not to copy Pieces or make it a dependency. The useful concept is a structured, searchable, user-controlled memory/context layer over real operational activity.

locaOS should eventually make the operational history of a rental understandable as a timeline rather than scattered database rows.

Example:

`Reservation created`
→ `Vehicle assigned`
→ `Quote accepted`
→ `Contract prepared`
→ `Deposit secured`
→ `Departure inspection completed`
→ `Handover/activation`
→ `Extension requested`
→ `Manager approved`
→ `WhatsApp sent`
→ `Vehicle returned late`
→ `Return inspection`
→ `Damage evidence added`
→ `Settlement calculated`
→ `Deposit applied`
→ `Contract closed`

The system should eventually answer questions such as:

- What happened with this rental?
- Why is this vehicle blocked?
- Who contacted the customer?
- What decision did the manager approve?
- What evidence supports this charge?
- What happened the previous time this vehicle had a similar issue?
- What changed since yesterday?

### Memory architecture rules

Operational memory must be built from structured facts/evidence, including:

- tenant/agency/branch
- actor or system
- timestamp
- event/action type
- subject
- linked reservation/contract/customer/vehicle/task/case
- outcome/result
- reason/note
- evidence/document/photo reference
- correlation/request ID
- provider/external reference where relevant

AI may **detect, summarize, explain, recommend, retrieve context, and prepare actions**. It must not silently rewrite authoritative records, fabricate evidence, bypass permissions, or make autonomous punitive/high-impact decisions.

## 6. Commercial model must remain extensible

Do not encode commercial policy as one boolean or hardcoded constant.

The pricing foundation must eventually support:

- category/vehicle pricing
- duration bands
- seasonal/date rules
- channel/customer rules
- authorized discounts
- minimum/floor/MAP rules and overrides
- unlimited mileage
- included mileage per day/rental
- excess mileage pricing
- paid unlimited-mileage upgrade
- extras/add-ons
- deposits/deductibles
- multiple currencies
- confirmed transaction FX snapshots
- agency-specific pricing policies
- future dynamic pricing without rewriting historical records

Effective policy/rule versions must be preserved with quotes/contracts/settlements.

## 7. Authoritative rental lifecycle

The core operational journey is:

`CUSTOMER → RESERVATION → CATEGORY/VEHICLE → QUOTE → CONTRACT → DEPARTURE INSPECTION → DEPOSIT → READY → HANDOVER/ACTIVATION → ACTIVE RENTAL → EXTENSIONS/ALERTS → RETURN INSPECTION → DÉCOMPTE FINAL → PAYMENT/DEPOSIT APPLICATION → CLOSE → VEHICLE FLEET STATE`

Every state transition must be server-authoritative, tenant-scoped, permission-checked, auditable, and protected against stale state/concurrency where relevant.

The final settlement engine must eventually account for:

- rental base
- extensions
- late return
- mileage
- fuel
- extras
- applicable fees/fines
- damage
- discounts/amendments
- deposit application
- multiple payments
- refunds/reversals
- overpayment/underpayment
- currency/FX where applicable

Closed settlement results must be immutable/snapshot-able and explainable.

## 8. External integrations — preserve seams

All external systems use:

`locaOS domain → integration port → provider adapter → external system`

Incoming:

`external event/webhook/file → adapter → normalized domain event`

Potential integration families include:

- WhatsApp
- SMS
- email
- push notifications
- telephony/PBX/SIP/click-to-call
- payment service providers/payment links
- GPS/vehicle telemetry
- maps/routing/POIs
- flight tracking
- identity/OCR/document verification
- e-signature
- secure document storage
- accounting/invoicing systems
- workshops/mechanics
- washing/preparation providers
- future partner/task providers
- NARSA
- DGSN
- DGSSI
- other government or regulated services

### Government integration warning

Do not assume NARSA, DGSN, DGSSI, or any other institution exposes a public API or that a private rental agency automatically has access. Do not invent protocols, permissions, legal requirements, or data-sharing rights.

These remain **RESEARCH / VALIDATION** until official access, legal basis, security requirements, technical documentation, credentials, and operating conditions are confirmed.

## 9. Communications are channel-independent

Customer communication should be an operational activity, not a WhatsApp-only feature.

A communication activity should eventually link to the relevant customer/reservation/contract/vehicle/case/task and preserve actor, time, channel, provider status, template/message identity, and outcome where available.

WhatsApp-specific concerns such as templates, opt-in/consent, delivery status and provider IDs belong in the adapter.

## 10. Public/customer experience

Future customer-facing sites are separate permission surfaces over the same operational truth.

Architecture should support agency-branded public websites with:

- agency branding/theme/domain
- real availability
- real pricing
- online booking
- payment links
- customer portal
- contract/documents
- trip planner
- destinations/routes/POIs
- vehicle recommendations
- flight tracking
- WhatsApp/contact
- SEO
- analytics and consent

Public applications consume controlled public projections/APIs. Never expose internal tenant tables, operator permissions, secrets, or admin endpoints directly.

## 11. Fleet, workshops, washing and dispatch

Future ecosystem seams must support:

### Workshops / repairers

- providers
- mechanics
- work orders
- estimates
- approvals
- parts/labour
- maintenance history
- downtime/cost/performance
- partner relationships
- provider loyalty/rewards

### Washing / preparation

- wash locations
- wash/prep jobs
- queues
- handoffs
- checklists
- photo/evidence
- internal or external providers
- pricing
- performance
- loyalty

### Generic tasks / dispatch

One task foundation should support:

- vehicle delivery
- vehicle pickup
- airport/hotel meet-and-greet
- branch transfer
- vehicle relocation
- washing/prep
- fueling
- workshop run
- document pickup
- future third-party dispatch

Tasks should be assignable, stateful, independently auditable, and linkable to agency/branch/customer/vehicle/reservation/contract/case.

## 12. Loyalty / rewards

Do not implement loyalty as a single customer `points` field.

Use a configurable ledger capable of supporting:

- program owner
- eligible actor/entity
- earning rules
- redemption
- points/credits/rewards
- tiers
- expiry
- adjustments/reversals
- campaigns
- partner-funded rewards
- complete audit history

The same foundation should eventually work for rental customers, workshops/repair providers, washing/cleaning providers and other partners.

## 13. Identity, documents and Moroccan workflows

Keep secure canonical identity data separate from:

- operator presentation
- customer-facing documents
- exports
- retention policies
- authorization/procuration documents

Leave explicit seams for OCR, identity verification, document validation, e-signature, secure storage and authorization documents.

Do not assume a rental contract is automatically a generic `wakala` / power of attorney. Cross-border or special authorizations are explicit document/use cases and require current legal validation.

Do not hardcode a field as legally mandatory solely because it appeared on a sample contract. Moroccan legal/regulatory requirements must be validated against current authoritative sources.

## 14. Management and platform control

Owner/manager reporting is a first-class product goal.

Eventually support drill-down into:

- revenue
- outstanding balances
- deposits
- utilization
- profitability by vehicle/category
- maintenance cost/downtime
- compliance/document expiry risk
- overdue rentals
- reservations at risk
- missing signatures/deposits/inspections
- alerts/exceptions
- staff activity
- service-provider performance
- channel performance

A future platform control plane is separate from agency operations and covers tenant provisioning, entitlements/features, billing, provider configuration, health, support, audit, suspension/reactivation and controlled break-glass access.

No hidden unrestricted “God mode.”

## 15. AI-agent operating rules

Every AI working on locaOS must:

1. Read this file and the required companion docs before changing code.
2. Inspect the current branch and recent history before assuming state.
3. Treat the repository as the source of truth, not chat memory.
4. Preserve unrelated existing work.
5. Never force-push, reset, or delete work to resolve a conflict without explicit authorization.
6. Never replace the NestJS/PostgreSQL domain source of truth with a prototype frontend/backend.
7. Keep experimental Bolt/Lovable/DesignArena/Vite work isolated from the monorepo unless explicitly promoted.
8. Use provider adapters for external integrations.
9. Never fabricate government API access or legal requirements.
10. Never silently change historical financial/contract truth.
11. Preserve tenant isolation and server-side authorization.
12. Add regression tests for financial, lifecycle, concurrency, idempotency and authorization changes.
13. Run the appropriate typecheck/build/test suite after implementation.
14. Update this file or `AI_HANDOFF.md` when a meaningful product/architecture decision or newly discovered feature is added.
15. When an idea is not being implemented now, mark it **DEFERRED**, not forgotten.
16. When a feature changes the commercial model, explicitly check quote → reservation → contract → settlement → reporting implications.
17. When a feature involves physical inventory, explicitly check allocation, handover, return, condition, loss/damage and availability.
18. When a feature involves AI, explicitly identify what remains human-authoritative.

## 16. Feature-state vocabulary

Use these labels in project documents:

- **IMPLEMENTED** — exists and verified.
- **IN PROGRESS** — actively being implemented.
- **PLANNED** — agreed product capability not yet implemented.
- **DEFERRED** — intentionally postponed but retained in product memory.
- **RESEARCH** — concept requires product/technical/legal/provider validation.
- **BLOCKED** — known dependency prevents implementation.
- **REJECTED** — explicitly decided not to build.

Never silently convert PLANNED/DEFERRED/RESEARCH into REJECTED by omission.

## 17. Change-memory rule

Whenever a meaningful new idea appears in chat, an external AI review, competitor research, user feedback, or implementation discovery, ask:

**“Does this change what locaOS must eventually be able to represent?”**

If yes, capture it here or in the appropriate canonical product document before the context can be lost.

Examples include new:

- rental extras
- pricing rules
- payment/deposit behavior
- vehicle states
- inspection evidence
- document types
- integrations
- government/regulatory requirements
- communication channels
- partner services
- task types
- loyalty mechanics
- reporting dimensions
- AI/memory behavior
- customer website capabilities

## 18. Final safety principle

> **We are building a system that controls real vehicles, real reservations, real money, real documents, and real customer commitments. Never trade domain correctness for speed of implementation.**

When uncertain, preserve the authoritative source of truth, make the uncertainty explicit, and leave a clean extension seam rather than hardcoding a guess.
