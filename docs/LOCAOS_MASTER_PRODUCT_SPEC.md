# locaOS — Master Product Specification

**Status:** Consolidated product source of truth — Draft for owner review  
**Scope:** Morocco-first B2B car-rental agency operating system  
**Repository:** `omaryazghi98-code/locaOS`  
**Primary development branch:** `arena/01a031b1-locaos`

---

## 0. Purpose

This document consolidates the product vision, research-derived requirements, brainstorming, current architecture, UX direction, platform-control-plane requirements, and future ideas for locaOS.

It is intentionally **not** a coding task list.

It exists to prevent product drift and to give future coding agents one controlled source of truth.

### Classification

Every idea belongs to one of these maturity classes:

- **CORE** — fundamental to the product.
- **MVP** — required to operate the first usable agency product.
- **V1** — operational intelligence foundation.
- **V2** — next major expansion after V1 hardening.
- **V3** — advanced intelligence/automation.
- **EXPERIMENTAL** — interesting idea requiring validation.
- **RESEARCH** — requires legal, commercial, technical, or provider verification.
- **PLATFORM** — functionality used by the company operating locaOS rather than an agency.
- **B2C-FUTURE** — future Instant-Drive / consumer marketplace direction.
- **DEFERRED** — intentionally postponed.
- **REJECTED** — should not be implemented unless explicitly reconsidered.

This document does **not** convert brainstorming into approved functionality merely by listing it.

---

# 1. PRODUCT VISION

## 1.1 Core idea

locaOS is a Morocco-first operating system for car-rental agencies.

It should not be merely:

- a fleet database,
- a reservation calendar,
- accounting software,
- a contract generator,
- or a GPS dashboard.

It should become the agency's operational brain.

The central product principle is:

> **The system should understand what is happening, identify contradictions and risks, explain why something matters, and tell the human what should happen next.**

The product should progressively move from:

`RECORD → DETECT → EXPLAIN → RECOMMEND → HUMAN APPROVAL → ACTION`

rather than jumping directly from telemetry/AI inference to autonomous high-impact actions.

---

# 2. PRODUCT BOUNDARIES

## 2.1 Current product

**locaOS B2B** — software sold to Moroccan car-rental agencies.

Primary users:

1. Agency Owner
2. Agency Manager
3. Desk/Reservation Agent
4. Field/Delivery Agent
5. Finance/Accounting User

## 2.2 Future product

**Instant-Drive / B2C marketplace** is a separate future product direction.

It may eventually use the agency network and vehicle supply created through locaOS, but it is NOT part of the immediate B2B implementation roadmap.

Architecture should avoid blocking a future B2C ecosystem without building it prematurely.

---

# 3. CURRENT IMPLEMENTATION BASELINE

The repository has already completed:

- Phase 1 operational foundation
- V1 operational intelligence
- V1 hardening / production-readiness pass

Current known checkpoint:

- Phase 1: `f3b4ba8`
- V1: `e03447a`
- V1 hardening: `fe03df8`

Current reported test baseline:

- 25 domain tests
- 47 integration tests
- 72 total
- lint clean
- typecheck clean
- clean database migration verification

Existing V1 capabilities include:

- fleet
- reservations
- customers
- contracts
- inspections
- payments/deposits
- cash reconciliation
- maintenance
- telemetry foundation
- contradiction signals
- branch transfers
- command center
- reporting
- customer 360
- documents
- compliance registry
- alert engine
- integration ports
- French/Arabic contract PDF generation

Known deliberate limitations:

- local storage remains the current implementation; production S3-compatible storage is a future infrastructure task.
- real GPS provider integration is not yet active.
- WhatsApp and Damanesign adapters exist but are unavailable without credentials.
- offline inspection photo upload remains deferred.
- scheduler is currently API-process based with locking/idempotency protections.
- AI, predictive maintenance, dynamic pricing, NARSA automation and autonomous decisions remain deferred.

---

# 4. PRODUCT PRINCIPLES

