# P0: Return → Settlement → Close → Vehicle Availability

Issue: #14

## Goal

Make the rental completion lifecycle an enforced server-side invariant.

## Current confirmed gap

`POST /api/contracts/:id/close` currently permits an ACTIVE/AMENDED contract to become CLOSED and its reservation to become COMPLETED without requiring a return inspection or settlement. The vehicle state is managed separately through `transitionVehicle`, so contract closure alone must never imply vehicle availability.

## Target invariant

1. A rental must have a completed return inspection before it can close.
2. Required settlement work must be complete before closure.
3. Outstanding rental financial obligations must prevent closure.
4. Deposit disposition must satisfy the configured/business rules before closure.
5. Vehicle availability must be an explicit, valid post-return transition, not a side effect of contract closure.
6. All related changes must be tenant-scoped, authorized, auditable, and atomic where state changes are coupled.

## Scope for implementation

Inspect and update the existing contract close, return inspection, finance/settlement, reservation, and fleet transition paths. Preserve existing domain semantics; do not invent unsupported policy.

Regression tests must cover invalid and valid closure paths, including unresolved return inspection, unresolved settlement/financial obligation, and correct post-settlement vehicle disposition.

## Progress checkpoint — 2026-09-03

### Completed on `fix/return-settlement-availability`

- Contract close now requires a return inspection, completed return state, finalized deposit disposition, settled rental balance, and resolved newly discovered return damage.
- Contract close intentionally leaves the vehicle in `INSPECTED`; closure does **not** imply vehicle availability.
- `transitionVehicle` remains the authoritative vehicle-status mutation path.
- Rental-integrity regression coverage now exercises the closure gates above.
- **Inspection relationship integrity was hardened:** reservation-linked inspections now require an assigned reservation vehicle and require `reservation.vehicleId === inspection.vehicleId`; contract-linked inspections require `contract.vehicleId === inspection.vehicleId` and, when applicable, contract/reservation identity consistency.
- Return-inspection completion revalidates the reservation/contract/vehicle relationships before transitioning the vehicle to `INSPECTED`.
- **Deposit integrity was hardened:** deposit creation now refuses an amount below the reservation quote's `depositRequired`; deposit charging locks the deposit row and refuses charges above the remaining secured amount; deposit release now requires a contract/reservation/vehicle match plus a completed return-inspection state.
- A database migration (`0006_deposit_integrity.sql`) adds authoritative activation and deposit-charge limits so direct database writes cannot bypass the core deposit invariants.
- Pure deposit-integrity regression tests cover insufficient activation security, exact/above-required security, overcharging, zero charges, and exact remaining-capacity charges.

### Important implementation note

The API activation path still has its pre-existing status-only deposit check, but the new database trigger rejects an `ACTIVE` transition when the secured amount is below the current reservation quote requirement. The next hardening pass should surface that database invariant as a stable API error code and add endpoint-level activation tests rather than relying on the database exception boundary.

### Verified remaining work before this P0 can be considered complete

1. Add endpoint-level regression tests specifically for mismatched inspection vehicle/contract/reservation combinations.
2. Add endpoint-level activation regression coverage for insufficient and sufficient deposit amounts, including stable `DEPOSIT_AMOUNT_INSUFFICIENT` API behavior.
3. Add endpoint-level regression coverage for deposit overcharge and release-before-return-inspection.
4. Finish authoritative final settlement rather than relying on close-time rental-payment comparison alone.
5. Harden activation concurrency around contract/reservation/vehicle state.
6. Complete period/price amendment recalculation through the shared money/time pricing helper.
7. Explicitly model the post-return `INSPECTED → preparation/QC → rentable` lifecycle using the existing vehicle state machine.

Do not mark the overall rental lifecycle pilot-ready until these invariants and their regression tests are green.
