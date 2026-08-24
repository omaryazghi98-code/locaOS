# Architecture Decision Records

ADRs document **why** a technology, boundary, or business rule was chosen, what was
rejected, and which assumptions remain open. They are immutable once accepted: superseding a
decision writes a new ADR that links back.

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](0001-modular-monolith-typescript.md) | Modular monolith on TypeScript (NestJS + Node) | Proposed |
| [0002](0002-postgresql-single-datastore.md) | PostgreSQL as the single datastore; Prisma for schema/migrations | Proposed |
| [0003](0003-multitenancy-shared-schema-rls.md) | Multi-tenancy: shared schema + `agency_id` + PostgreSQL RLS | Proposed |
| [0004](0004-monorepo-web-pwa.md) | pnpm/Turborepo monorepo; Next.js console + PWA field app | Proposed |
| [0005](0005-offline-pwa-inspections.md) | Offline-first field operations via PWA (IndexedDB outbox) | Proposed |
| [0006](0006-authn-authz-sessions-rbac.md) | Session-cookie authn + server-side RBAC permission matrix | Proposed |
| [0007](0007-contract-engine-structured-pdf.md) | Contract engine: structured data → templates → HTML→PDF (Chromium) | Proposed |
| [0008](0008-financial-integrity-ledger.md) | Financial integrity: integer money, append-only records, reversal corrections, cash sessions | Proposed |
| [0009](0009-alerts-telematics-ai-boundaries.md) | Alert rules engine, telematics port, read-only AI layer | Proposed |

## Template

```markdown
# ADR-NNNN — Title

- Status: Proposed | Accepted | Superseded by ADR-XXXX
- Date: YYYY-MM-DD
- Deciders: <who>

## Context
The forces at play; what problem demands a decision now.

## Decision
What we will do, stated precisely.

## Consequences
Positive, negative, and the obligations this creates (tests, docs, ops).
Open assumptions listed explicitly.

## Alternatives considered
Option → why rejected.
```