1. **Morocco first.**
2. **Operational usefulness over feature count.**
3. **Human approval for high-impact actions.**
4. **No silent automation of legal/financial/security decisions.**
5. **Explainability over opaque scores.**
6. **Auditability by default.**
7. **Tenant isolation is a security invariant.**
8. **Money is treated as a ledger, not mutable CRUD.**
9. **Telemetry is evidence, not a verdict.**
10. **AI is a reasoner and assistant, not an autonomous authority.**
11. **Mobile matters for field operations.**
12. **Desktop density matters for agency desks.**
13. **French and Arabic must be first-class.**
14. **Features and entitlements must be separable.**
15. **External integrations must sit behind provider ports.**
16. **Unverified Moroccan legal/provider claims must remain configurable and explicitly sourced.**
17. **No feature should require an agency owner to understand the software's internal technical model.**

---

# 5. PERSONAS AND ACCESS

## 5.1 Agency Owner — CORE

Primary question:

> "What is happening in my business and what requires my attention?"

Needs:

- command center
- fleet utilization
- revenue
- profitability
- cash
- alerts
- maintenance
- upcoming risks
- branch performance
- customer intelligence
- configuration
- user management

## 5.2 Agency Manager — CORE

Primary question:

> "How do I keep today's operation running?"

Needs:

- today's operations
- reservations
- pickups/returns
- vehicle readiness
- maintenance conflicts
- staff tasks
- alerts
- branch transfers
- operational reports

## 5.3 Desk Agent — CORE

Primary question:

> "What do I need to process right now?"

Needs:

- today's pickups
- today's returns
- contract preparation
- customer lookup
- vehicle assignment
- payment/deposit handling
- inspection handoff
- quick actions
- focused operational UI

## 5.4 Field Agent — CORE

Primary question:

> "I am standing next to the car. What do I need to do?"

Needs:

- mobile inspection
- vehicle selection from today's jobs
- photos
- mileage/fuel
- damage capture
- customer acknowledgment
- contract access
- status transitions
- offline operation

## 5.5 Finance User — CORE

Needs:

- payments
- deposits
- refunds
- cash sessions
- reconciliation
- invoices/receipts
- outstanding balances
- financial reports

---

# 6. UX SYSTEM

## 6.1 Density modes

Every major table/list/workspace should support:

### Compact
Maximum information density for experienced desk users.

### Comfortable
Default mode. Clear hierarchy and moderate density.

### Detailed
Investigation mode with contextual information and history.

Density must change information presentation, not merely font size.

## 6.2 Focus Mode

Field/desk users can enter a task-focused mode centered on:

- today
- upcoming pickup
- return
- preparation
- overdue items
- unresolved issues

No unnecessary analytics.

## 6.3 Owner Command Center

The owner dashboard should answer four questions:

### What is happening?
- active rentals
- available vehicles
- today's pickups
- today's returns
- utilization
- revenue
- cash

### What is wrong?
- overdue rentals
- missing contracts
- missing deposits
- maintenance conflicts
- payment issues
- telemetry contradictions
- unresolved alerts

### What will go wrong?
- tomorrow's vehicle conflicts
- upcoming maintenance
- expiring documents
- insufficient fleet availability
- branch transfer requirements

### What should I do?
- prioritized actionable recommendations with reasons.

## 6.4 Global interaction standards

- global search
- Ctrl/Cmd+K command palette
- keyboard navigation
- saved views
- filters
- sorting
- grouping
- column visibility
- bulk actions
- responsive desktop/tablet/mobile behavior
- mobile-first field workflows
- desktop-first agency desk workflows
- accessible focus states
- status icons + text, never color alone
- skeleton loading
- useful empty states
- meaningful errors
- no exposed UUIDs in normal UI
- no technical jargon for ordinary agency users

## 6.5 Localization

First-class:

- French
- Arabic RTL

Morocco-aware:

- MAD
- local date/time conventions
- Arabic names and addresses
- bilingual contract templates

---

# 7. AUTHORIZATION MODEL

Agency permissions must be capability-based.

Illustrative capabilities:

- `fleet.view`
- `fleet.edit`
- `fleet.status.change`
- `reservation.create`
- `reservation.price.override`
- `payment.create`
- `refund.approve`
- `contract.create`
- `contract.amend`
- `document.view_sensitive`
- `report.finance`
- `maintenance.edit`
- `branch.transfer`
- `compliance.manage`
- `user.manage`

Example policy:

