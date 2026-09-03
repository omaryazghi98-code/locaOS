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

## Deposit policy — agency choice, not a universal requirement

A deposit is **optional** at the agency/rental level. locaOS must not assume that every agency requires one.

The operational choice should support at least these cases:

- **None** — no deposit is required or held for the rental.
- **Personally handled / direct** — the agency records a deposit handled directly by the agency/customer according to its local process.
- **Partner handled** — the deposit is handled through a partner/service such as cash collection or Wafacash; the partner/provider should be recorded rather than treating the money as an agency-held cash balance unless it actually is.
- **Card pre-authorization** — the agency records a credit-card pre-authorization rather than cash being held.

The current `quote.depositRequired` value is therefore the authoritative indication of whether an enforced deposit amount exists: when it is `0`, activation must not require a deposit. When it is greater than `0`, a secured deposit must meet that amount before activation.

This distinction is important for final settlement: **absence of an agency-held deposit is a valid state**, while a partner-held or externally handled deposit should remain traceable without being incorrectly represented as agency cash.

## Scope for implementation

Inspect and update the existing contract close, return inspection, finance/settlement, reservation, and fleet transition paths. Preserve existing domain semantics; do not invent unsupported policy.

Regression tests must cover invalid and valid closure paths, including unresolved return inspection, unresolved settlement/financial obligation, and correct post-settlement vehicle disposition.

## Progress checkpoint — 2026-09-03

### Completed on `fix/return-settlement-availability`

- Contract close now requires a return inspection, completed return state, finalized deposit disposition when an agency-held deposit exists, settled rental balance, and resolved newly discovered return damage.
- Contract close intentionally leaves the vehicle in `INSPECTED`; closure does **not** imply vehicle availability.
- `transitionVehicle` remains the authoritative vehicle-status mutation path.
- Rental-integrity regression coverage now exercises the closure gates above.
- **Inspection relationship integrity was hardened:** reservation-linked inspections now require an assigned reservation vehicle and require `reservation.vehicleId === inspection.vehicleId`; contract-linked inspections require `contract.vehicleId === inspection.vehicleId` and, when applicable, contract/reservation identity consistency.
- Return-inspection completion revalidates the reservation/contract/vehicle relationships before transitioning the vehicle to `INSPECTED`.
- **Deposit integrity was hardened conditionally:** when the reservation quote requires a deposit (`depositRequired > 0`), deposit creation refuses an amount below the required amount; deposit charging locks the deposit row and refuses charges above the remaining secured amount; deposit release requires a contract/reservation/vehicle match plus a completed return-inspection state.
- The database migration (`0006_deposit_integrity.sql`) enforces the same activation and deposit-charge limits while explicitly allowing activation when the required deposit is zero.
- Deposit integrity regression coverage exists for insufficient security, valid security, overcharging, zero charges, and exact remaining-capacity charges.
- **Deposit handling is now provider-agnostic:** `0007_deposit_provider_agnostic.sql` adds first-class handling/custody semantics without making deposits universal. `DIRECT` maps to agency custody, `PARTNER` maps to partner custody, and `CARD_PREAUTH` maps to external custody. `NONE` remains represented by no deposit record when no deposit is required.
- Deposit provider identity remains free-form rather than hard-coded to a vendor. The deposit rail now also has generic `PARTNER` and `PAYMENT_PROVIDER` enum values so future Wafacash, Fatourati, Stripe, card, bank, cash, or other adapters can be introduced without changing the custody model.
- The deposit API now accepts `handling`, optional provider/provider reference, and validates the required combinations. Partner and card-preauthorization handling require a provider; custody is derived server-side so partner/external funds cannot accidentally be treated as agency cash.
- Added unit coverage for deposit custody resolution and provider requirements in `deposit.policy.spec.ts`.

### Important implementation note

The API activation path still has its pre-existing status-only deposit check, but it is already conditional on `quote.depositRequired > 0`. The database trigger independently rejects an `ACTIVE` transition when a positive required deposit is not sufficiently secured. The next hardening pass should surface that invariant as a stable API error code and add endpoint-level activation tests rather than relying on the database exception boundary.

The provider-agnostic deposit model is deliberately an additive foundation: provider-specific API adapters should later attach to the generic provider/reference fields and financial transaction boundary rather than becoming part of rental lifecycle rules.

### Verified remaining work before this P0 can be considered complete

1. Add endpoint-level regression tests specifically for mismatched inspection vehicle/contract/reservation combinations.
2. Add endpoint-level activation regression coverage for insufficient and sufficient deposits, including the valid no-deposit path and stable `DEPOSIT_AMOUNT_INSUFFICIENT` API behavior.
3. Add endpoint-level regression coverage for deposit overcharge and release-before-return-inspection.
4. Finish authoritative final settlement rather than relying on close-time rental-payment comparison alone.
5. Harden activation concurrency around contract/reservation/vehicle state.
6. Complete period/price amendment recalculation through the shared money/time pricing helper.
7. Explicitly model the post-return `INSPECTED → preparation/QC → rentable` lifecycle using the existing vehicle state machine.

Do not mark the overall rental lifecycle pilot-ready until these invariants and their regression tests are green.
