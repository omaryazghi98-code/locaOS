# NAVI — Astra Prototype Import

## Purpose

This document records the NAVI prototype work imported from the GitLab Astra sandbox into the GitHub NaviOS development branch.

This is an **imported prototype snapshot**, not a claim that the work is production-ready or merged into the canonical branch.

## Source

- GitLab project: `omaryazghi98-code/NaviOS`
- Source branch: `astra/navi-prototype`
- GitLab project ID: `86780270`
- Target GitHub repository: `omaryazghi98-code/locaOS`
- Target branch: `codex/astra-navi-prototype-import`
- Target base: `genspark_ai_developer`

## Imported files

### `apps/api/src/modules/intelligence/navi.types.ts`

Defines the initial NAVI context/evidence and reasoning contracts:

- `NaviEntityType`
- `NaviEvidence`
- `NaviContext`
- `NaviReasoningResult`

The contract separates facts, evidence, related entities, recommendations, proposed actions, and confidence.

### `apps/api/src/modules/intelligence/navi.context.ts`

Provides deterministic reservation-context resolution and retrieval.

Current behavior:

1. Recognizes reservation references matching `RES-...`.
2. Recognizes UUID reservation identifiers.
3. Resolves data inside `withTenant(agencyId, ...)`.
4. Loads the reservation.
5. Loads the linked customer.
6. Loads an assigned vehicle when present.
7. Loads a qualifying contract.
8. Loads up to ten inspections for the selected contract.
9. Produces evidence and related-entity records.
10. Reports missing context instead of silently inventing facts.

### `apps/api/src/modules/intelligence/navi.reasoner.ts`

Implements a provider-free deterministic NAVI reasoner.

Important boundary:

> The reasoner does not call an LLM and does not mutate domain state.

It currently:

- explains reservation status;
- detects an unassigned vehicle;
- produces a recommendation;
- proposes an `ASSIGN_VEHICLE` action as inert metadata;
- exposes supporting evidence;
- lowers confidence when context is incomplete.

### `apps/api/src/modules/intelligence/navi.service.ts`

Connects context construction to deterministic reasoning.

Flow:

`query -> buildNaviContext -> reasonOverContext -> response`

### `apps/api/src/modules/intelligence/navi.controller.ts`

Exposes:

`POST /api/intelligence/navi/query`

The endpoint:

- uses authentication;
- uses the existing permissions guard;
- requires `ops:read`;
- validates the query with Zod;
- obtains the tenant from the authenticated request context;
- does not accept a client-supplied tenant identifier.

## Important limitations discovered during import

This snapshot should **not** be treated as the final NAVI implementation.

Known follow-up work:

1. Connect the backend intelligence endpoint to the existing `/navi` command-center UI.
2. Preserve the existing command-center investment instead of creating a second NAVI shell.
3. Reuse `computeBlockers()` as the readiness authority.
4. Make blocker evaluation deterministic, including deterministic contract selection.
5. Add readiness/lifecycle gates required by the current NaviOS architecture.
6. Handle unknown/foreign reservation references as explicit outcomes rather than allowing reasoning to dereference empty context.
7. Add NAVI unit and integration coverage.
8. Ensure unavailable data never becomes an affirmative operational conclusion.
9. Reuse the existing reservation assignment workflow; NAVI must not directly mutate reservation state.
10. Add the provider-neutral AI adapter only after the deterministic context/reasoning contract is proven.
11. Verify FR/EN/AR and RTL behavior.
12. Run API build/typecheck, web typecheck, lint, integration tests, and browser smoke tests.
13. Reconcile the imported files with the current NaviOS branch before merging.

## Missing Astra artifact

The expected `navi.copy.ts` presentation-copy file was not present in the inspected `astra/navi-prototype` repository tree at import time.

It is intentionally **not reconstructed from memory or inferred content**.

## Architectural rule

NAVI remains an intelligence layer, not operational truth.

`Authoritative NaviOS domain state -> NAVI context -> reasoning -> evidence/recommendation -> existing authorized workflow -> fresh recheck`

NAVI must not bypass domain services, tenant isolation, RBAC, financial controls, contract history, or vehicle-state rules.

## Next target

**Explain reservation -> identify authoritative blockers -> operator uses existing reservation workflow -> NAVI rechecks -> evidence reflects the new state.**

Complete and verify that vertical slice before adding autonomous actions, memory systems, external model providers, or additional agent frameworks.