| Capability | Owner | Manager | Desk | Field |
|---|---:|---:|---:|---:|
| View fleet | ✓ | ✓ | ✓ | assigned |
| Create reservation | ✓ | ✓ | ✓ | — |
| Change price | ✓ | ✓ | limited | — |
| Refund | ✓ | ✓ | — | — |
| Finance reports | ✓ | ✓ | limited | — |
| View sensitive identity docs | ✓ | ✓ | need-to-know | restricted |
| Vehicle status | ✓ | ✓ | ✓ | ✓ |
| Branch transfer | ✓ | ✓ | limited | execute |
| Compliance config | ✓ | ✓ | — | — |
| User management | ✓ | ✓ | — | — |

Frontend visibility must never substitute for server-side authorization.

---

# 8. FLEET / VEHICLE DOMAIN

## 8.1 Core vehicle state

The system must maintain an authoritative vehicle state machine.

Examples include:

- available
- reserved
- preparation
- rented
- return pending
- inspection
- maintenance
- unavailable
- overdue

System-owned states such as `OVERDUE` must not be freely assigned by employees.

A separate derived condition/signal layer may identify contradictions without silently mutating authoritative state.

## 8.2 Vehicle profile

A vehicle should expose:

- registration
- make/model
- category
- branch
- current state
- current rental
- next reservation
- mileage
- fuel
- maintenance
- documents
- insurance
- inspection
- damage history
- revenue
- costs
- profitability
- downtime
- telemetry status

## 8.3 Vehicle lifecycle

Future lifecycle support:

- acquisition
- active fleet
- maintenance
- accident
- prolonged downtime
- transfer
- sale
- retirement

---

# 9. RESERVATIONS / RENTAL OPERATIONS

## Core

Support:

- reservations
- availability
- conflict prevention
- pickup
- return
- extension
- late return
- cancellation
- no-show
- vehicle allocation
- category upgrade
- vehicle replacement
- branch pickup/return
- delivery
- airport workflows
- preparation

Critical invariants:

- no overlapping allocation
- no rental while vehicle is still out
- no reservation against active maintenance conflict
- concurrent state transitions must serialize
- financial events must remain linked to valid contracts/reservations

---

# 10. "CONTRACT READY" WORKFLOW — CORE/KILLER

The system should proactively prepare contracts for today's bookings.

For example:

> 3 cars booked today → contracts should already be ready to print.

The user should be able to:

1. enter customer name/details now, OR
2. deliberately leave the customer fields blank so the agency can handwrite them at the scene.

Blank paper workflow is first-class, not an error.

Support:

- per-agency contract numbering
- versioning
- amendments
- PDF
- French
- Arabic RTL
- insurance terms
- deposits
- vehicle replacement
- scanned paper evidence
- signature status
- paper reconciliation

Printing must be auditable.

Do not create fake financial records merely because a blank contract was printed.

---

# 11. INSPECTIONS / DAMAGE

## Core

Inspection zones:

- front
- rear
- left
- right
- roof
- windshield
- wheels
- tires
- interior
- dashboard
- trunk
- accessories

Capture:

- photos
- mileage
- fuel
- accessories
- damage
- notes
- customer acknowledgment
- employee acknowledgment

The system must answer:

> "What changed between departure and return?"

## Future

- computer vision
- AI damage detection
- damage severity estimation
- evidence clustering
- dispute assistance

These are V3/experimental until validated.

---

# 12. MAINTENANCE

## Core/V1

Support:

- mileage schedules
- time schedules
- tasks
- parts
- labor
- suppliers/workshops
- costs
- downtime
- service history
- upcoming maintenance
- reservation/maintenance conflict

Detect:

- maintenance due
- approaching maintenance
- prolonged downtime
- repeated failures
- abnormal maintenance cost

## V3

Potential predictive maintenance:

- failure probability
- component life estimates
- maintenance optimization

Must remain explainable and advisory.

---

# 13. GPS / TELEMATICS

## V2 foundation

Provider abstraction:

`TelematicsProvider`

Normalized events:

- position
- ignition
- movement
- stop
- mileage
- GPS connectivity
- battery voltage where available
- timestamp

Provider states:

- MOCK
- SIMULATED
- UNAVAILABLE
- CONNECTED

Never fake live connectivity.

## Contradiction intelligence

Examples:

### RENTED + GPS stationary at agency too long
Possible failed handover / phantom rental.

### AVAILABLE + MOVING
Possible unauthorized movement.

