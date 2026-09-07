# AI Handoff — Open-Source Foundations

**Date:** 2026-09-07  
**Branch:** `codex/open-source-foundations-2026-09-07`  
**Status:** foundation recorded; no heavyweight external runtime dependencies installed.

## Why this checkpoint exists

Chat sessions may become unavailable or compressed. This file is the durable continuation point for the open-source dependency research and the architectural decisions made from it.

Do not repeat the entire research pass before continuing. Read this checkpoint plus `docs/OPEN_SOURCE_DEPENDENCY_MAP_2026-09-07.md` first.

## What was researched

A quick current pass covered GitHub projects and ecosystem references for capabilities relevant to a Morocco-first rental operating system:

- document OCR
- GPS/telematics
- browser maps
- routing
- background jobs
- PDF generation
- Morocco payment gateway integration
- accounting integrations
- authorization
- durable workflows
- vehicle damage AI
- rental application references
- production messaging

## Decisions

### Adopt / strong candidates

1. **PaddleOCR** — first OCR provider; already implemented behind the OCR provider boundary.
2. **Traccar** — future telematics provider target; do not build GPS protocol parsing ourselves.
3. **MapLibre GL JS** — future map renderer.
4. **OSRM** — future routing provider target.
5. **`@react-pdf/renderer`** — future PDF generation.
6. **BullMQ** — likely future queue once asynchronous workload requires durable retries/dead letters.

### Adapter/reference only

- CMI / `cmi-node`: Morocco payment adapter candidate; audit before production.
- ERPNext / Dolibarr: accounting integration targets, not rental core.
- CASL: authorization reference/evaluation, not a replacement now.
- Temporal: future workflow evaluation, currently overkill.
- BookCars: rental edge-case/UX reference only.
- YOLO vehicle-damage repositories: research only.

### Do not depend on

- Reverse-engineered WhatsApp Web clients as the production messaging transport.
- Generic rental CRUD repositories as the authoritative locaOS core.
- ERP software as the rental state/settlement engine.
- AI outputs as authoritative customer, vehicle, contract, damage or financial truth.

## Code foundation created

On this branch:

- `apps/api/src/modules/integrations/provider.contract.ts`
  - explicitly reserves `MAPS` and `ROUTING` provider kinds.
- `apps/api/src/modules/integrations/provider.capabilities.ts`
  - stable vendor-neutral capability keys for OCR, payments, messaging, signatures, telematics, maps, routing and accounting.
- `docs/OPEN_SOURCE_DEPENDENCY_MAP_2026-09-07.md`
  - dependency matrix, adoption gates, topology and explicit non-decisions.
- `docs/INTEGRATION_PROVIDER_ARCHITECTURE.md`
  - updated to point at the dependency map and the new provider kinds/capabilities.

## Important architectural boundary

```text
External module/provider
        |
        v
provider adapter
        |
        v
locaOS capability result / evidence
        |
        v
validation + domain policy
        |
        v
authoritative rental mutation (only when allowed)
```

Never install a library directly into a controller and let its output mutate canonical rental state without a domain boundary.

## Why we did not install everything now

The validation phase must stay cheap and understandable. The repository already has a provider architecture and Document Intelligence work in progress. Installing Traccar, OSRM, BullMQ, MapLibre, PDF tooling and accounting software before a real workflow requires them would create dependency and operational debt without increasing validation confidence.

The next implementation should be driven by a real workflow, not by the existence of an interesting GitHub repository.

## Next likely dependency work

1. Finish and verify Document Intelligence against real Moroccan licence samples.
2. Add duplicate/idempotency protection to document confirmation before production.
3. When an actual async workload appears, evaluate BullMQ against existing scheduler/background infrastructure.
4. When GPS hardware becomes part of a pilot, build a thin `TELEMATICS` adapter around Traccar rather than implementing device protocols in locaOS.
5. When fleet mapping becomes operationally necessary, introduce MapLibre at the web boundary and keep geospatial business rules in locaOS.
6. When route calculations are needed, introduce a routing provider port and evaluate OSRM first.
7. Record exact versions/licenses/adapters at the moment each dependency is actually adopted.

## Verification status

This checkpoint records architecture and source research. It does **not** claim that the new provider files or the dependency candidates have passed local typecheck/lint/build. Run normal repository verification after pulling the branch.
