# ADR-0001 — Modular monolith on TypeScript (NestJS + Node)

- Status: Proposed
- Date: 2026-08-24

## Context

locaOS's value is cross-domain reasoning (fleet ↔ reservations ↔ contracts ↔ money ↔
compliance), strict tenant isolation, and shared rules between an operator console, a field
PWA, and an API. Team size is small; premature microservices are explicitly forbidden by the
development principles (§21). We need one language across web, API, and offline client so the
vehicle state machine, money math, and validation schemas exist exactly once.

## Decision

Build a **modular monolith**: one NestJS application (`apps/api`) with enforced module
boundaries (per-module public services; lint rule bans cross-module internal imports), plus a
`worker` process sharing the same codebase (pg-boss Postgres-backed queue — no Redis until a
measured need). All application code is TypeScript (Node 22 LTS, strict). Domain logic lives
in `packages/domain` as pure TypeScript, framework-free.

## Consequences

- One deployable unit; simplest possible dev loop (Docker Compose), one CI pipeline.
- Shared types end-to-end; domain rules unit-tested without infrastructure.
- Module boundaries are the extraction seams — a module may later become a service without
  touching consumers.
- Obligations: boundary lint must stay enforced; queue latency monitored before adding Redis;
  a single-runtime scaling ceiling accepted (see proposed-architecture §10 revisit triggers).

## Alternatives considered

- **Django/Laravel/Rails** — mature RAD, but two languages split the shared state machine and
  validation between backend and web/PWA clients; rejected.
- **Microservices from day one** — violates §21; no team or scaling driver; rejected.
- **Fastify bare (no NestJS)** — less structure for guards/DI/module boundaries we rely on for
  tenancy and RBAC enforcement; revisit if Nest overhead proves material.
