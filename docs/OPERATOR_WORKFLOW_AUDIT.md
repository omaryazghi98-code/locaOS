# locaOS — Operator Workflow Audit

**Scope:** real agency desk workflow from customer intake through handover and return.

**Status:** Active implementation audit

## What the live workflow exposed

The product has a strong domain/API foundation, but several operational actions were not reachable or were confusing from the agent UI.

### Confirmed P0/P1 findings

- Customer creation was not exposed from the Customers screen.
- New reservation only exposed pre-existing customers and could not create one inline.
- Reservation assignment could leave the vehicle operational state as `AVAILABLE` while the reservation displayed `VEHICLE_ASSIGNED`; readiness then reported `vehicle_not_ready`.
- Reservation blockers were rendered as raw codes without a direct remediation path.
- `Marquer prête` remained visible while the reservation was blocked; the server correctly rejected the transition, but the UI did not explain the remediation path.
- Field inspection exposed raw UUID/manual vehicle entry as a fallback, which is inappropriate for normal desk/field operation.
- Alert actions could be visible to a role without `alerts:resolve`, producing a permission error instead of a role-aware UI state.
- Contract language exists in the serialized contract/template system, but the operator document workflow needs an explicit language/template choice and parity verification.
- Current quoting accepts a manually entered daily rate; duration-band, seasonal and owner-configured pricing rules are not yet productized.

## Canonical operator journey

1. Find or create customer.
2. Create reservation.
3. Choose vehicle category.
4. Optionally assign a specific vehicle.
5. Validate vehicle/legal/maintenance readiness.
6. Prepare contract.
7. Perform departure inspection.
8. Secure deposit/payment.
9. Resolve blockers and mark READY.
10. Activate/handover.
11. Monitor active rental and exceptions.
12. Perform return inspection.
13. Calculate human-confirmed extra charges.
14. Release/charge deposit.
15. Settle balance.
16. Close contract and reservation.
17. Return vehicle to correct fleet state.

## Product rules

### Blocker rule

Every blocker must expose:

`problem → explanation → action → destination → completion signal`

No UI should tell an agent to perform an action that the UI does not expose.

### State rule

Reservation, vehicle, contract, inspection and finance state must stay synchronized. A reservation assignment must not leave the vehicle in a state that prevents the very handover it claims to prepare.

### Document rule

Contract copies should be generated from the immutable contract snapshot and a versioned document template. Agency copy, customer copy and applicable declarations should be explicit outputs. Identity fields must follow the selected validated template; UI masking is a privacy control, not a substitute for legal/document requirements.

### Pricing rule

Pricing should become explainable and owner-configurable:

`agency defaults → category/vehicle → rental-duration bands → season/date rules → authorised discount → floor/MAP`

The exact rule used must be frozen with the quote/contract snapshot.

### Alert/case rule

Alerts should support ownership and an auditable activity timeline, for example:

`OPEN → OWNED → action recorded → follow-up → RESOLVED`

Activities may include phone call, WhatsApp message, GPS check, customer contact, manager approval and other human actions. Financial/legal decisions remain human-approved.

## Implementation order

1. Customer onboarding UI — **implemented**.
2. Reservation blocker actions + safe back navigation.
3. Vehicle assignment → reservation-ready fleet transition.
4. Field inspection UX: reservation-first, no UUIDs, evidence capture, completion state.
5. Contract document package and explicit language/template choice.
6. Owner-configurable pricing rules and duration bands.
7. Alert/case activity timeline and role-aware actions.
8. Return/settlement workflow.
9. Manager/owner drill-down reporting and exports.
10. Telephony provider boundary for click-to-call + auditable call activities.

## Verification gate

Every workflow slice must have:

- domain/API invariant where relevant
- integration regression coverage
- UI success/failure feedback
- FR/AR/EN semantics
- permission-aware actions
- refresh/deep-link safety
- handoff note update
