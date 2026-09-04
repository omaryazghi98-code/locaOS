# locaOS — Persistent AI Project Memory

**Purpose:** Persistent memory contract for every AI agent, coding assistant, reviewer, designer, or autonomous tool working on locaOS.

> **READ THIS BEFORE CHANGING THE PROJECT.** Chat history is not the source of truth. Important product decisions belong in the repository.

## 1. Required reading order

1. `docs/AI_PROJECT_MEMORY.md`
2. `docs/AI_HANDOFF.md`
3. `docs/LOCAOS_MASTER_PRODUCT_SPEC.md`
4. `docs/PHASE_ZERO_ARCHITECTURE_GUARDRAILS.md`
5. Relevant UX/design docs under `docs/ux/`
6. Recent git history and current branch state

If documents disagree, do not silently choose one. Identify the newer/canonical source and document the conflict/decision.

## 2. Product north star

locaOS is intended to become a **Morocco-first operating system for car-rental agencies**, not a conventional CRM with rental tables.

The product ambition is:

> **ONE OPERATIONAL TRUTH → AGENCY OPERATING SYSTEM → CUSTOMER EXPERIENCE → FIELD/PHYSICAL OPERATIONS → OPERATIONAL MEMORY + AI → ECOSYSTEM**

The CRM is one layer. The system should understand what is happening, identify contradictions and risks, explain why something matters, show what should happen next, and eventually help execute authorized actions with human approval for high-impact decisions.

The desired progression is:

`RECORD → DETECT → EXPLAIN → RECOMMEND → HUMAN APPROVAL → ACTION`

A successful product should make a serious agency owner think:

> **“This understands and can run my operation.”**

not merely:

> “This is another CRM.”

## 3. Feature memory — do not forget

The full product vision includes, at minimum:

### Agency operating system
- CRM/customer 360
- reservations and availability
- fleet and vehicle lifecycle
- quotes and configurable pricing
- contracts, amendments, signatures and document packages
- departure/return inspections and evidence
- deposits, payments, refunds, reconciliation
- authoritative final settlement
- maintenance/workshops
- washing/cleaning/preparation
- tasks/dispatch
- communications
- reporting and owner/manager control plane
- compliance/document expiry/risk
- staff, roles and permissions
- expenses/treasury/invoicing

### Espace Client
- customer account
- upcoming/current/past rentals
- online booking
- real availability/pricing
- vehicle selection
- documents
- payments/deposit
- extensions where allowed
- receipts
- rental history
- support/contact
- personalized offers
- loyalty status and rewards

### Agency-branded public experience
- agency-branded website
- custom theme/domain where supported
- online booking
- real availability
- real pricing
- payment links
- customer portal
- multilingual FR/AR/EN
- SEO/analytics/consent
- customer communication
- future trip planning, routes, POIs, vehicle recommendations and flight tracking

### Loyalty / commercial engine
- points/credits
- tiers
- discounts
- coupons
- referrals
- repeat-customer pricing
- corporate accounts
- campaigns
- customer segmentation
- partner offers
- configurable earning/redemption rules
- expiry, adjustments and reversals
- auditable loyalty ledger

The loyalty foundation should eventually support not only rental customers but also service providers/partners such as workshops and washing providers where commercially appropriate.

### Ground / physical operations
Physical operations are a first-class part of the future ecosystem:
- vehicle delivery
- vehicle pickup
- airport/hotel meet-and-greet
- branch transfers
- vehicle relocation
- fueling
- washing
- detailing
- preparation
- inspection/photo work
- tire work
- mechanical work
- bodywork
- parts/workshop jobs
- recovery/towing
- document pickup/delivery
- other agency errands

These should use a **generic task/dispatch foundation** rather than disconnected one-off features:

`TASK CREATED → ASSIGNED → EXECUTING → EVIDENCE → VERIFIED → CLOSED → COST/PERFORMANCE`

Tasks link to the relevant agency/branch/customer/vehicle/reservation/contract/case and remain auditable.

### Washing / preparation hub
Support future dedicated or partner wash/prep operations:

`RETURN → INSPECTION → WASH/PREP QUEUE → CLEANING → QUALITY CHECK → READY`

Possible capabilities:
- wash locations
- queues
- jobs
- checklists
- handoffs
- photos/evidence
- internal/external providers
- pricing
- performance
- loyalty/rewards

### Workshops / repair ecosystem
Support:
- workshop/provider directory
- mechanics
- work orders
- estimates
- approvals
- parts/labour
- maintenance history
- downtime/cost/performance
- partner relationships
- provider loyalty/rewards

### APIs / integrations
Integration architecture is a strategic foundation, not an afterthought.

