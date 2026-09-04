# Return / Settlement P0 — 2026-09-04 Checkpoint

This is an additive checkpoint. Previous P0 documents remain authoritative history and are not overwritten.

## Work completed in this checkpoint

### Deposit activation backstop

Added `apps/api/drizzle/0008_deposit_activation_semantics.sql`.

The database now backstops the contract activation deposit invariant with provider-agnostic semantics:

- `quote.depositRequired = 0` remains a valid no-deposit path.
- Positive required deposits require a secured deposit amount at least equal to the quote requirement.
- Pre-rental secured states are `HELD` and `PRE_AUTHORIZED`.
- Deposit custody/provider type does not change the required amount rule.
- The check is performed at the database boundary so direct writes cannot bypass it.
- The trigger raises `DEPOSIT_AMOUNT_INSUFFICIENT` with required/secured centime values in the detail.

### Deposit policy documentation

Added `docs/DEPOSIT_POLICY.md` documenting the provider-agnostic model:

- `DIRECT` / `AGENCY` custody
- `PARTNER` / `PARTNER` custody (e.g. partner-handled cash)
- `CARD_PREAUTH` / `EXTERNAL` custody
- no-deposit path via `quote.depositRequired = 0`
- cumulative charge and post-return disposition requirements

## Existing activation path reviewed

The current real locaOS activation endpoint already enforces several important relationships before activation:

- contract must be `SIGNED`
- reservation must be `READY`
- contract/reservation vehicle IDs must match
- vehicle must belong to the agency and remain `IN_FLEET`
- vehicle category must match reservation category
- conflicting active reservations are checked
- departure inspection is required
- vehicle transition goes through `transitionVehicle`, which locks the vehicle row and validates the domain state machine

The remaining weakness in the API layer is that it currently checks the presence/status of a secured deposit rather than directly returning the stable `DEPOSIT_AMOUNT_INSUFFICIENT` application error. The database backstop now prevents the financial invariant from being bypassed; the API mapping remains a follow-up.

## Deposit handling rule — do not regress

A deposit is **not universally required** and must not be modeled as agency-held cash by default.

Supported business cases:

1. No deposit required.
2. Direct/agency-handled deposit.
3. Partner-handled deposit (including partner cash workflows).
4. Card pre-authorization / external provider custody.

Provider-specific adapters may be added later without changing the domain handling/custody model.

## Next P0 work

1. Add endpoint-level activation tests for zero/sufficient/insufficient deposits and stable error behavior.
2. Harden cumulative deposit charges and release/application lifecycle guards.
3. Complete authoritative return → settlement flow.
4. Finish activation concurrency tests.
5. Wire amendment recalculation and period validation.
6. Complete `INSPECTED → preparation/QC → rentable` lifecycle.
