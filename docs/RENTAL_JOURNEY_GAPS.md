# Rental Journey Gaps

This document records the first pass of the end-to-end operational audit. It intentionally distinguishes verified behavior from missing enforcement.

## P0 — pilot blockers

### 1. Readiness enforcement must be shared
The reservation screen exposes readiness blockers, but activation must enforce the same business rules server-side. A signed contract plus a vehicle must not be enough to hand over a car when the departure inspection or deposit is missing.

Acceptance:
- READY is rejected while blockers remain.
- Contract activation is rejected while handover prerequisites remain.
- The rejection explains the missing prerequisite.

### 2. Vehicle assignment must validate operational suitability
Assignment must validate:
- vehicle belongs to the same agency;
- vehicle is operationally available for the pickup period;
- vehicle category matches the reservation category;
- no overlapping reservation or maintenance window exists;
- vehicle is not blocked by legal/compliance status.

The database conflict protection remains the final safety net.

### 3. Return/close must be a real lifecycle
A contract should not become CLOSED merely because the endpoint is called. The return inspection and settlement/deposit decision must be part of the close path.

Acceptance:
- return inspection exists;
- vehicle return state is completed;
- deposit is released/settled/charged as applicable;
- outstanding financial state is explicit;
- only then close reservation/contract.

## P1 — workflow completeness

- New customer inline during reservation.
- Customer-first → New reservation.
- Create/edit vehicle data from UI.
- Create quote independently.
- Payment/deposit UI tied to reservation/contract.
- Departure/return inspection UI exposes all supported API capabilities.
- Maintenance and compliance entry flows.
- Clear next-action guidance on every major detail page.

## P1 — auditability

Every critical step should leave:
- business state;
- audit event;
- useful user-facing result;
- deterministic next action.

## P2 — convenience

- document scanning;
- e-signature;
- public booking;
- customer portal;
- WhatsApp automation;
- dynamic pricing;
- exports and migration tools.