Use:

`locaOS domain → integration port → provider adapter → external system`

and:

`external webhook/event/file → adapter → normalized domain event`

Potential integration families:
- WhatsApp
- SMS
- email
- push notifications
- telephony/PBX/SIP/click-to-call
- payment providers/payment links
- banking/financial systems where appropriate
- GPS/vehicle telemetry
- maps/routing/POIs
- flight tracking
- identity/OCR/document verification
- e-signature
- secure document storage
- accounting/invoicing
- workshops/mechanics
- washing/preparation providers
- task/dispatch partners
- external booking/distribution channels
- government/regulatory systems only where official access, legal basis, security requirements and technical documentation are verified

Potential government/regulatory seams include NARSA, DGSN, DGSSI and other relevant institutions, but **never assume a public API, permission, protocol, or legal requirement without authoritative verification**.

### Communications
Communications must be channel-independent and linked to operational context:

`CUSTOMER/RESERVATION/CONTRACT/VEHICLE/CASE/TASK ↔ COMMUNICATION`

Preserve actor, time, channel, provider status, template/message identity and outcome where available. WhatsApp is one adapter, not the communication architecture.

### Fleet / telemetry
- authoritative vehicle states
- maintenance
- transfers
- availability
- GPS/telematics abstraction
- contradiction detection
- geofences and richer telemetry later
- EV/hybrid intelligence later

Telemetry is evidence, not an automatic verdict.

### AI / NAVI
NAVI is a **working product/intelligence concept**, not necessarily the final brand name.

NAVI should eventually sit above the operational system and help the agency understand and act on its business.

The target experience is not a generic chatbot. NAVI should have access to authorized operational context and eventually be able to:
- summarize what is happening
- explain anomalies/contradictions
- retrieve relevant history
- connect related events/entities
- identify unresolved issues
- recommend next actions
- prepare actions for approval
- execute authorized low-risk actions through domain services

Examples:
- “What is happening today?”
- “Why is vehicle 214 unavailable?”
- “What changed since yesterday?”
- “How much did we actually collect yesterday, and what remains unsettled?”
- “Prepare everything for tomorrow’s airport pickups.”

AI must never silently rewrite authoritative records, fabricate evidence, bypass permissions, or make autonomous punitive/high-impact decisions.

## 4. Pieces as inspiration — architectural direction

The project explicitly considers **Pieces** a major inspiration for the future experience and infrastructure philosophy.

Do **not** copy Pieces or make it a dependency. Borrow the useful concepts:
- persistent contextual memory
- searchable history/context
- relationships between information
- timeline/history rather than isolated rows
- context-aware assistance
- retrieval of relevant prior information
- action-oriented intelligence
- user-controlled/permission-scoped memory

For locaOS, this becomes **operational memory**.

A rental should be understandable as a connected story:

`RESERVATION → VEHICLE → QUOTE → CONTRACT → DEPOSIT → DEPARTURE INSPECTION → HANDOVER → EXTENSION → COMMUNICATION → RETURN → DAMAGE EVIDENCE → SETTLEMENT → PAYMENT/DEPOSIT APPLICATION → CLOSE → VEHICLE PREPARATION`

The system should answer:
- what happened?
- why did it happen?
- who did it?
- what decision was made?
- what evidence supports it?
- what remains unresolved?
- what happened previously?
- what changed?
- what should happen next?

Operational memory should be built from structured facts/evidence including tenant/agency/branch, actor/system, timestamp, event/action type, subject, linked entities, outcome, reason/note, evidence references, correlation/request IDs and external references where relevant.

## 5. Rental commercial truth

Do not hardcode commercial policy as simple booleans/constants.

Pricing must eventually support:
- vehicle/category pricing
- duration bands
- seasonal/date rules
- channel/customer rules
- authorized discounts
- minimum/floor rules and overrides
- unlimited mileage
- included mileage
- excess mileage
- paid unlimited-mileage upgrades
- extras/add-ons
- deposits/deductibles
- multiple currencies
- confirmed transaction FX snapshots
- agency-specific pricing
- future dynamic pricing

All commercial changes must be checked across:

`QUOTE → RESERVATION → CONTRACT SNAPSHOT → SETTLEMENT → PAYMENT/REFUND → REPORTING`

## 6. First-class extras / add-ons

Examples include baby/child seats, booster, additional driver, GPS, Wi-Fi, toll/transponder service, prepaid fuel/refuelling, roadside/protection upgrades, young-driver service, cross-border option where offered/permitted, winter equipment, roof/bike/surf racks, luggage equipment, delivery/collection, after-hours pickup/return, one-way/drop-off, upgrades and agency-defined extras.

