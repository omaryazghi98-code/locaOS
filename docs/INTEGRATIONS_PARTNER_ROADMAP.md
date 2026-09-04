# locaOS — Integrations & Partner Roadmap

## Purpose

locaOS is Morocco-first, so integrations are part of the product architecture rather than a list of one-off API calls. The goal is to connect authoritative rental operations to payments, communications, mobility, travel, fleet telemetry, compliance and partner benefits without creating a second source of truth.

This document is a roadmap and architecture boundary. A provider appearing here does **not** mean that a public API, commercial agreement, institutional authorization or production access currently exists.

## Integration classes

- **API** — public/contracted machine interface is available and can be implemented behind an adapter.
- **Commercial** — provider partnership, merchant onboarding or private credentials required.
- **Institutional** — government/regulatory/data access requires authorization or an official relationship.
- **Provider adapter** — locaOS normalizes provider-specific events/capabilities into domain events.
- **Compliance relationship** — important to security/legal posture but not itself a product API.
- **Manual fallback** — every important partner workflow must remain operable when the provider is unavailable or has no API.

## Non-negotiable integration architecture

Every external integration must sit behind a provider adapter. Domain modules must not depend directly on provider SDKs, URLs or payload shapes.

```text
locaOS domain authority
        |
   Integration Hub
        |
  Provider adapters
        |
 external systems
```

Each adapter should expose, as applicable:

- capability discovery
- credentials/configuration per agency
- sandbox/production mode
- outbound request idempotency
- inbound webhook/event handling
- provider reference ID
- retry/backoff policy
- timeout/failure state
- reconciliation support
- evidence/raw provider reference where appropriate
- normalized locaOS event
- audit event for consequential actions
- tenant isolation
- explicit human/manual fallback

External systems never become authoritative over rental state, contract versions, settlement totals, deposit authority or vehicle lifecycle.

---

## Phase 0 — Integration foundation

**Goal:** build the plumbing before integrating many providers.

1. Create a provider-neutral integration model.
2. Create agency-level integration configuration and capability status.
3. Store credentials/secrets outside normal business records; never expose secrets in UI/audit.
4. Add provider connection/test status.
5. Add webhook receipt/idempotency infrastructure.
6. Add outbound request/event logs with sensitive-data redaction.
7. Add provider reference IDs and reconciliation references.
8. Add integration health/failure visibility to NAVI.
9. Add immutable audit events for provider-driven financial/operational mutations.
10. Keep manual issuance/entry available for partner programs.

### Canonical pattern

```text
External provider
  -> adapter
  -> normalized event
  -> authoritative domain command/service
  -> domain state change
  -> audit/activity event
  -> NAVI visibility
```

Never:

```text
External webhook -> direct DB mutation
AI -> provider API -> hidden domain mutation
```

---

# Phase 1 — Morocco payments & cash network

## Cash collection / payout / payment partners

Priority targets:

- Cash Plus
- Tashilat
- Wafacash
- Chaabi Cash
- Damane Cash
- Barid Cash
- Cashway
- other Moroccan cash/payment networks discovered during commercial research

### Use cases

- customer payment collection
- payment link / remote payment where supported
- cash-in confirmation
- payout/refund workflows where supported
- payment status callbacks
- provider transaction reference
- reconciliation
- branch/merchant identification
- receipt/evidence attachment

### Architecture

```text
locaOS Payment
    |
 PaymentMethod / Provider
    |
 provider adapter
    |
 Cash Plus / Wafacash / Tashilat / ...
```

The rental payment ledger remains authoritative. Provider status is evidence that must be reconciled against the locaOS payment record.

## Card / online payment

Research/integration targets:

- CMI
- NAPS
- Payzone
- Moroccan bank acquiring/payment services
- Stripe
- Adyen
- Checkout.com
- PayPal
- Apple Pay / Google Pay where commercially and technically available

Capabilities:

- authorization
- capture
- payment confirmation
- refund
- reversal
- chargeback/dispute reference
- webhook reconciliation
- idempotency
- frozen FX context where applicable

---

# Phase 2 — WhatsApp & communications

## WhatsApp — high priority

Target:

- WhatsApp Business Platform / Cloud API

Use cases:

- reservation confirmation
- pickup/return reminders
- contract-ready notification
- payment receipt
- deposit receipt/release notification
- late-return communication
- settlement communication
- document delivery
- payment links where supported
- customer replies linked to Customer 360/activity timeline
- agent handoff

Rules:

- no hidden autonomous customer commitments
- templates and consent/eligibility must be explicit
- inbound messages are evidence/events, not automatic authorization
- communication history is tenant-scoped and auditable

Other channels:

- SMS providers
- transactional email
- push notifications
- OTP/verification providers

---

# Phase 3 — Fleet GPS / telematics

## Provider-neutral telemetry

Target provider families:

- Wialon
- Geotab
- Teltonika
- Traccar
- Queclink
- Ruptela
- local Moroccan telematics providers
- vehicle OEM APIs where legitimately available

Capabilities:

