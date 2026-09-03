# AI Handoff — 2026-09-03 Deposit/Provider Checkpoint

Branch: `fix/return-settlement-availability`

## Base preserved

This checkpoint continues from `ef635fcf44ae3fa738c9e60fd3adc2ec77cdfd15` and does not overwrite prior rental-integrity or deposit-integrity work.

## Implemented in this checkpoint

### Provider-agnostic deposit handling

The rental deposit is **optional**. No deposit remains a valid state when `quote.depositRequired = 0`; it is represented by the absence of a secured deposit record rather than a fake zero-value financial transaction.

For rentals that do use a deposit, handling is now explicitly separated from the financial rail/provider:

- `DIRECT` → custody `AGENCY`
- `PARTNER` → custody `PARTNER`
- `CARD_PREAUTH` → custody `EXTERNAL`

Provider identity remains a free-form provider name/reference so the domain does not become coupled to Wafacash, Fatourati, Stripe, CMI, or any future provider.

`deposit_method` was extended with generic `PARTNER` and `PAYMENT_PROVIDER` values. These are rails, not provider names.

### API behavior

`POST /api/finance/deposits` now accepts:

- `handling`: `DIRECT | PARTNER | CARD_PREAUTH`
- `provider`: optional for direct deposits, required for partner/preauth handling
- `providerRef`
- `preauthExpiresAt`
- existing `method` plus the generic partner/provider rails

Custody is derived server-side from handling. Invalid combinations are rejected instead of allowing a partner/external deposit to masquerade as agency-held funds.

### Database

`apps/api/drizzle/0007_deposit_provider_agnostic.sql` adds:

- `deposit_handling` enum
- `deposit_custody` enum
- `deposits.handling` with default `DIRECT`
- `deposits.custody` with default `AGENCY`
- a consistency constraint tying handling to custody
- generic `PARTNER` and `PAYMENT_PROVIDER` values to the existing `deposit_method` enum

The existing `0006_deposit_integrity.sql` remains intact and still makes positive required deposits amount-enforced while allowing zero-required-deposit rentals.

### Tests

Added `apps/api/test/deposit.policy.spec.ts` covering:

- direct → agency custody
- partner → partner custody
- card preauth → external custody
- provider required for partner
- provider required for card preauth
- provider optional for direct

## Important architecture boundary

Do not turn Wafacash/Fatourati/Stripe/etc. into domain-specific rental states. Future provider integrations should be adapters around the generic provider/reference/transaction boundary. The authoritative rental settlement logic must remain provider-independent.

## Next work

1. Endpoint-level activation tests and stable `DEPOSIT_AMOUNT_INSUFFICIENT` API mapping.
2. Endpoint-level deposit charge/release regression tests.
3. Authoritative final settlement object/snapshot and payment/deposit allocation.
4. Activation concurrency hardening.
5. Contract period/price amendment recalculation wiring.
6. Explicit `INSPECTED → preparation/QC → rentable` vehicle lifecycle.

## Latest branch checkpoint

`8a65573f463d4e03ddc2bc8f1887dd127fabcbe0`

The latest commit also updates `docs/RETURN_SETTLEMENT_LIFECYCLE_P0.md` so future work can continue from the documented state.
