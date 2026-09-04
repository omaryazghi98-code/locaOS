# Deposit Policy — Provider-Agnostic Rental Flow

## Purpose

A rental agency may require a deposit, but **deposit requirement and deposit custody are separate concepts**.

`quote.depositRequired = 0` is a valid business case. In that case, activation must not require a deposit record.

When a positive deposit is required, the deposit may be secured through different operational models:

| Handling | Custody | Typical example | Activation evidence |
|---|---|---|---|
| `DIRECT` | `AGENCY` | Agency-held cash / bank deposit | Agency records the secured amount |
| `PARTNER` | `PARTNER` | Wafacash or another partner handles the deposit | Partner confirmation/reference + secured amount |
| `CARD_PREAUTH` | `EXTERNAL` | Card pre-authorization | Provider authorization/reference + secured amount |

The production model must remain provider-agnostic. Provider names and payment rails are implementation details, not deposit policy types.

## Invariants

1. **No deposit required**
   - `quote.depositRequired = 0`
   - No deposit custody obligation exists.
   - Contract activation may proceed without a deposit row.

2. **Deposit required**
   - The secured amount must be at least the required amount before contract activation.
   - The source of custody does not change the required amount.
   - A partner-held deposit is not treated as agency-held cash.
   - A card pre-authorization is not treated as agency-held cash.

3. **Activation status is not financial proof**
   - `HELD` / `PRE_AUTHORIZED` are the pre-rental secured states.
   - The amount is authoritative for the amount invariant; status alone is insufficient.

4. **Post-return disposition**
   - A secured deposit must eventually be released, charged/settled, or otherwise explicitly disposed of before contract closure.
   - Partial charges are cumulative and may never exceed the originally secured amount.

5. **Traceability**
   - Partner/provider references must be retained where applicable.
   - Deposit events form an append-only operational history.

## Architecture rule

The API remains the primary business-authority layer. Database constraints/triggers are backstops so direct database writes cannot bypass critical deposit invariants.

The deposit model must not assume that every agency holds a cash deposit itself. Future provider adapters should plug into the same handling/custody model rather than introducing provider-specific business logic into the contract lifecycle.
