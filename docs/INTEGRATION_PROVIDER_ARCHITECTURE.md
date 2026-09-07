# locaOS Integration Provider Architecture

## Purpose

locaOS has an existing provider layer for signatures, messaging, and other integrations. This document formalizes the next boundary without replacing the existing adapters in one mass rewrite.

## Rule

The authoritative rental domain owns state and decisions. Providers expose external capabilities. A provider response is evidence/service output; it is never permission to bypass domain authorization, tenant isolation, financial controls, contract state machines, or human-confirmation requirements.

```text
Authoritative locaOS Core
          |
          | typed domain event / explicit command
          v
Integration Provider Boundary
          |
   +------+------+------+------+------+
   |      |      |      |      |      |
 Payments OCR  Sign  Message  Telematics Accounting
   |      |      |      |      |      |
 adapter adapter adapter adapter adapter adapter
   |      |      |      |      |      |
 external providers / workers / APIs
```

## Generic contract

`apps/api/src/modules/integrations/provider.contract.ts` defines:
- provider identity and kind
- honest runtime status (`CONNECTED`, `MOCK`, `UNAVAILABLE`, `DEGRADED`)
- declared capabilities
- tenant-scoped execution context
- explicit action/payload execution

`provider.registry.ts` provides an in-process registry for capability discovery. It is deliberately small; persistence, credentials, queueing, retries, health history, and provider configuration remain separate concerns.

## Existing adapters

The current `providers.ts` already contains concrete signature and messaging adapters and an honest MOCK/LIVE/UNAVAILABLE model. Do not rewrite those adapters merely to satisfy the generic contract. Migrate them incrementally when there is a concrete benefit.

## Document Intelligence

Document Intelligence is the first strong consumer of the provider-boundary principle:
- `PaddleOcrProvider` is an adapter around an external/local OCR worker.
- OCR output is persisted as extraction evidence.
- Driver-license extraction creates candidates and confidence signals.
- Human confirmation is required before canonical identity creation.

## Queueing and asynchronous work

Do not introduce a second queue just because a provider boundary exists. The existing scheduler/background evaluator and application infrastructure should be reused where they fit. A durable provider queue becomes a separate implementation task when an integration actually needs retry/dead-letter semantics.

## Future provider candidates

- OCR: PaddleOCR first, future specialized/cloud providers
- Payments: provider-specific adapters
- Telematics: vendor adapters
- Messaging: WhatsApp/SMS/email adapters
- Signatures: qualified/local TSP adapters
- Accounting: export/sync adapters

## Security invariants

1. Every provider operation is tenant-scoped.
2. Secrets stay server-side and use existing secret/crypto boundaries.
3. Provider status is honest; MOCK is visibly simulated.
4. Provider failures cannot silently alter canonical rental state.
5. External callbacks/webhooks require verification and idempotency before mutation.
6. Financial and contract mutations continue through authoritative domain services.
7. Provider requests/results that affect business decisions are auditable.