### CONTRACT EXPIRED + MOVING
Possible unauthorized use.

### GPS LOST WHILE RENTED
Possible tracker/connectivity problem.

### TRANSIT + wrong location/stationary
Potential transfer failure.

Signals should:

`DETECT → EXPLAIN → ALERT`

Never automatically accuse a customer.

## Future

- geofences
- border movement
- speed
- CAN-bus
- fuel
- EV battery
- immobilizer
- real provider integrations
- richer telemetry

Starter-kill/automatic immobilization remains rejected by default.

---

# 14. HYBRID / EV INTELLIGENCE

Future V2/V3 domain.

Potential monitoring:

- battery state of charge
- battery health where available
- charging state
- charging duration
- range
- energy cost
- fuel/energy efficiency
- charging anomalies
- maintenance

The system should eventually distinguish:

- EV
- hybrid
- plug-in hybrid
- combustion

and adapt operational rules accordingly.

No provider-specific assumptions should leak into the core domain.

---

# 15. ALERT ENGINE

Alerts are declarative rules, not scattered `if` statements.

Every alert contains:

- category
- trigger
- entity
- severity
- explanation
- timestamp
- status
- acknowledgment
- resolution
- audit

Categories:

- operations
- fleet
- maintenance
- financial
- contract
- compliance
- security
- telematics
- customer

Severity:

- critical
- high
- medium
- info

The long-form research brainstorm contains a 100-alert matrix. That matrix is a source of candidate rules, not a requirement to implement all 100 immediately.

---

# 16. "FEATURES NOBODY KNEW THEY NEEDED"

This is a core differentiation theme.

Examples:

## Ghost State
System sees telemetry/operational evidence inconsistent with the recorded vehicle state.

## Phantom Booking
Reservation exists but vehicle/customer/contract activity does not match expected preparation.

## Maintenance Conflict
Vehicle is booked while maintenance makes it unavailable.

## Unauthorized Movement
Vehicle moves when business state says it should not.

## Silent Failure
GPS or integration stops reporting while the vehicle is actively rented.

## Cross-branch Conflict
Vehicle required at Branch A while operationally stranded at Branch B.

## Cash Anomaly
Expected cash and actual drawer behavior diverge.

## Profitability Illusion
High-revenue vehicle is actually unprofitable after maintenance/downtime/depreciation.

## Contract Missing
Customer is due for pickup but the contract is not prepared.

## Return Risk
Upcoming return workload exceeds operational capacity.

## Fleet Bottleneck
Tomorrow's demand exceeds available vehicles of a required category.

Every intelligent alert must show:

> **Why am I seeing this?**

---

# 17. COMMAND CENTER

Owner view:

- fleet state
- rentals
- pickups
- returns
- overdue
- maintenance
- cash
- revenue
- profitability
- alerts
- upcoming risks
- recommended actions

Agent view:

- today
- preparation
- pickups
- returns
- unresolved tasks

Command center should prioritize actions rather than decorative charts.

---

# 18. MORNING BRIEF

Example structure:

- today's departures
- today's returns
- utilization
- vehicles needing preparation
- contracts missing
- deposits missing
- maintenance conflicts
- expected cash
- critical alerts
- tomorrow's risks
- recommended transfers

Every recommendation must include underlying reasons.

---

# 19. END-OF-DAY BRIEF

Include:

- completed rentals
- returns
- payments
- cash reconciliation
- damages
- overdue vehicles
- anomalies
- unresolved alerts
- tomorrow's departures
- tomorrow's operational risks

---

# 20. FINANCIAL SYSTEM

## Core invariants

- integer minor units
- explicit currency
- no floating-point money
- append-only financial events
- corrections via reversals
- refunds capped by original payment
- cash count separate from expected cash
- cash variance calculated deterministically
- no silent financial mutation
- blank/void contracts cannot become hidden financial records

## Multi-currency

Potentially:

- MAD
- EUR
- USD

Exchange rates are human-confirmed facts unless a trusted rate provider is deliberately introduced.

Do not silently convert currencies.

## Future intelligence

- vehicle profitability
- branch profitability
- customer value
- maintenance ROI
- utilization-adjusted profitability
- pricing intelligence

---

# 21. REPORTING

Reports:

### Fleet
- utilization
- availability
- downtime
- revenue
- maintenance
- profitability

