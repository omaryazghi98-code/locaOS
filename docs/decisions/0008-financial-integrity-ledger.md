# ADR-0008 — Financial integrity: integer money, append-only records, reversal corrections, cash sessions

- Status: Proposed — amended 2026-08-24 after research reconciliation
- Date: 2026-08-24

## Context

Financial data is sensitive; nothing may be silently modified (§10). The owner must answer:
how much should be in the drawer, how much was counted, who handled it, which transactions
explain the difference. Moroccan reality: cash-dominant, card-not-guaranteed, transfers,
deposits (cash held or card pre-auth), refunds, outstanding balances, extra charges,
discounts.

## Decision

- **Money = integer centimes (`bigint`) + explicit currency (default MAD)** in code and DB;
  floats are banned from money paths (lint rule); formatting localized (fr-MA conventions).
- **Payments are append-only** (DB rejection triggers). Corrections are new reversal Payment
  rows linked via `reverses_payment_id`; every financial write emits an audit event with
  actor, reason where required.
- **Deposits** are a first-class lifecycle (PLANNED → HELD/PRE_AUTHORIZED → RELEASED →
  PARTIALLY_CHARGED → SETTLED). Charging a deposit is a human-confirmed action that requires
  an Approval record and evidence links (damage/fine) (§14).
- **Cash sessions** model the drawer: opened per branch+employee, expected cash derived from
  cash Payments in the session window, closing captures counted denominations, computes
  variance, and requires an explanation when non-zero. Cash movements always reference their
  session.
- **Ledger entries** are a derived double-entry projection for reporting — rebuildable from
  Payments; never authoritative.
- Invoices keep their own per-agency sequence; DGI e-invoicing rules remain UNVERIFIED and
  therefore configurable, not encoded (register #8).

## Consequences

- Historical amounts are provably unmodified; audit + reversals tell the full story.
- Reporting must aggregate through the projection, not re-derive ad hoc — one code path.
- Drawer accountability is per-session — requires disciplined open/close UX for staff.
- Obligations: append-only trigger tests; reversal-pair integrity checks in nightly job;
  reconciliation golden tests on seeded scenarios.

## Alternatives considered

- **Editable payments with audit trail** — even audited edits undermine the §10 guarantee
  ("never silently modify") and reconciliation math; rejected.
- **Decimal columns / Money class with fractions** — centimes integers are simpler and exact;
  rounding policy lives in one formatting module.

## Amendment (research reconciliation, 2026-08-24)

- **Multi-currency cash (added):** MRE/tourist reality — EUR/USD cash accepted; payment
  stores currency + human-confirmed rate + MAD equivalent; cash sessions count per currency
  with MAD-equivalent variance. The research's "auto-correct to BAM rate" (alert #85) is
  rejected — the rate is a human-confirmed fact of the day; a `FxRateProvider` (BAM
  reference) may *suggest* rates from V1.
- **Deposits:** card pre-authorization carries provider (CMI PLBS) ref and
  `preauth_expires_at` (research #36) feeding the signal layer; preauth renewal is a
  suggested task, never automatic.
- **Invoices:** Art. 145 CGI mentions validation added (VERIFIED, register #18); DGI
  e-invoicing (clearance, UBL/CII) is a V1+ `EInvoicingPort` — PME wave Jan 2027
  (register #8); format configurable, no hard-coded spec assumptions.
- **Recurring research concepts converted per §14:** auto-bill/auto-deduct (fuel, missing
  accessories, extra mileage, late penalties, fines) → draft charges requiring human
  confirmation; the daily reconciliation protocol is confirmed as the MVP's killer feature.
