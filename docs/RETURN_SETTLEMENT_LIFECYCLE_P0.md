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

### Verified remaining work before this P0 can be considered complete

1. Add regression tests specifically for mismatched inspection vehicle/contract/reservation combinations.
2. Enforce `actual deposit amount >= quote.depositRequired` during activation.
3. Prevent deposit charges from exceeding the remaining secured deposit amount.
4. Prevent deposit release before a completed return inspection under the intended lifecycle policy.
5. Finish authoritative final settlement rather than relying on close-time rental-payment comparison alone.
6. Harden activation concurrency around contract/reservation/vehicle state.
7. Complete period/price amendment recalculation through the shared money/time pricing helper.
8. Explicitly model the post-return `INSPECTED → preparation/QC → rentable` lifecycle using the existing vehicle state machine.

Do not mark the overall rental lifecycle pilot-ready until these invariants and their regression tests are green.