This is configurable inspiration, not a mandatory hardcoded catalog.

Extras must support configurable pricing:
- per rental
- per day
- quantity
- included/free
- optional/required
- branch availability
- vehicle/category applicability
- date/season rules
- customer/channel rules
- physical inventory limits
- taxes/fees
- currency/FX
- discounts/overrides
- cancellation/refund behavior

Physical extras follow:

`EXTRA CATALOG → EXTRA INVENTORY → RESERVATION ALLOCATION → HANDOVER → RETURN → CONDITION/LOSS/DAMAGE → SETTLEMENT`

Historical records retain the exact extra, quantity, price, currency, policy/rule version and applicable taxes/fees.

## 7. Authoritative rental lifecycle

Core journey:

`CUSTOMER → RESERVATION → CATEGORY/VEHICLE → QUOTE → CONTRACT → DEPARTURE INSPECTION → DEPOSIT → READY → HANDOVER/ACTIVATION → ACTIVE RENTAL → EXTENSIONS/ALERTS → RETURN INSPECTION → DÉCOMPTE FINAL → PAYMENT/DEPOSIT APPLICATION → CLOSE → VEHICLE FLEET STATE`

Final settlement must eventually account for rental base, extensions, late return, mileage, fuel, extras, fees/fines where applicable, damage, discounts/amendments, deposit application, multiple payments, refunds/reversals, overpayment/underpayment and currency/FX.

Closed financial results must be immutable/snapshot-able and explainable.

## 8. Product experience / “WOW” bar

The product should **not** be presented as a collection of CRUD modules or “a better CRM.”

The core experience must demonstrate **operational orchestration and intelligence**.

Example:

`RETURN EVENT → INSPECTION → COMPARE DEPARTURE/RETURN → DETECT DISCREPANCY → CALCULATE SETTLEMENT → APPLY DEPOSIT/PAYMENT → GENERATE CUSTOMER DOCUMENT → CREATE PREPARATION TASK → UPDATE VEHICLE STATE → SURFACE RELEVANT OWNER/MANAGER INFORMATION`

The owner command center should answer:
1. What is happening?
2. What is wrong?
3. What will go wrong?
4. What should I do?

NAVI should make these answers immediate, contextual and actionable.

The product bar is a **“holy shit, this understands my operation”** reaction, not merely a prettier dashboard.

## 9. Demo / field-validation direction

Before scaling sales, the product must reach a **credible, impressive, mind-boggling demo state** that communicates the larger operating-system vision.

The demo should show a coherent end-to-end operational scenario rather than isolated pages:

`CUSTOMER BOOKING → VEHICLE/AVAILABILITY → CONTRACT → DEPARTURE INSPECTION → ACTIVE RENTAL → EXTENSION/COMMUNICATION → RETURN → DAMAGE/FUEL/MILEAGE → FINAL SETTLEMENT → DEPOSIT/PAYMENT → VEHICLE PREPARATION → MANAGER/NAVI SUMMARY`

The future vision should also be shown explicitly, clearly labelled as planned/exploratory, never misrepresented as already implemented.

Future-facing demo discussion may include:
- Espace Client
- agency-branded website
- loyalty
- WhatsApp/communications
- mobile field workflows
- washing/preparation
- workshops/repairs
- task/dispatch ecosystem
- APIs/integrations
- GPS/telemetry
- trip planning/flight tracking
- operational memory
- NAVI/AI
- broader partner ecosystem

The purpose is to demonstrate how all these surfaces eventually connect to the same operational truth and to discover which capabilities agencies actually value/pay for.

## 10. Field sales / agency onboarding model

Future go-to-market should include professional **field sales / agency success representatives** in major Moroccan markets such as Casablanca, Tanger, Rabat, Marrakech and Agadir, after the founder proves the sales/pilot motion.

The role should eventually cover prospecting, introductions, discovery, demo support, pilot acquisition, onboarding, staff training, early support, structured feedback to product and retention/customer success.

For early Casablanca discovery, the founder should prove the meeting/demo/pilot motion before hiring a full field team.

A short-term freelance B2B/BD companion may be used for fieldwork, but should not invent product promises, pricing, integrations or timelines.

Approved briefing principle:
- current capabilities = clearly stateable
- in-development = state as in development
- planned/exploratory = discuss as future direction
- never fabricate customers, metrics, integrations, legal claims or delivery dates

After each agency meeting, capture structured evidence:

`AGENCY → SIZE/FLEET → CURRENT WORKFLOW → CURRENT TOOLS → PAINS → DECISION MAKER → PRODUCT REACTION → VALUED FUTURE FEATURES → OBJECTIONS → PILOT INTEREST → FOLLOW-UP → NOTES`

