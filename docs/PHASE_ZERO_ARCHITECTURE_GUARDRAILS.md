# locaOS — Phase Zero Architecture Guardrails

**Status:** Architectural guardrails / implementation contract

> Future features do not need to be implemented now. Today's foundations must remain compatible with them.

## Non-negotiable principles

1. Rental domain is the operational source of truth.
2. Domain rules never depend directly on a UI, vendor, government system, or communication channel.
3. External systems use explicit provider ports/adapters.
4. Tenant isolation applies to DB, API, jobs, events, files, integrations, and reporting.
5. Money is ledger/transaction truth; historical contracts, quotes, settlements, and financial records remain explainable and immutable where required.
6. Domain events/activity are first-class evidence.
7. Feature availability and billing/entitlement remain separate.
8. AI can detect, explain, recommend, and prepare actions; it cannot silently rewrite authoritative records or bypass approval.

## Stable domain seams

Keep clean module boundaries for:

- tenancy, agencies, branches
- users, roles, permissions
- customers, drivers, identity
- vehicles, categories, fleet states
- reservations, availability, assignment
- quotes, rate plans, pricing policies
- contracts, amendments, immutable snapshots
- pickup/departure inspections, active rentals, extensions
- return inspections, settlement, deposit application, refunds
- payments, cash reconciliation
- maintenance, workshops, mechanics
- washing, cleaning, preparation
- tasks, dispatch, delivery, relocation
- documents, signatures, authorizations
- compliance
- notifications/communications
- loyalty/rewards
- reporting/analytics
- operational cases/timelines
- integrations/provider accounts/webhooks
- AI/operational memory
- platform administration/entitlements/billing

These do not need to be microservices. They need clear ownership and dependency direction.

## Commercial/policy foundation

Do not encode commercial rules as vehicle booleans or hardcoded constants. The policy model must be able to represent:

- unlimited mileage
- included mileage per day or rental
- excess mileage pricing
- paid unlimited-mileage upgrades
- duration bands
- seasonal/date rules
- category/vehicle rates
- channel/customer rules
- authorized discounts
- floors/MAP/overrides
- **bookable extras / add-ons**
- deposits/deductibles
- currencies and confirmed FX snapshots

Reservations/contracts preserve the effective policy/rule version used to calculate their commercial result.

## Bookable extras / add-ons

Treat extras as a first-class, inventory-aware commercial concept rather than arbitrary notes or one-off columns.

The architecture must support extras that can be:

- priced per day
- priced per rental
- quantity-based
- bundled/included
- optional or mandatory under a specific rate/product
- available only for selected branches/vehicles/categories/dates
- capacity-limited or individually inventory-tracked
- added during booking or later by an authorized operator/customer
- changed/cancelled subject to policy
- fulfilled through a physical asset, service, or provider

Examples to support without hardcoding the catalog:

- infant/baby seats
- toddler seats
- booster seats
- stroller
- additional driver
- GPS/navigation device where an agency still offers one
- mobile Wi-Fi/hotspot
- toll/transponder service
- prepaid fuel/refuelling service
- EV charging service
- protection/coverage upgrades
- roadside assistance
- cross-border option/fee
- young-driver service/fee
- winter tyres
- snow chains
- roof rack
- ski rack
- bicycle rack
- surfboard rack
- luggage equipment
- delivery/collection
- late pickup / after-hours service
- one-way/drop-off service
- vehicle upgrade
- other agency-defined services

European rental operators commonly expose combinations of these categories; exact availability and pricing are agency/country dependent. The important architectural point is that **the catalog is configurable**, not that locaOS must offer every item. Europcar documents child seats, booster cushions and additional drivers; SIXT documents additional drivers, child seats, GPS, unlimited mileage, refuelling, protection upgrades, cross-border travel, winter tyres, snow chains and ski racks; Avis France lists child seats, mobile Wi-Fi, GPS, travel tablets, luggage racks and snow chains. A Moroccan rental example also exposes additional drivers, baby/booster seats, stroller, and surfboard racks. citeturn0search4turn0search8turn0search9turn0search15

Each selected extra should ultimately be represented in the quote/contract/settlement as an explicit line or linked commercial item, with quantity, unit basis, price, currency, policy/version, and fulfilment status. This prevents extras from becoming invisible revenue or inventory leakage.

## Workshops, repairers, washing, and tasks

Future workshop/repair functionality may include providers, mechanics, work orders, estimates, approvals, parts/labour, maintenance history, performance, partner relationships, and provider loyalty.

Future washing/preparation functionality may include wash locations, jobs, queues, handoffs, checklists, evidence, agency-owned or external providers, pricing, performance, and loyalty.

The generic task/dispatch model must support vehicle delivery/pickup, airport/hotel meet-and-greet, branch transfer, relocation, washing/prep, fueling, workshop runs, document pickup, and future third-party dispatch. Tasks are independently auditable, assignable, stateful, and linkable to agency/customer/vehicle/reservation/contract records.

## Loyalty

Do not reduce loyalty to a customer `points` column. Design for configurable programs with program owner, eligible actor/entity, earning rules, redemption, points/credits/rewards, tiers, expiry, adjustments, reversals, campaigns, partner-funded rewards, and a complete ledger/audit history.

The same foundation must be able to support rental customers, workshops/repair providers, washing/cleaning providers, and future partners.

## Integration architecture

External systems follow:

`locaOS domain → integration port → provider adapter → external system`

Incoming data follows:

`external event/webhook/file → adapter → normalized event → domain`

