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
| **0R — Research reconciliation** | full comparison of research ⇄ architecture; MVP re-cut | Approved |
| **MVP / Phase 1** (shipped `f3b4ba8`) | foundations → fleet/customers → reservations → contracts (FR/AR, Blank Slate) → inspections (offline PWA) → payments/cash reconciliation → briefs | **Complete** |
| **V1 — Operational intelligence** | maintenance subsystem, telematics signals, transfers, command center, reports/profitability, customer 360, documents, compliance registry, signature/messaging ports | **In review** |
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

## Demo credentials — DEVELOPMENT ONLY

| Account | Role |
|---|---|
| `owner@atlasrent.ma` | owner |
| `manager@atlasrent.ma` / `agent@atlasrent.ma` / `field@atlasrent.ma` / `compta@atlasrent.ma` | staff roles |

Password: value of `SEED_PASSWORD` (default **`locaos-demo-2026`**) — **these are demo accounts seeded
for development/demo only. They are never production secrets; the seeder refuses to run with
`NODE_ENV=production` unless `SEED_ALLOW_PRODUCTION=true` AND an explicit `SEED_PASSWORD` are set.**
No real secrets are committed; the API reads everything from environment variables (`.env.example`).

## Contributing

Read [`AGENTS.md`](AGENTS.md) first. No application code exists yet — Phase 1 begins after
architecture review. Security: never commit credentials; report concerns via repo issues.