- live location
- last-seen/device health
- odometer/mileage evidence
- trip history
- geofences
- movement events
- unauthorized movement signals
- maintenance mileage signals
- recovery/theft assistance evidence

### Critical boundary

GPS is **evidence**, not an automatic judgment engine.

Example:

```text
GPS says vehicle crossed geofence
        -> signal
        -> NAVI explains evidence
        -> policy/rental context evaluated
        -> authorized human/domain action
```

Do not automatically charge a customer, declare theft, or create damage liability from telemetry alone.

---

# Phase 4 — Flight / airport ecosystem

## Flight tracking

Research/integration targets:

- FlightAware / AeroAPI
- Amadeus
- Cirium
- Aviationstack
- other licensed aviation-data providers

Use cases:

```text
Reservation
  -> flight number
  -> flight status / ETA
  -> pickup readiness signal
  -> agent/NAVI alert
  -> human-confirmed operational adjustment
```

Capabilities:

- scheduled/estimated arrival
- delay status
- cancellation/diversion where available
- flight identification
- airport association
- customer pickup readiness

Flight data should suggest operational adjustments; it must not silently amend contract dates/times or pricing.

## Airport / tourism ecosystem

Partnership targets:

- ONDA / airport ecosystem
- airport parking/meet-and-greet
- transfer providers
- hotels
- tourism operators
- concierge/activities providers

---

# Phase 5 — Maps, routing & location

Targets:

- Google Maps Platform
- Mapbox
- HERE
- OpenStreetMap ecosystem

Capabilities:

- geocoding
- reverse geocoding
- route/ETA
- distance calculation
- location autocomplete
- pickup/dropoff normalization
- nearest branch/vehicle context
- geofencing support

Location providers remain supporting infrastructure; rental authority stays in locaOS.

---

# Phase 6 — Morocco institutional / compliance ecosystem

## NARSA — institutional target

Potential areas to investigate only through authorized access:

- vehicle administrative data
- registration/identification verification
- driver/licence-related verification
- legally accessible infraction/compliance information
- document verification

**Do not assume a public API exists. Do not scrape government systems as an integration strategy.**

Architecture target:

```text
NARSA access agreement / official interface
        -> NARSA adapter
        -> normalized verification evidence
        -> human/authorized domain workflow
```

## DGSSI — security/compliance ecosystem

DGSSI is not treated as a normal SaaS API provider. Track it as a security/compliance relationship and architectural requirement.

Areas:

- cybersecurity requirements
- application security
- sensitive information systems
- security assessment/audit
- incident/security posture
- qualified security providers where applicable

## CNDP — personal-data compliance

Track as a first-class compliance boundary for:

- customer identity documents
- personal-data processing
- retention
- access/correction/deletion processes
- consent/notice where applicable
- processors/subprocessors
- cross-border data considerations

## Other institutional targets

Research/partnership targets as relevant:

- DGI
- OMPIC
- CNSS
- ONDA
- ADM
- ONCF
- municipal/local authorities
- Moroccan trust-service / e-signature ecosystem

These are not assumed to have directly usable public APIs.

---

# Phase 7 — Toll, fuel & mobility partners

## Jawaz / ADM

Target capability:

- prepaid/rechargeable toll benefit
- Pass identifier
- recharge/transaction evidence where accessible
- reservation/customer/vehicle/campaign association
- benefit issuance and redemption tracking

Boundary:

**Jawaz credit is a mobility benefit, not a rental payment or deposit.**

It belongs in the benefit ledger and partner reconciliation flow.

## Afriquia

Target capability:

- prepaid fuel card/voucher benefit
- gasoline/diesel benefit
- campaign/promotional benefit
- customer compensation
- partner-funded benefit
- issuance/redemption evidence

Do not hard-code one Afriquia product. Product, card and provider terms must be verified before implementation.

## Other mobility partners

Extensible targets:

- fuel networks
- EV charging
- parking
- tolls
- transport/transfer providers
- roadside services

---

# Phase 8 — Identity, OCR & signatures

## Identity/document verification

Targets:

- Moroccan document OCR/verification providers
- passport MRZ
- driver's licence OCR
- document authenticity providers
- selfie/liveness providers where legally and commercially appropriate

Pattern:

```text
OCR / verification
    -> proposed fields/evidence
    -> human confirmation
    -> authoritative customer/document record
```

OCR never silently overwrites identity data.

## E-signature

Targets:

- Moroccan qualified trust-service providers
- DocuSign
- Adobe Acrobat Sign
- other legally suitable providers

Signed contract versions remain immutable/snapshot-based. Signature provider references are attached as evidence.

---

# Phase 9 — Insurance, roadside assistance & claims

Targets:

- insurers
- brokers
- fleet insurance providers
- roadside assistance networks
- towing/dépannage
- tyre/battery/fuel assistance
- accident assistance
- claims platforms

Use cases:

```text
Incident
 -> assistance case
 -> provider dispatch
 -> ETA/status
 -> evidence/invoice
 -> rental/vehicle linkage
 -> audit
```

