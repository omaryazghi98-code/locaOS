# Settlement Implementation Status

## Current slice

The experimental branch now contains a pure `calculateSettlement()` domain function and a read-only contract settlement preview endpoint.

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
- immutable result shape suitable for a close-time snapshot

## Important boundary

The preview currently derives charge lines from the contract pricing snapshot and recorded contract payments. It does **not** yet claim to calculate every dynamic return charge automatically.

Before contract close becomes authoritative, the settlement assembler must incorporate verified return-time inputs such as:
- extensions
- late return
- mileage
- fuel
- extras
- fines/fees
- damage charges
- amendments
- deposit charges
- refunds/reversals
- FX snapshots

Close must consume the same settlement calculation and persist an immutable settlement snapshot. No UI or PDF should independently recalculate totals.
