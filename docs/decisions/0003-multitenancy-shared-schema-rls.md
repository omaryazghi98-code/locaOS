# ADR-0003 — Multi-tenancy: shared schema + `agency_id` + PostgreSQL RLS

- Status: Proposed
- Date: 2026-08-24

## Context

locaOS is SaaS: agencies must never see each other's customers, vehicles, contracts, money,
GPS data, or reports (§5). Frontend filtering is explicitly insufficient. We need isolation
that survives developer error in any single layer.

## Decision

1. **Shared database, shared schema.** Every tenant table carries `agency_id uuid not null`
   FK to `agencies`; cross-agency FKs are structurally invalid.
2. **First wall — application layer:** all reads/writes flow through repositories that are
   constructed with an agency context (from the session) and cannot run without it; a tenant
   transaction wrapper issues `SET LOCAL app.agency_id = '<uuid>'`.
3. **Second wall — database layer:** RLS `FOR ALL` policies on every tenant table using that
   session variable.
4. A user may have memberships in multiple agencies; the active agency is part of the session
   and switching it is an audited event. Any future platform-admin cross-agency access is a
   separately permissioned, explicitly audited path — never a bypass of the walls.
5. CI includes a tenancy suite: authenticated as tenant A, read/write/delete tenant B rows →
   zero rows / rejection, asserted at both layers.

## Consequences

- Cheap operations at our scale; one migration path; simple cross-tenant analytics are
  impossible by default (a feature, per §5).
- RLS adds per-query overhead — accepted; indexed `agency_id` everywhere.
- Noisy-neighbor risk is shared-infrastructure risk — acceptable pre-scale; revisit only with
  an enterprise tenant demanding dedicated deployment.

## Alternatives considered

- **Schema-per-tenant / DB-per-tenant** — stronger blast-radius isolation at the cost of
  migration fan-out and connection pools we cannot justify at this stage; revisit trigger:
  a large tenant contractually requiring it.
- **App-layer scoping only** — single point of failure; violates defense-in-depth intent.