## 11. Current stage and immediate strategy

The project is currently in **product + market validation**, with an existing operational codebase but an unfinished differentiated experience.

Do not rush into nationwide sales, large hiring, investor fundraising or government funding before the product/market evidence justifies it.

Immediate strategic sequence:

1. **Make the operational core authoritative and trustworthy.**
2. **Design the NAVI/locaOS experience around the whole ecosystem, not CRM pages.**
3. **Create an impressive end-to-end demo scenario.**
4. **Use founders to conduct high-quality agency discovery.**
5. **Secure serious pilot agencies.**
6. **Iterate based on real agency evidence.**
7. **Prove the commercial motion.**
8. **Then hire field/BD/customer-success people to scale.**
9. **Then use the validated business plan to select appropriate government funding, debt/guarantees or investors.**

The current next engineering priority is therefore **authoritative final settlement + operational truth**, followed by **NAVI/operational-intelligence experience design**, then the impressive demo layer — not random feature accumulation.

## 12. Funding / hiring principle

Current budget reality is effectively $0, so validation should minimize cash burn.

Government funding should be treated as an option to unlock validated needs, not as the reason to build a fictional plan. Do not apply prematurely merely because a program exists.

Government programmes, guarantees, loans, investors and founder/revenue financing serve different purposes. Match financing to actual needs and eligibility.

Do not hire developers or field staff merely to manufacture job-creation numbers. Hire for real business requirements and present a realistic employment plan. If a funding programme has employment/value-added criteria, design the genuine business plan around real jobs and economic activity rather than gaming the requirement.

## 13. Architecture principles

- One authoritative domain truth.
- Tenant isolation and server-side authorization are invariants.
- Financial/contract history is immutable/snapshot-able where required.
- External systems use provider adapters/ports.
- Public/customer surfaces consume controlled projections/APIs.
- Physical inventory must support allocation, handover, return, condition, loss/damage and availability.
- AI cannot bypass human/domain authority.
- Telemetry is evidence, not automatic judgment.
- Features and entitlements must remain separable.
- Experimental frontend work from Bolt/Lovable/DesignArena/etc. must not replace the NestJS/PostgreSQL source of truth.
- Future features must have clean seams even when deferred.

## 14. AI-agent operating rules

Every AI working on locaOS must:
1. Read this file and companion docs before changing code.
2. Inspect current branch/recent history before assuming state.
3. Treat repository documents/code as source of truth, not chat memory.
4. Preserve unrelated work.
5. Never force-push/reset/delete work without explicit authorization.
6. Never replace the domain backend with a prototype frontend/backend.
7. Keep experimental design work isolated unless explicitly promoted.
8. Use provider adapters for external integrations.
9. Never fabricate government API access or legal requirements.
10. Never silently change historical financial/contract truth.
11. Preserve tenant isolation/server authorization.
12. Add regression tests for financial, lifecycle, concurrency, idempotency and authorization changes.
13. Run appropriate typecheck/build/test suites.
14. Update this file or `AI_HANDOFF.md` when a meaningful product/architecture decision or newly discovered feature is added.
15. If an idea is not being implemented now, mark it **DEFERRED**, not forgotten.
16. When a feature changes the commercial model, check quote → reservation → contract → settlement → reporting.
17. When a feature involves physical inventory, check allocation → handover → return → condition → loss/damage → availability.
18. When a feature involves AI, identify what remains human-authoritative.

## 15. Feature-state vocabulary

- **IMPLEMENTED** — exists and verified.
- **IN PROGRESS** — actively being implemented.
- **PLANNED** — agreed capability not yet implemented.
- **DEFERRED** — intentionally postponed but retained.
- **RESEARCH** — requires legal/commercial/technical/provider validation.
- **BLOCKED** — dependency prevents implementation.
- **REJECTED** — explicitly not to be built unless reconsidered.

Never silently convert PLANNED/DEFERRED/RESEARCH into REJECTED by omission.

## 16. Change-memory rule

Whenever a meaningful new idea appears in chat, external AI review, competitor research, user feedback or implementation discovery, ask:

> **Does this change what locaOS must eventually be able to represent?**

If yes, capture it here or in the appropriate canonical product document before context is lost.

## 17. Final safety principle

> **We are building a system that controls real vehicles, real reservations, real money, real documents, real physical work and real customer commitments. Never trade domain correctness for speed of implementation.**

When uncertain, preserve the authoritative source of truth, make uncertainty explicit, and leave a clean extension seam rather than hardcoding a guess.
