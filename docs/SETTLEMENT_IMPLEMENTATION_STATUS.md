# Settlement Implementation Status

## Current slice

The experimental branch now contains:
- a pure `calculateSettlement()` domain function
- an authoritative `assembleContractSettlement()` application service
- a read-only `/api/contracts/:id/settlement` preview using that same assembler
- a hardened `/api/contracts/:id/close` route registered before the legacy close handler

The calculator handles:
- rental and other charge lines
- positive charges and negative discounts
- incoming and outgoing payments
- net payments
- deposit held amount
- deposit application
- deposit release/refund
- underpayment
- overpayment
- foreign-currency payment normalization when a settlement amount is supplied
- explicit exclusion of deposit-application payments so they are not counted twice
- immutable result shape suitable for a close-time snapshot

The assembler now adds verified return-time evidence that already has a persisted source:
- latest linked return inspection
- deposit charges
- damage charge lines sourced from deposit charges
- recorded contract payments and reversals
- FX normalization using the payment's stored settlement equivalent
- unresolved return-damage detection
- deposit finalization state

The close route now atomically:
1. locks the contract and vehicle rows
2. requires an active/amended contract with reservation + vehicle linkage
3. requires the vehicle to have progressed beyond the return-inspection waiting states
4. requires a finalized deposit when one is required
5. builds the same settlement used by the preview
6. blocks unresolved return damage
7. blocks an outstanding balance
8. blocks an outstanding customer overpayment/refund requirement
9. writes the settlement into a new immutable contract version
10. closes the contract and completes its reservation
11. records audit/event evidence

## Important boundary

The assembler deliberately does **not** invent dynamic pricing rules that are not yet represented by authoritative stored policy/data. In particular, a future complete settlement slice still needs explicit policy-backed inputs for:
- late return
- mileage
- fuel
- extras
- fines/fees
- amendments that alter the final charge basis
- configurable mileage/fuel/late-return policies
- FX snapshots beyond the payment-level stored equivalent

Those inputs must be added to the assembler before we claim the rental settlement engine is commercially complete.

## Financial invariant

A deposit is collateral, not revenue. A deposit charge becomes a settlement charge line and a deposit application; the payment row created by the current deposit-charge workflow is explicitly excluded from ordinary incoming payments so it cannot double-count the same money.

No UI or PDF should independently recalculate totals. Contract close, settlement preview, future receipt/PDF output, reports and invoices must consume the same settlement result/snapshot.