### Finance
- revenue
- payments
- deposits
- outstanding balances
- refunds
- cash variance

### Operations
- rentals
- cancellations
- extensions
- overdue
- turnaround

### Customers
- rental frequency
- revenue
- average duration
- repeat behavior

### Branches
- utilization
- revenue
- profitability

Exports:

- CSV
- PDF where appropriate

Future:

- scheduled reports
- owner summaries
- AI-generated explanations

---

# 22. CUSTOMER 360

Customer profile:

- identity
- documents
- rental history
- contracts
- vehicles
- payments
- deposits
- damages
- fines
- extensions
- cancellations
- total revenue
- average rental duration

Future:

- loyalty
- segmentation
- repeat-customer intelligence
- customer communication preferences

Risk indicators must remain:

- objective
- explainable
- advisory
- configurable
- auditable

Do not implement opaque automatic blacklisting.

---

# 23. DOCUMENT MANAGEMENT

Documents:

- CIN/passport
- driving licence
- contracts
- amendments
- insurance
- registration
- technical inspection
- invoices
- receipts
- damage evidence
- payment evidence

Requirements:

- secure storage
- metadata
- entity association
- expiration
- access control
- audit
- signed access URLs

Current V1 storage is local.

Production target:

S3-compatible object storage.

---

# 24. COMMUNICATIONS

Provider abstraction:

`MessagingProvider`

Potential:

- WhatsApp Business
- SMS
- email

Use cases:

- reservation confirmation
- pickup instructions
- document requests
- contract delivery
- payment reminders
- return reminders
- extension requests
- late-return notifications
- location requests

Never fake provider success.

Provider states must distinguish:

- unavailable
- simulated
- connected
- failed

---

# 25. ELECTRONIC SIGNATURE

Provider abstraction:

`ElectronicSignatureProvider`

Potential providers:

- Damanesign
- Barid eSign

Contract flow:

`DRAFT → GENERATED → SIGNATURE_REQUESTED → SIGNED → ACTIVE`

Provider credentials and legal status must be verified before production claims.

---

# 26. MOROCCO-SPECIFIC DOMAIN

locaOS is Morocco-first.

The product must accommodate relevant Moroccan context including:

- MAD
- CIN
- driving licences
- Moroccan rental practices
- insurance
- technical inspection
- NARSA
- DGI
- CNDP / Law 09-08
- Law 43-20
- CMI
- Fatourati
- Damanesign
- Barid eSign
- Tanger Med
- Ceuta/Melilla
- cross-border rental
- cash-heavy workflows
- French/Arabic documentation

Regulatory rules must be:

- sourced
- configurable
- effective-date aware
- auditable
- capable of being disabled if not applicable

Unverified claims must never become hard-coded legal truth.

---

# 27. CROSS-BORDER RENTAL

Potential support:

- permission for cross-border travel
- Ceuta/Melilla
- Tanger Med
- Admission Temporaire
- insurance implications
- driver authorization
- border-related documentation
- location alerts

Keep legal requirements configurable and subject to verification.

---

# 28. COMPLIANCE REGISTRY

A compliance rule should contain:

- source
- effective date
- rule
- status
- configuration
- audit history

Candidate areas:

- vehicle age
- fleet requirements
- insurance
- technical inspection
- documents
- contracts
- data processing
- e-invoicing

The research contained secondary-source claims about fleet size/age/capital requirements. These remain configurable/research-status until authoritative legal verification.

---

# 29. AI ARCHITECTURE

AI is future intelligence, not the foundation of correctness.

Architecture:

`AiProvider`

AI should consume grounded agency data.

Output classes:

- FACT
- INFERENCE
- RECOMMENDATION
- UNCERTAINTY

AI must explain its reasoning basis.

High-impact workflow:

`DETECT → EXPLAIN → RECOMMEND → HUMAN APPROVAL → ACTION`

Never:

`AI → irreversible action`

## Candidate AI capabilities

### AI Copilot
Natural language:

- "Which cars are losing money?"
- "What needs attention today?"
- "Why is vehicle 32 flagged?"
- "Which cars should I move tomorrow?"
- "Show me customers with unresolved deposits."

### Morning brief
AI can explain deterministic operational facts.

### Contract assistant
Draft/verify structured information.