---

# Phase 10 — Fleet/OEM/maintenance ecosystem

Targets:

- OEM connected-car APIs where available
- VIN/specification services
- OBD/telematics
- garages
- tyre suppliers
- parts suppliers
- maintenance platforms
- inspection providers

Use cases:

- odometer synchronization
- maintenance due signals
- vehicle specification enrichment
- service records
- parts/tyre records
- maintenance cost capture

---

# Phase 11 — Accounting / ERP

Priority approach: export first, API synchronization second.

Targets:

- Sage
- Odoo
- QuickBooks
- Xero
- Moroccan accounting systems
- accountant-specific import/export formats
- bank statement/reconciliation feeds where available

Boundary:

**locaOS remains the rental financial authority.**

Accounting integrations consume authoritative invoices, payments, refunds, deposits, settlements and expenses. They do not independently rewrite rental financial truth.

---

# Phase 12 — Travel / partner ecosystem

Potential partners:

### Hotels

- Booking.com
- Expedia
- Hotelbeds
- Agoda
- direct hotel/group partnerships

### Activities

- GetYourGuide
- Viator
- Moroccan activity/tour operators

### Local partner benefits

- restaurants
- activities
- car wash/detailing
- SIM/mobile connectivity
- airport services
- fuel
- tolls
- parking
- transport

The partner-benefit ledger already defined in the loyalty roadmap is the normalized internal model.

---

# Integration priority matrix

| Priority | Area | Why |
|---|---|---|
| P0 | Integration Hub + adapter contracts | Prevent vendor coupling and unsafe direct mutations |
| P0 | Audit + provider references + reconciliation | Required for QA, finance and partner disputes |
| P1 | WhatsApp | Core customer communication and operational workflow |
| P1 | Moroccan payment/cash networks | Local agency adoption and payment collection |
| P1 | CMI/NAPS/Payzone/payment providers | Digital payment coverage |
| P1 | GPS/telematics adapter | Fleet visibility and evidence |
| P1 | Maps/routing | Pickup/transfer/field operations |
| P2 | Flight tracking | Airport-rental operational advantage |
| P2 | Jawaz / Afriquia benefit adapters | Loyalty/compensation/partner differentiation |
| P2 | E-signature | Contract digitization after contract authority is stable |
| P2 | OCR/document verification | Reduce manual entry while retaining human authority |
| P2 | Roadside assistance | Incident workflow |
| P3 | NARSA/institutional access | High value but authorization-dependent |
| P3 | Insurance/claims | Enterprise maturity |
| P3 | Accounting APIs | After export/reconciliation is proven |
| P3 | Hotels/activities/travel marketplace | Expansion after rental core is pilot-ready |
| P3 | OEM/advanced telematics | Advanced fleet intelligence |

---

# Provider onboarding checklist

Before marking an integration DONE:

- [ ] Provider relationship/access confirmed.
- [ ] Legal/commercial terms reviewed.
- [ ] Data-processing/privacy implications reviewed.
- [ ] Sandbox/test credentials available where applicable.
- [ ] Adapter contract defined.
- [ ] Tenant/agency credential isolation verified.
- [ ] Idempotency implemented.
- [ ] Webhook signature/authentication verified where applicable.
- [ ] Retries/timeouts/failure states implemented.
- [ ] Provider reference IDs stored.
- [ ] Reconciliation path implemented.
- [ ] Audit events implemented.
- [ ] Sensitive payload fields redacted from UI/logs.
- [ ] Manual fallback documented.
- [ ] FR/AR/EN user-facing states covered.
- [ ] Unauthorized/expired credentials handled.
- [ ] Provider outage does not corrupt authoritative rental state.
- [ ] Integration tested against real or certified sandbox behavior.

---

# First implementation path

The order is intentionally **not** “integrate every partner.”

### A. Foundation

1. Integration Hub contracts.
2. Provider configuration/secrets boundary.
3. Webhook/event inbox + idempotency.
4. Provider reference/reconciliation model.
5. Integration audit/activity timeline.
6. NAVI integration health/errors.

### B. First production-value adapters

7. WhatsApp.
8. Moroccan cash/payment network adapter with the first contracted provider.
9. Card/payment provider adapter.
10. GPS provider adapter.
11. Maps/routing adapter.

### C. Rental differentiation

12. Flight tracking.
13. Jawaz benefit adapter/manual benefit workflow.
14. Afriquia benefit adapter/manual benefit workflow.
15. E-signature.
16. OCR/document verification.

### D. Institutional/enterprise expansion

17. NARSA research/access track.
18. CNDP/DGSSI compliance hardening.
19. Insurance/assistance.
20. Accounting synchronization.
21. OEM/advanced telematics.
22. Hotels/activities/other partner marketplace.

## Definition of DONE

An integration is not DONE because an HTTP request succeeds. It is DONE when the provider can be safely used in the real rental lifecycle with authorization, tenant isolation, auditability, retries, reconciliation, provider evidence, failure handling and a manual fallback.
