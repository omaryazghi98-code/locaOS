# ADR-0007 — Contract engine: structured data → versioned templates → HTML→PDF

- Status: Proposed
- Date: 2026-08-24

## Context

Contracts are the legal heart of a Moroccan rental agency: FR/AR/EN, hybrid paper/digital,
blank printable numbered contracts reconciled later, versions, amendments (vehicle
replacement, added drivers, price changes), signatures, deposits, mileage/fuel (§8). Contracts
must never be hand-assembled HTML blobs; their content must remain queryable and explainable.
Arabic brings RTL text with shaping — most PDF libraries cannot render it correctly.

## Decision

- Contract content is a **structured JSON document** (schema-versioned), assembled by
  `packages/domain/contracts` from reservation/vehicle/customer/deposit data — never authored
  as free HTML.
- **ContractTemplate** records (per agency, per language, versioned) define field placement
  and boilerplate clauses. The renderer turns content+template into HTML, then **headless
  Chromium (Playwright)** produces the PDF — the one pipeline that renders FR/AR/EN
  faithfully (RTL, shaping, fonts embedded).
- **Numbering:** single per-agency database sequence is the only numbering authority.
  "Print Blank Contract" reserves a number and creates a stub (`BLANK_ISSUED`); the paper is
  later bound to a reservation (same number becomes the full contract) or `VOIDED(reason)`;
  sequence-gap report is a standard reconciliation view (critical-analysis §4).
- Any change generates a new immutable **ContractVersion** (content hash + rendered PDF
  object key); amendments are structured records referencing the version they produce.
  Signature evidence binds signatory + timestamp + content hash.
- Mandatory-clause compliance is **configuration**, seeded from common agency practice and
  labeled non-legal-advice (register #8/#14) — the product is not a legal authority (§19).

## Consequences

- Chromium in the worker image (weight + cold start) — accepted; rendering is async via queue.
- Templates are data: agencies can customize wording per language under version control.
- Blank-contract numbers leave the premises — reconciliation report is a permanent fixture.
- Obligations: numbering race test; Arabic RTL rendering test in CI (golden PDF comparison).

## Alternatives considered

- **pdf-lib / Typst / LaTeX** — excellent determinism, but Arabic shaping/RTL forces
  per-engine font pipelines that historically fail; retained as fallback for Latin-only docs
  (invoices).
- **Client-side print of an HTML page** — breaks numbering authority, versioning, evidence.
