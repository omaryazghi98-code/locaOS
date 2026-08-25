# locaOS Money + Time Engine Strategy

## Purpose

Money and time are cross-cutting operational primitives. Pricing, contracts, payments, deposits, cash reconciliation, overdue alerts, reports, and PDFs must use one source of truth.

## Money model

- Agency/base currency remains `MAD`.
- Rental quotes and contracts keep a canonical base-currency amount.
- Foreign-currency tender is supported independently from the contract's canonical MAD amount.
- Supported customer tender currencies should include at minimum MAD, EUR, USD, GBP, CHF, CAD, AED, and other currencies configured by the agency.
- A foreign payment stores: currency, amount in that currency, MAD equivalent, FX rate used, FX rate source/reference, rate timestamp, and the operator who confirmed the rate.
- Never silently apply a live market rate to a payment. A live/reference rate is only an input/suggestion; the operator confirms the transaction rate.
- Rate history is immutable for completed payments.
- Refunds use the original payment's FX basis unless a deliberate business rule says otherwise; never silently recompute a historical payment at today's rate.
- Reports default to MAD and may show the original foreign amount beside the MAD equivalent.
- Contract pricing remains canonical in the agency currency. A foreign-currency equivalent is only serialized when explicitly agreed and should carry the exact rate/source/time used.

## FX workflow

1. Show agency base amount (e.g. 4,500 MAD).
2. Operator selects tender currency (e.g. EUR).
3. LocaOS fetches/displays a reference rate when network/provider access is available.
4. Operator can adjust it to the agency-approved transaction rate.
5. UI shows: base amount, foreign amount, rate, source, timestamp, and rounding.
6. Operator confirms.
7. Payment persists the exact rate and resulting MAD equivalent.
8. Offline mode allows manual rate entry and explicit source label (for example `AGENCY_MANUAL`).

## Important regulatory boundary

locaOS should not present a generic public/mid-market FX rate as a legally mandated Moroccan exchange rate. The product should distinguish reference rates from the rate actually agreed/used by the agency. The Office des Changes regulates authorized foreign-exchange operators and their buy/sell rates; the product should preserve traceability and avoid pretending to be a licensed exchange service.

## Time model

- Persist instants in UTC.
- Each agency has an IANA timezone (`Africa/Casablanca` for Atlas Rent).
- Render local date/time using the agency timezone, never the browser timezone for business records.
- Rental-day calculation is centralized in one domain time engine.
- The engine accepts pickup instant, return instant, agency timezone, and rental policy.
- Default rental policy: 24-hour billing periods with configurable grace minutes and minimum 1 day.
- The engine returns billable days, elapsed duration, grace usage, and overdue status inputs.
- Extensions recalculate from the existing contract period and create an explicit period amendment/version; they never mutate a signed version in place.
- Scheduler/deadline logic uses the same engine so alerts agree with contracts and UI.
- DST/timezone transitions must be tested using the agency timezone rather than hardcoded UTC offsets.

## Required future UI behavior

### Payment

`4,500 MAD` should be primary. The operator can choose `EUR` and see a reference conversion, edit/confirm the agency rate, and then record the actual tender.

### Contract

The serialized contract should contain the canonical base amount. If a foreign-currency amount is explicitly agreed, serialize the foreign currency, rate, source, timestamp, and equivalent alongside the base amount.

### Reports

Show original transaction currency and amount plus the normalized MAD equivalent. Do not destroy the original currency information.

### Demo data

Seed at least one EUR, one GBP, and one USD payment scenario with explicit frozen demo rates so the UI exercises foreign-currency flows without requiring a live network connection.

## Test invariants

- Payment MAD equivalent equals foreign amount × confirmed rate under the system's documented rounding rules.
- Historical payments never change when the live/reference FX feed changes.
- Quote/contract totals are never changed by foreign-currency tendering.
- Rental days are derived by the time engine, not duplicated in UI/PDF code.
- Contract period, quote days, and serialized contract pricing must agree before a contract becomes printable/signable.
- An amendment creates a new immutable version.
