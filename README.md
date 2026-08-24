# locaOS

**The operating system for Moroccan car-rental agencies** — not a fleet CRUD app, but a
system that understands the complete operational state of an agency: vehicles, reservations,
customers, contracts, payments, deposits, inspections, telematics, maintenance, fines,
insurance, employees, operations, profitability — and reasons about how they relate.

> *"Here is what is happening in my agency, what is about to go wrong, why, and what I
> should do."*

## Status

| Milestone | Scope | State |
|---|---|---|
| **0 — Architecture** | analysis, architecture, domain & database models, stack, roadmap, ADRs | Complete |
| **0R — Research reconciliation** | full comparison of research ⇄ architecture; MVP re-cut; ADR-0010 | **Awaiting owner approval (MVP scope)** |
| **MVP** (Phases 1–6+slices) | foundations → fleet/customers → reservations → contracts (FR/AR, Blank Slate) → inspections (offline PWA) → payments/cash reconciliation → brief | Not started |
| **V1 — Money & channels** | CMI + Fatourati, PLBS deposits, WhatsApp, e-signature pilot, DGI-ready invoicing | Not started |
| **V2 — Fleet intelligence** | telematics/geofences, NARSA fine matcher, risk score, vehicle P&L | Not started |
| **V3 — Prediction & copilot** | AI copilot (grounded, typed), predictive maintenance, pricing advisor, CV triage | Not started |

The product research document is present at
[`docs/research/moroccan-rental-platform-research.md`](docs/research/moroccan-rental-platform-research.md)
and has been reconciled claim-by-claim — see
[`docs/architecture/research-reconciliation.md`](docs/architecture/research-reconciliation.md).

## Documentation map

- [Research reconciliation](docs/architecture/research-reconciliation.md) — research ⇄ architecture: what changed, MVP, open decisions
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