### Document understanding
OCR/extraction, subject to privacy and accuracy constraints.

### Damage intelligence
Compare inspection evidence and suggest possible new damage.

### Maintenance intelligence
Forecast likely maintenance needs.

### Pricing intelligence
Suggest rates based on demand, utilization and market signals.

### Scenario analysis
"What happens if I move these three cars?"

### Financial intelligence
Explain margin changes and cost anomalies.

All of these are V2/V3/experimental unless explicitly promoted.

---

# 30. DYNAMIC PRICING

Potential future capability.

Inputs may include:

- demand
- fleet utilization
- booking lead time
- seasonality
- vehicle category
- branch
- market conditions
- remaining availability

Must be:

- explainable
- configurable
- advisory initially

No opaque automatic price changes in the early product.

---

# 31. MONETIZATION

Platform should separate:

`FEATURE → ENTITLEMENT → PLAN/SUBSCRIPTION`

Future plans may include:

### Starter
Core fleet, reservations, contracts, inspections, basic reports.

### Professional
Advanced reports, maintenance intelligence, WhatsApp, GPS.

### Enterprise
Advanced telematics, AI, multi-branch, API/custom integrations.

Potential add-ons:

- GPS Intelligence
- WhatsApp
- AI Copilot
- Advanced Analytics
- E-Signature

Pricing is NOT fixed by this document.

---

# 32. PLATFORM CONTROL PLANE / GOD MODE

The platform operator requires a separate security boundary.

Do NOT implement a simple `godMode=true` flag.

Platform roles/capabilities may include:

- Platform Super Admin
- Platform Operations
- Platform Support
- Platform Billing
- Platform Release Manager

## Agency management

- list/search agencies
- agency health
- plan
- usage
- features
- integrations
- suspend/reactivate
- configuration

## Support sessions

Support must be explicit:

- agency
- platform actor
- reason
- access level
- start
- expiry
- end

Access:

- READ_ONLY
- OPERATIONAL_SUPPORT
- FULL_SUPPORT

No silent impersonation.

Sensitive support sessions must be audited.

## Break-glass

Require:

- reauthentication
- MFA where available
- explicit reason
- short expiry
- complete audit

## Feature flags

Support:

- global availability
- plan availability
- agency override
- beta
- rollout percentage
- activation
- expiration
- minimum version
- emergency disable

## Entitlements

Support:

- plan
- agency override
- temporary access
- expiration
- beta access
- add-ons
- usage limits

## Remote configuration

Examples:

- overdue threshold
- GPS idle threshold
- maintenance warning distance
- alert thresholds

Must be:

- versioned
- audited
- reversible
- non-executable

## Release management

Channels:

- INTERNAL
- BETA
- STABLE

Support:

- versions
- rollout
- target agencies
- minimum version
- rollback

For native apps, use signed/platform-approved updates. Never implement arbitrary remote code execution.

## Platform health

Monitor:

- API
- database
- scheduler
- PDF
- storage
- messaging
- signature
- telemetry
- queues/jobs
- error rates

## Support tools

Potential:

- retry failed jobs
- retry webhooks
- inspect integrations
- regenerate documents
- invalidate sessions
- disable compromised users
- diagnostics
- temporary debug logging

Do not expose arbitrary SQL editing.

## Emergency controls

Potential:

- disable new reservations
- disable messaging
- disable GPS ingestion
- disable document uploads
- disable new agency signup
- maintenance mode
- stop scheduler
- revoke platform sessions

All must be confirmed, audited and reversible where possible.

## Separate audit domains

`AGENCY_AUDIT != PLATFORM_AUDIT`

Platform access to an agency must generate platform audit records.

---

# 33. RELEASE / OTA PHILOSOPHY

There are three separate mechanisms:

## Feature rollout
Enable functionality for an agency without code deployment.

## Remote configuration
Change thresholds/templates/settings without code deployment.

## Application release
Deploy actual application code.

Never conflate these.

For web/PWA, server deployment controls application code.

For future native apps, use signed releases and official platform mechanisms.

---

# 34. B2C / INSTANT-DRIVE — FUTURE ONLY

Potential future ecosystem:

- consumer rental marketplace
- mobile-first
- instant booking
- digital contracts
- keyless entry
- QR/NFC
- consumer identity verification
- dynamic pricing
- insurance options
- location services
- host/agency supply

