# ADR-0008 — Financial integrity: integer money, append-only records, reversal corrections, cash sessions

- Status: Proposed
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
