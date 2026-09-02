# locaOS — Big Picture / Non-Negotiable Product Direction

This document preserves the complete product direction so future AI sessions do not collapse locaOS into “just a CRM”.

## Starting point

locaOS starts as a **very capable CRM / operating platform for car-rental agencies**.

Core agency capabilities:
- customers / CRM
- reservations
- fleet and real availability
- quotes / pricing
- contracts
- departure and return inspections
- deposits / cautions
- payments / finance
- final settlement
- maintenance
- operations / alerts / tasks
- reporting
- roles / permissions / audit

The current product must be genuinely useful on its own. We are **not** required to build the full ecosystem before validating the core.

## Long-term infrastructure vision

The core should be built so it can become infrastructure connecting the wider rental ecosystem.

`AGENCY CORE → CUSTOMER → FIELD OPERATIONS → SERVICE PROVIDERS → MARKETPLACE → EXTERNAL SYSTEMS → AI/INTELLIGENCE`

The existence of these future surfaces must influence the architecture even when implementation is deferred.

## Agency network

Future ecosystem may connect:
- independent rental agencies
- multi-branch agencies
- partner agencies
- regional operators

Do not assume agencies must surrender control of their businesses. The platform should support agency-specific pricing, inventory, policies, branding, permissions and commercial terms.

## Repair / workshop network

Future repair/garage interface:
- receive work orders
- vehicle history/context
- problem and evidence
- quote/estimate
- parts and labour
- approval workflow
- repair status
- completion evidence
- cost tracking
- downtime tracking
- maintenance history

## Washing / detailing / preparation network

Future wash/prep interface:
- receive preparation jobs
- queue/schedule
- checklist
- vehicle handoff
- photos/evidence
- completion/quality check
- pricing/cost
- performance
- return vehicle to READY/available workflow

Lifecycle example:

`RETURN → INSPECTION → PREPARATION QUEUE → WASH/DETAIL → QUALITY CHECK → READY`

## Generic task / field-worker network

Do not hardcode every physical operation as a separate bespoke app.

Use a generic task/dispatch foundation that can support:
- vehicle delivery
- vehicle pickup
- airport/hotel meet-and-greet
- branch transfer
- relocation
- fueling
- washing
- preparation
- workshop runs
- document pickup/delivery
- other agency errands

Lifecycle:

`CREATED → OFFERED/ASSIGNED → ACCEPTED → IN PROGRESS → EVIDENCE → VERIFIED → COMPLETED → COST/PERFORMANCE`

A task should link to relevant customer, vehicle, reservation, contract, branch, case and agency context.

## Customer side

Future **Espace Client**:
- account
- bookings
- current/upcoming/past rentals
- vehicle details
- documents
- payments/deposit
- receipts
- extensions where permitted
- support/contact
- rental history
- loyalty

Future agency-facing public experience:
- agency-branded website
- availability
- pricing
- online reservation
- extras
- payment links
- customer portal
- multilingual support

## Instant booking / marketplace

Future customer-facing marketplace/application concept:

- discover vehicles/agencies
- compare options
- real availability
- real pricing
- instant booking
- optional extras
- payment
- customer communications

This may become a separate distribution channel over the same agency infrastructure, rather than making locaOS itself the rental operator.

The key architectural requirement is that multiple channels can use the same authoritative availability/pricing/reservation services:

`AGENCY WEBSITE / MARKETPLACE / APP / OTHER CHANNEL → LOCAOS CORE`

## Loyalty

Future configurable loyalty infrastructure should support:
- customer points/credits
- tiers
- rewards
- referrals
- discounts
- campaigns
- expiry
- adjustments/reversals
- partner-funded rewards
- potentially provider/partner loyalty for workshops, repairers, washing providers and similar ecosystem participants

Do not model loyalty as a single mutable points column. Preserve an auditable ledger.

## Integrations / APIs

APIs and integrations are strategic infrastructure.

Potential integration families:
- NARSA and other relevant Moroccan government/regulatory systems, only where official access/legal/technical requirements are verified
- DGSN / identity-related systems where legitimately accessible
- DGSSI/security/compliance requirements and relevant services
- Fatourati
- Cash Plus and other payment/cash networks
- banks/payment providers
- WhatsApp
- SMS
- email
- telephony/PBX
- GPS / telematics
- maps / routing / POIs
- flight tracking
- OCR / identity verification
- e-signatures
- secure documents
- accounting / invoicing
- external booking/distribution channels
- workshop/washing/partner systems