This is **B2C-FUTURE**.

Do not allow it to inflate the current B2B roadmap.

---

# 35. POTENTIAL "KILLER" WORKFLOWS

## Contract Ready
Today's reservations automatically become printable contract packets.

## Blank Slate
Print a numbered blank contract when customer information is not yet known; reconcile later.

## Cash Session
Expected vs actual cash with immutable financial records.

## Ghost State
Detect contradictory vehicle state.

## Vehicle Transfer Recommendation
Recommend moving vehicles between branches before shortages occur.

## Tomorrow Risk
Identify tomorrow's operational problems today.

## Vehicle Profitability
Revenue minus actual operating costs, not revenue alone.

## Morning Brief
Owner receives a concise operational explanation.

## Focus Mode
Desk/field agent sees only what needs action.

## Agency Health
Owner can see whether their business is operationally healthy without digging through modules.

---

# 36. EXPERIMENTAL / HIGH-RISK IDEAS

The brainstorm included ideas that must remain experimental until validated:

- dynamic deposits based on customer risk
- customer risk scoring
- employee performance/fatigue inference
- automated fraud scoring
- automatic blacklisting
- automatic immobilization
- starter-kill
- silent behavioral profiling
- automatic damage deduction
- autonomous pricing
- AI legal interpretation
- automated compliance decisions
- scraping external marketplaces
- automated vehicle acquisition recommendations
- predictive resale timing

These must not be implemented merely because they appear in brainstorming.

If revisited:

1. define exact purpose
2. assess privacy/legal implications
3. assess false-positive consequences
4. make decisions explainable
5. keep human approval
6. audit everything

---

# 37. REJECTED / DEFAULT-REJECTED

Unless explicitly reconsidered:

- autonomous vehicle immobilization
- automatic starter-kill
- automatic blacklisting
- silent employee fatigue profiling
- silent night profiling
- AI making irreversible financial/legal/security decisions
- arbitrary remote code execution through OTA
- fake provider integrations
- hard-coded uncertain legal requirements
- storing secrets in frontend configuration
- platform admin bypasses without audit

---

# 38. DATA / PRIVACY PRINCIPLES

Sensitive data includes:

- CIN/passport
- driving licence
- customer contact information
- rental history
- GPS history
- financial records
- inspection photos

Requirements:

- least privilege
- tenant isolation
- encryption where appropriate
- signed access
- audit
- retention policy
- purpose limitation
- configurable access
- secure deletion/retention workflow where legally appropriate

CNDP/Law 09-08 requirements must be verified against authoritative/current sources before legal claims are encoded.

---

# 39. SECURITY INVARIANTS

Never compromise:

- tenant isolation
- authorization
- financial immutability
- audit integrity
- document access control
- secret isolation
- session security
- provider credential isolation
- release integrity

Platform admin must not casually bypass these.

---

# 40. ARCHITECTURAL INTEGRATION RULES

External providers always sit behind ports/adapters.

Examples:

- `TelematicsProvider`
- `MessagingProvider`
- `ElectronicSignatureProvider`
- `StorageProvider`
- future `BillingProvider`
- future `MapsProvider`

The domain must not depend directly on provider SDKs.

Provider states must distinguish:

- connected
- unavailable
- simulated
- failed

No simulated result may be represented as a successful real-world event.

---

# 41. PHASED ROADMAP

## Phase 0 — Research/Architecture
**Completed**

## Phase 1 — Operational Foundation
**Completed**

## V1 — Operational Intelligence
**Completed**

## V1 Hardening
**Completed**

## UX + Platform Control Plane
**Next foundation step**

Establish:

- UX system
- capability-based access
- platform IAM
- support mode
- feature flags
- entitlements
- remote config
- release model
- platform audit
- health/operations foundation

## V2 — Real Integrations + Infrastructure

Priority:

1. production object storage adapter
2. worker process / job architecture
3. first live e-signature provider
4. first live messaging provider
5. first real telematics/GPS provider
6. live map
7. richer telemetry
8. advanced maintenance
9. deeper reporting
10. production observability

## V2.5 — Intelligence

- anomaly intelligence
- predictive maintenance groundwork
- fleet optimization
- customer intelligence
- financial intelligence
- scenario analysis

## V3 — AI / Advanced Intelligence

