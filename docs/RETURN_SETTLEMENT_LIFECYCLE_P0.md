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