### Integration rule

Never pretend a government or provider API exists until verified.

Architecture:

`LOCAOS DOMAIN → INTEGRATION PORT → PROVIDER ADAPTER → EXTERNAL SERVICE`

and inbound:

`EXTERNAL WEBHOOK/EVENT/FILE → ADAPTER → NORMALIZED LOCAOS EVENT`

The core domain must not be tightly coupled to provider-specific APIs.

## Moroccan payments / caution ecosystem

The product should leave clean seams for local payment and caution/deposit flows, including potential partners such as Fatourati, Cash Plus and banks/payment providers.

Do not assume a partner's exact API, settlement model, fees or eligibility. Validate provider documentation before implementation.

Deposits/cautions remain distinct from revenue. Holding, releasing, charging and refunding a caution must remain explicit financial states.

## AI / NAVI

NAVI is the working name for the future intelligence layer. It is not necessarily the final company/product name.

NAVI sits **above the authoritative CRM/operational core**.

It should eventually use:
- current operational state
- domain events
- audit history
- relationships
- evidence
- policies
- tasks
- historical context

The inspiration is **Pieces**: persistent contextual memory, timeline/retrieval, relationships, temporal context, summaries, contextual assistance and action-oriented intelligence.

We take the principles, not a clone/dependency.

NAVI should eventually:
- brief the operator
- detect anomalies
- explain why something matters
- surface historical context
- connect related records
- recommend planning/actions
- draft communications
- prepare tasks
- execute authorized low-risk actions through domain services

AI is not the authoritative financial/legal/operational source.

## AI-assisted planning

Future AI-assisted planning should be able to reason over real constraints, such as:
- vehicle availability
- reservation times
- branch locations
- customer preferences
- fleet suitability
- route/trip needs
- task capacity
- staff/field capacity
- maintenance state
- operational deadlines
- traffic/map information where available
- flight/arrival information where integrated

Examples:
- suggest the best vehicle for a trip/customer/group
- suggest route milestones / POIs for customer-facing trip planning
- identify conflicts in vehicle schedules
- prepare tomorrow's delivery/pickup plan
- propose vehicle preparation priorities

AI recommendations must be evidence-backed and human-approved where consequential.

## Mobility / trip-planning customer experience

Future customer side may include:
- destination selection
- trip route suggestions
- milestones / POIs
- vehicle recommendations based on route, group size and trip type
- airport/flight context
- optional trip-related services

This is a future extension, not current core scope.

## Ecosystem economics

The strategic monetization hypothesis discussed for the project is:

`FREE / LOW-FRICTION CORE → DEEP AGENCY ADOPTION → PAID VALUE-ADDED SERVICES / TRANSACTIONS / ECOSYSTEM`

Potential later revenue surfaces:
- premium capabilities
- transaction/payment services
- instant-booking marketplace commissions
- customer website / digital presence
- integrations
- communications
- GPS/telemetry services
- task/dispatch transactions
- delivery/pickup services
- workshop/repair network activity
- washing/preparation network activity
- advanced analytics/AI

Do not implement all revenue streams at once. Validate which ones customers value and which economics are viable.

## Product positioning

The initial product must be a strong rental-agency CRM/operational system.

The strategic differentiation is that it can become the **infrastructure around the agency**, eventually linking customers, staff, field workers, service providers, partner agencies and external systems.

Never reduce the product in future planning to:

> “customers + cars + reservations + contracts”.

That is only the starting layer.

## Build-order principle

Architect for the big picture, but build incrementally.

### Build now
- authoritative rental domain
- reservation/availability
- contracts
- inspections
- cautions/deposits
- payments
- settlement
- fleet state
- events/audit
- permissions/tenant isolation
- strong agency CRM/operations UX

### Validate next
- real agency workflows
- UX
- willingness to adopt
- willingness to pay
- most valuable future capabilities

### Build later when justified
- Espace Client
- instant-booking marketplace/app
- task/field app
- repairer interface
- washing interface
- loyalty
- local payment/caution integrations
- WhatsApp and other communications
- government/provider integrations
- GPS/telemetry
- trip planning
- NAVI operational intelligence
- larger partner ecosystem

## Non-negotiable

The ecosystem vision is **not optional context that may be forgotten because we are currently building the CRM**.

It is the reason the architecture must be extensible.

Deferred does not mean forgotten. Research does not mean rejected.
