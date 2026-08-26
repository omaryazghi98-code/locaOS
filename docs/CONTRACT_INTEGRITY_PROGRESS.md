# Contract Integrity — Current Progress

## Baseline

At the start of this pass the local baseline was green:

- `pnpm typecheck` ✅
- `pnpm build` ✅
- `pnpm test:ci` ✅
- 47 integration tests + 3 contract-logic tests = 50 passing

## Implemented in this pass

### Serialized quote lines

`ContractContent.pricing` now stores the quote line snapshot (`code`, `label`, `qty`, `unitAmount`, `total`) in addition to subtotal, daily rate, discount, total and currency.

This means the contract can explain its total and amendments can preserve non-rental extras instead of reconstructing pricing from only `dailyRate × days`.

Historical contract versions remain parseable because the new lines field defaults to an empty array.

### PDF parity

The contract PDF renderer now reads and prints the serialized quote lines from the immutable contract snapshot before the subtotal/discount/total rows.

### Amendment pricing foundation

Added a pure domain helper:

`recalculateContractPricing(pricing, { days?, dailyRate? })`

It recalculates the rental line, subtotal and total while preserving non-rental lines and existing discount values.

Added domain tests covering:

- period extension while preserving extras
- price amendment while preserving extras

## Still open in Contract Integrity #1

1. Wire `recalculateContractPricing` into the API amendment endpoint.
2. Make period amendments derive days from pickup/return timestamps and update the serialized pricing snapshot.
3. Load and serialize latest departure/return inspection evidence when generating a reservation-linked contract.
4. Add API integration coverage proving:
   - V1 remains immutable
   - amendment creates a new version
   - current version contains complete recalculated pricing
   - inspection values are snapshotted
5. Verify Contract UI and PDF use the exact same current version.
6. Manual FR/AR/EN PDF verification.

## Important rule

Do **not** make `UPDATE contract_versions` repairs. Contract versions are append-only. Corrections/reconciliation must create a new version and move `contracts.current_version_id` to it.