- AI Copilot
- grounded RAG
- AI morning brief
- damage intelligence
- predictive maintenance
- pricing intelligence
- natural-language reporting
- what-if simulation
- advanced fleet intelligence

## B2C Future

Instant-Drive remains separate.

---

# 42. PRIORITIZATION RULE

When choosing what to build next, evaluate:

1. Does it save an agency employee time?
2. Does it prevent a costly mistake?
3. Does it make the owner more money?
4. Does it reduce operational risk?
5. Does it exploit Morocco-specific workflow?
6. Does it create defensible product intelligence?
7. Does it improve data quality for future intelligence?
8. Does it create monetizable value?
9. Is it legally/technically safe?
10. Can it be explained and audited?

A feature scoring poorly across these dimensions should not outrank a boring but valuable workflow.

---

# 43. DEFINITION OF "INTELLIGENCE"

locaOS intelligence should progressively evolve:

### Level 0 — Record
What happened?

### Level 1 — Detect
Something unusual happened.

### Level 2 — Explain
Why is it unusual?

### Level 3 — Recommend
What should the operator do?

### Level 4 — Simulate
What happens if the operator does X?

### Level 5 — Automate
Execute approved low-risk actions.

### Level 6 — Autonomous
Reserved for very low-risk, reversible operations only and requires explicit future approval.

The product should remain primarily at Levels 1–4 until trust is established.

---

# 44. SOURCE / VERIFICATION POLICY

This specification consolidates brainstorming and implementation decisions.

It does not itself make a legal or regulatory claim true.

For Morocco-specific regulatory facts:

- cite authoritative sources where possible
- record verification date
- record effective date
- keep uncertain rules configurable
- never silently convert secondary-source claims into mandatory product behavior

For provider integrations:

- verify API availability
- verify credentials/onboarding
- verify commercial/legal availability in Morocco
- use adapter status `UNAVAILABLE` when not verified

---

# 45. CURRENT OPEN QUESTIONS

Before production commercialization:

1. Which Moroccan e-signature provider will be first live provider?
2. Which WhatsApp Business onboarding model?
3. Which GPS/telematics provider is the first production integration?
4. Which object storage provider/region?
5. Which billing provider?
6. Final SaaS plans/pricing?
7. Exact compliance/legal review?
8. Retention policies for identity/GPS/inspection data?
9. Whether multi-branch is included in base plans or add-on?
10. Which advanced features become paid add-ons?

These are product decisions, not assumptions.

---

# 46. NON-NEGOTIABLE DEVELOPMENT RULE

Future coding agents must:

1. Read this document before major feature work.
2. Inspect the current repository before implementation.
3. Never assume a feature exists because this document describes it.
4. Distinguish current implementation from planned functionality.
5. Do not implement EXPERIMENTAL/RESEARCH ideas without explicit approval.
6. Do not implement B2C features during B2B phases.
7. Do not bypass tenant isolation.
8. Do not fake external integrations.
9. Do not silently change major architectural decisions.
10. Commit meaningful checkpoints.
11. Run tests/typecheck/lint before declaring completion.
12. Stop at phase boundaries for owner review.

---

# 47. MASTER PRODUCT TEST

A mature locaOS experience should allow an owner to ask:

> "What's happening with my business?"

and get:

- what is happening
- what is wrong
- what is about to go wrong
- what money is at risk
- what cars are underperforming
- what customers require attention
- what staff needs to do
- what the system recommends
- why it recommends it

A mature field workflow should allow an employee to stand next to a car and complete the job without navigating a desktop-style database.

A mature platform operator should be able to:

- onboard an agency
- configure it
- activate features
- support it safely
- monitor it
- monetize it
- roll out improvements
- roll back failures

without compromising tenant security.

That is the long-term definition of locaOS.

---

# 48. STATUS

**This document is the consolidated product blueprint.**

It should be reviewed and ratified by the product owner before being treated as an implementation mandate.

Until ratified:

- CORE describes direction.
- MVP/V1/V2/V3 describes intended maturity.
- EXPERIMENTAL and RESEARCH are not implementation authorization.
- B2C-FUTURE is explicitly out of current scope.
- Existing repository code remains the implementation source of truth.

**Next approved action:** UX + Platform Control Plane architecture/implementation pass, followed by V2 planning.
