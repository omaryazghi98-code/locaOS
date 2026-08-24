# ADR-0002 — PostgreSQL as the single datastore; Prisma for schema & migrations

- Status: Proposed
- Date: 2026-08-24

## Context

The hardest requirements are integrity requirements: no double bookings, tenant isolation,
append-only financial/audit history, transactional outbox for domain events, materialized
daily snapshots, range queries over calendars (§5, §7, §10, §11, §16). A second datastore
would be speculative at this stage (§21).

## Decision

PostgreSQL 16+ is the only source of truth for domain data (including sessions, jobs via
pg-boss, outbox, snapshots). Prisma provides the typed client and migration workflow; advanced
constraints (exclusion constraints, RLS policies, append-only triggers, BRIN/partitioning)
ship as **handwritten SQL in the migrations**, reviewed like code. No ORM-level bypass of the
tenant transaction wrapper is permitted.

## Consequences

- Exclusion constraints (`btree_gist`) make overlapping active reservations and maintenance
  windows physically impossible — application checks become UX, not integrity.
- One backup/PITR story; snapshots and facts tables are caches, rebuildable from events.
- Prisma choice binds us to its migration format; acceptable — migrations are forward-only
  and CI-tested on a clean database (§22).
- Obligations: every append-only table gets a rejection trigger; constraint-focused
  integration tests are mandatory in CI (database-model §12).

## Alternatives considered

- **Drizzle ORM** — lighter, SQL-first; viable fallback, but Prisma's migration tooling and
  typed client accelerate the early phases; revisit if RLS/raw-SQL friction grows.
- **MySQL** — weaker exclusion constraints/RLS story; rejected.
- **Extra stores (Redis, Elasticsearch)** — no current requirement; deferred with revisit
  triggers in proposed-architecture §10.
