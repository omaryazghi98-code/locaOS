# locaOS

**The operating system for Moroccan car-rental agencies** — not a fleet CRUD app, but a
system that understands the complete operational state of an agency: vehicles, reservations,
customers, contracts, payments, deposits, inspections, telematics, maintenance, fines,
insurance, employees, operations, profitability — and reasons about how they relate.

> *"Here is what is happening in my agency, what is about to go wrong, why, and what I
> should do."*

## Status

| Phase | Scope | State |
|---|---|---|
| **0 — Architecture** | analysis, architecture, domain & database models, stack, roadmap, ADRs | **In review** |
| 1 — Foundations | scaffold, CI, IAM, tenancy, audit, web shell | Not started |
| 2–9 | fleet → customers → reservations → contracts → inspections → finance → maintenance → alerts → reporting | Not started |
| 10+ | GPS, WhatsApp, AI copilot, predictive maintenance, dynamic pricing | Gated by ADRs |

⚠️ **The product research document
([`docs/research/`](docs/research/moroccan-rental-platform-research.md)) is missing from this
repository.** Phase 0 was derived from the project brief; every research-derived claim is
treated as unverified. See [`docs/research/README.md`](docs/research/README.md).

## Documentation map

- [Critical analysis](docs/architecture/critical-analysis.md) — contradictions, assumptions, questionable requirements
- [Proposed architecture](docs/architecture/proposed-architecture.md) — context, containers, modules, runtime flows
- [Domain model](docs/architecture/domain-model.md) — entities, lifecycles, invariants
- [Database model](docs/architecture/database-model.md) — tables, constraints, RLS, append-only design
- [Application structure](docs/architecture/application-structure.md) — monorepo layout & conventions
- [Tech stack](docs/architecture/tech-stack.md) — recommendation + alternatives
- [Roadmap](docs/architecture/roadmap.md) — phased delivery with acceptance criteria
- [ADR index](docs/decisions/README.md) — decision records 0001–0009
- [Verification register](docs/verification/register.md) — Morocco-specific facts and their verification status
- [AGENTS.md](AGENTS.md) — contributor/agent working contract

## Technology direction (proposed)

TypeScript end-to-end · NestJS modular monolith · PostgreSQL 16 (RLS + exclusion
constraints + append-only financial/audit tables) · Prisma migrations · Next.js console +
offline-first PWA for field operations · structured contract data → HTML→PDF (FR/AR/EN) ·
session auth + server-side RBAC · declarative alert rules engine · ports-and-adapters for
GPS/payments/messaging with honest integration status labels.

## Contributing

Read [`AGENTS.md`](AGENTS.md) first. No application code exists yet — Phase 1 begins after
architecture review. Security: never commit credentials; report concerns via repo issues.
