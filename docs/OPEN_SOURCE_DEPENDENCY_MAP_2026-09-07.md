# locaOS Open-Source Dependency Map — 2026-09-07

## Purpose

This is the durable record of the open-source / external building blocks evaluated for locaOS after a GitHub + web/forum reconnaissance pass.

The goal is **not** to collect repositories or replace the locaOS domain core. The goal is to avoid rebuilding commodity infrastructure while preserving the architectural rule that the authoritative rental domain owns state and decisions.

## Non-negotiable dependency rule

> External software supplies capability. It does not become authoritative rental truth.

Providers, OCR engines, GPS platforms, routing engines, payment gateways, messaging systems and accounting systems must sit behind explicit adapters/ports where their output can affect canonical state.

External results are treated as:

```text
provider output
    -> evidence / capability result
    -> validation / domain policy
    -> authoritative locaOS mutation (when allowed)
```

Never:

```text
provider output -> direct database mutation
```

## Decision matrix

| Area | Candidate | Decision | Timing | Why |
|---|---|---|---|---|
| Document OCR | PaddleOCR | **ADOPT as first provider** | Now | Strong multilingual OCR foundation; already isolated behind `OCR_PROVIDER`; suitable for French/Arabic document testing. |
| Telematics | Traccar | **ADOPT as future provider target** | Later | Mature open-source GPS tracking platform with broad device/protocol support, REST API, geofencing and trip/event data. |
| Browser maps | MapLibre GL JS | **ADOPT as future map renderer** | Later | Open-source vector map rendering without tying the UI to a proprietary map SDK. |
| Routing | OSRM | **ADOPT as future routing provider target** | Later | Provides route, table/matrix, nearest, map matching and trip services over OpenStreetMap data. |
| Background jobs | BullMQ | **EVALUATE / likely adopt** | When async load justifies it | Good fit for OCR, notifications, report generation and provider retries; do not introduce a second queue prematurely. |
| PDF generation | `@react-pdf/renderer` | **ADOPT when PDF work starts** | Later | Reusable React-based document generation for contracts, receipts and reports. |
| Morocco payments | CMI ecosystem / `cmi-node` | **ADAPTER CANDIDATE; audit first** | Later | Morocco-specific payment integration is valuable, but third-party package quality/support must be verified before production. |
| Accounting | ERPNext / Dolibarr | **INTEGRATION TARGETS, not core** | Later | Useful accounting endpoints/export targets; too broad to become the rental domain engine. |
| Authorization | CASL | **REFERENCE / evaluate only** | As complexity grows | Useful fine-grained authorization model, but current permissions must not be replaced without a concrete need. |
| Durable workflows | Temporal | **FUTURE EVALUATION** | Much later | Powerful for long-running distributed workflows; currently excessive for the validation phase. |
| Vehicle damage AI | YOLO damage repositories | **RESEARCH ONLY** | Later | Useful experimentation source; not trusted as financial/damage authority without validation and human review. |
| Rental application repos | BookCars | **REFERENCE ONLY** | Ongoing | Good rental edge-case/UX reference; do not inherit its application architecture as the locaOS core. |
| WhatsApp reverse-engineered clients | Baileys-based servers | **DO NOT DEPEND ON FOR PRODUCTION** | Never as primary path | Reverse-engineered protocol risk; production messaging should use official/provider APIs behind the messaging adapter. |

## Current architectural foundation

The provider layer already exists in:

- `apps/api/src/modules/integrations/provider.contract.ts`
- `apps/api/src/modules/integrations/provider.registry.ts`
- `apps/api/src/modules/integrations/providers.ts`
- `apps/api/src/modules/integrations/provider.capabilities.ts`

`IntegrationKind` now reserves explicit kinds for:

- `PAYMENTS`
- `OCR`
- `SIGNATURE`
- `MESSAGING`
- `TELEMATICS`
- `MAPS`
- `ROUTING`
- `ACCOUNTING`

The registry remains intentionally small. It is not a credential store, queue, workflow engine or source of truth.

## Recommended dependency topology

```text
                         locaOS
                            |
              +-------------+-------------+
              |                           |
       AUTHORITATIVE CORE                NAVI
              |                           |
       rental operations            orchestration/context
              |
      +-------+---------+----------------+
      |       |         |                |
   Documents Finance  Fleet          Operations
      |       |         |                |
 PaddleOCR  CMI*    Traccar*        domain services
              |
       external providers

Future capability layer:

  Maps       -> MapLibre GL JS
  Routing    -> OSRM
  Jobs       -> BullMQ (when needed)
  PDFs       -> react-pdf
  Accounting -> ERPNext/Dolibarr adapters

* external/provider boundary; never authoritative by itself.
```

## What we should NOT build ourselves

Do not spend core engineering effort recreating:

- OCR engines
- GPS device protocol parsing
- map rendering engines
- routing algorithms
- generic PDF rendering
- generic background job queues
- payment gateway protocol handling
- WhatsApp transport
- generic accounting ledgers

Our engineering value belongs in the integration boundary and in the Moroccan rental domain semantics around those capabilities.

## What remains proprietary to locaOS

These should remain inside the authoritative domain and must not be delegated to an external module:

- vehicle/rental lifecycle truth
- reservation/contract state
- return inspection authority
- damage/settlement decisions
- deposit rules and financial invariants
- tenant isolation and authorization
- canonical customer identity records
- canonical vehicle records
- operational task state
- audit history
- human confirmation of high-impact AI/document fields

## Dependency adoption gates

Before a dependency moves from research to production:

1. Verify license and commercial-use compatibility.
2. Verify project activity/maintenance and release health.
3. Verify security posture and known vulnerabilities.
4. Verify data residency/privacy implications for any hosted provider.
5. Verify tenant isolation and secret handling.
6. Put the dependency behind the appropriate locaOS provider/port.
7. Define failure/degraded behavior before enabling it in production.
8. Define idempotency for callbacks/webhooks before allowing mutations.
9. Add integration tests that prove provider failure cannot corrupt canonical state.
10. Record the exact version, adapter and operational assumptions in repo docs.

## Source notes

The following public projects were checked as part of this pass:

- PaddleOCR: https://github.com/PaddlePaddle/PaddleOCR
- Traccar: https://github.com/traccar/traccar
- MapLibre GL JS: https://github.com/maplibre/maplibre-gl-js
- OSRM: https://github.com/Project-OSRM/osrm-backend
- BullMQ: https://github.com/taskforcesh/bullmq
- react-pdf: https://github.com/diegomura/react-pdf
- BookCars: https://github.com/aelassas/bookcars
- CMI Node candidate: https://github.com/aitmiloud/cmi-node
- Temporal TypeScript SDK: https://github.com/temporalio/sdk-typescript

The current 2026-09-07 web check confirmed, among other points, that Traccar exposes a REST API and supports a broad set of GPS protocols/devices, OSRM exposes route/table/match/nearest/trip services, MapLibre is maintained as an open-source mapping ecosystem, and react-pdf provides React-based PDF rendering for browser/server use.

## Explicit non-decisions

This document does **not** authorize installing every listed dependency.

Current implementation priority remains:

1. authoritative rental/settlement foundation
2. Document Intelligence + real Moroccan document validation
3. NAVI operational layer
4. only then add infrastructure when a real workflow requires it

That keeps the validation phase cheap and prevents dependency sprawl.
