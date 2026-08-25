# Contract Logic Audit

Date: 2026-08-25
Canonical branch: `arena/01a031b1-locaos`

## Defect found
A seeded contract could contain contradictory dates, duration and pricing. Example: contract `ATL-2026-00096` printed 25/08/2026 15:51 → 04/09/2026 15:51 (10 days) while also printing `Nombre de jours 4` and `TOTAL 1400 MAD`.

## Rule now enforced
Rental duration is derived from the reservation pickup/return timestamps using `ceil((return - pickup) / 24h)`, minimum one day.

When a quote exists during contract assembly:
- the derived reservation duration must equal `quote.days`;
- otherwise contract generation fails instead of creating a contradictory snapshot;
- serialized contract period/pricing days use the derived duration;
- pricing amounts continue to come from the quote snapshot.

## Demo seed
The historical demo seed builder contained hardcoded `4 days / 350 MAD / 1400 MAD` values. Rather than maintaining a second hardcoded calculator, the API demo seed now runs `repair-demo-contract-snapshots.mjs` after seeding.

The repair script:
- derives days from each seeded reservation;
- verifies the quote has the same day count;
- copies quote subtotal, daily rate, discount, total and currency into the contract snapshot;
- refreshes the snapshot quote reference/version;
- recomputes `content_hash` after the repair.

This preserves the existing seed data while ensuring the printed contract is synchronized with its source reservation/quote data.

## Verification
Added API unit coverage for exact ten-day periods, partial-day rounding, and invalid periods in `apps/api/test/contract.logic.spec.ts`.

## Next manual check
After syncing, run the repair script against the existing demo DB and re-open the same contract PDF. Expected for RES-2402 / contract 96: 10 days and quote-derived pricing, not 4 days / 1400 MAD.
