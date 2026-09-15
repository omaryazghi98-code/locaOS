# NAVI Intelligence v0.1 — Checkpoint

## Status

The first NAVI reasoning spine is implemented on `codex/navi-intelligence-v0.1`.

### Included

- Tenant-scoped NAVI query endpoint.
- Reservation reference resolution.
- Read-only reservation/customer/vehicle/contract/inspection context retrieval.
- Normalized evidence and related-entity context.
- Deterministic reasoning provider used before model credits are introduced.
- Explicit fact / inference / impact / recommendation separation.
- Proposed actions are non-executing.
- Nest application registration for the NAVI controller/service.

## Pieces principle

NAVI treats context as persistent operational infrastructure. Relevant relationships and history should follow the operator across reservations, customers, vehicles, contracts, inspections, payments, documents, operations, events, and evidence rather than requiring manual reconstruction.

Pieces is an inspiration for this product/context philosophy, not a runtime dependency or source of truth.

## Next checkpoint

1. Verify the branch locally with the existing HP build.
2. Exercise `POST /api/intelligence/navi/query` against seeded `RES-2403`.
3. Add broader domain-safe read tools.
4. Introduce a provider-neutral model adapter.
5. Benchmark Azure GPT-5-mini against the deterministic baseline before spending credits on fine-tuning.
6. Add worker/action execution only after read/reasoning reliability is established.