Adapters should support credentials isolation, tenant/provider configuration, sandbox/production, availability state, retries/backoff, idempotency, correlation IDs, webhook verification, rate limits, timeouts, provider versioning, audit, and explicit MOCK/UNAVAILABLE states. Never report a provider action as successful when it was not.

### Government / regulated systems

Reserve legitimate integration seams for research/validation paths involving **NARSA, DGSN, DGSSI**, and other government or regulated data services.

Do not assume a named institution exposes a public API, that a private rental agency has access, or that a particular protocol exists. Such integrations remain RESEARCH until official access, legal basis, security requirements, and technical contracts are confirmed.

### Communications

Use a channel-independent communication boundary supporting future **WhatsApp, SMS, email, push, portal notifications, and telephony/PBX/SIP**. Communication activities should link to customer/reservation/contract/vehicle/case/task and preserve actor, timestamp, provider status, template/message identity, and outcome where available. WhatsApp-specific templates, opt-in/consent, delivery states, and provider IDs stay in the channel adapter.

## Identity/documents

Separate secure canonical identity records from operator presentation, customer-facing documents, exports, and retention/access policy. Leave provider seams for OCR, identity verification, e-signature, document validation, secure storage, and explicit authorization/procuration documents.

Do not implicitly treat the rental contract as a generic power-of-attorney instrument; special/cross-border authorizations remain explicit document types and require legal validation.

## Payments/FX

Support multiple payments, deposits, authorization/capture/release/application, refunds, reversals, over/underpayment, multiple tender methods, multiple currencies, confirmed transaction FX rate/source/time, cash reconciliation, external PSPs, payment links, and idempotent callbacks.

Reference FX may be indicative; a transaction preserves the actual agency-confirmed commercial rate used.

## Settlement

The authoritative lifecycle is:

`RETURN → INSPECTION → DÉCOMPTE → PAYMENT/DEPOSIT → CLOSE`

The settlement engine must be able to account for rental base, extensions, late return, mileage, fuel, extras, applicable fees/fines, damage, discounts/amendments, deposit application, payments, and refunds. Closed settlement results are snapshot-able and immutable.

## Events / operational memory / audit

Structured activities should carry tenant, actor/system, timestamp, event/action type, subject, linked reservation/contract/customer/vehicle/case/task, outcome, reason, evidence reference, and correlation/request ID. This is the foundation for the future operational-memory/copilot direction.

## Pieces-inspired operational memory

**Pieces is a deliberate architectural inspiration, not a dependency.** Pieces describes a searchable long-term memory that captures workflow context, builds a chronological timeline, lets users retrieve context by time/topic/source, and exposes that context to AI tools through integrations/MCP. citeturn0search0turn0search1

For locaOS, the analogous layer should be an **operational memory**, built from authoritative domain events, cases, activities, communications, documents, decisions, evidence, and user actions. It should make it possible to answer things like:

- What happened with this rental?
- Why is this vehicle blocked?
- Who contacted the customer and when?
- What changed after the return inspection?
- Which decision/approval caused this amendment?
- What happened during the last similar incident?
- Resume this operational case from where the previous agent left it.

The memory layer must remain tenant-scoped, permission-aware, auditable, user-controllable, and grounded in source records. It should **reference authoritative facts rather than replace them**. Pieces' local-first/user-control philosophy is useful inspiration, but locaOS must adapt the concept to multi-tenant business data, Moroccan privacy/compliance requirements, and operational permissions. citeturn0search0turn0search2

## Public/customer channels

Future agency-branded customer sites consume controlled public projections/APIs, never internal tenant tables or operator permissions. Architecture should support branding/domain, public availability, booking, pricing, payment links, customer portal, documents, trip planning, routes/POIs, vehicle recommendations, flight tracking, WhatsApp, SEO/analytics/consent.

Agency console and customer applications remain separate permission surfaces over the same operational truth.

## Fleet/telemetry

Telemetry is evidence, not a verdict. Future adapters may provide GPS, mileage/odometer, location history, geofencing, and vehicle telemetry. High-impact penalties, accusations, or contract changes must not be based solely on opaque telemetry inference.

## Reporting/control plane

Preserve immutable facts for drill-down by agency, branch, vehicle, category, reservation, customer, contract, employee, workshop/provider, wash provider, task, channel, payment method, and period. Owner/manager reporting must eventually cover revenue, balances, deposits, utilization, profitability, maintenance cost/downtime, compliance risk, overdue rentals, exceptions, staff activity, and service-provider performance.

The future platform control plane is separate from agency operations and covers tenant provisioning, entitlements/features, billing, provider configuration, system health, support, audit, suspend/reactivate, and controlled break-glass access. No hidden unrestricted God mode.

## Testing guardrails

Foundational modules should test tenant isolation, authorization, idempotency, concurrency, immutable history, provider failure/retries, duplicate webhooks, partial failure, audit/event emission, money/currency correctness, timezone/DST correctness, and policy versioning. Every integration must be testable through a fake adapter without live credentials.

## Phase Zero rule

> **Implement today's rental capabilities deeply; reserve architectural seams for tomorrow's ecosystem.**

Before accepting a foundation change, ask whether it hard-codes a provider, turns a policy into a boolean/constant, mutates historical truth, bypasses tenant or role boundaries, prevents future partner/service types, couples communication to one channel, assumes unvalidated government access, creates status without an auditable transition, couples future clients to internal UI, or makes AI authoritative. If yes, fix the foundation first.
