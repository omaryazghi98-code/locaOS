# NAVI Intelligence v0.1

## Purpose

NAVI Intelligence is the reasoning layer above locaOS operational truth. It must explain operational situations using authoritative, tenant-scoped context and explicit evidence.

## Architectural boundary

```text
NAVI
 ├── Context Engine
 ├── Reasoning Engine
 └── Execution Engine (future)
        │
        ▼
 locaOS domain APIs
        │
        ▼
 PostgreSQL + domain events + audit
```

The model never becomes operational truth. It does not receive arbitrary SQL access and does not directly mutate contracts, payments, inspections, reservations, or other domain state.

## Pieces-inspired context principle

NAVI should behave like a purpose-built operational context layer: relevant history and relationships should follow the operator across the product instead of requiring the operator to reconstruct the story manually.

For a reservation, the useful context can eventually span:

- reservation
- customer
- vehicle
- contract
- deposit and payments
- departure/return inspections
- operations tasks
- alerts
- documents and evidence
- prior rental/customer/vehicle history
- domain events and audit history

This is a design principle inspired by Pieces' persistent-context philosophy. It is not a requirement to install Pieces as a runtime dependency.

## v0.1 scope

1. Resolve an operational entity/reference from a NAVI query.
2. Retrieve read-only, tenant-scoped context through domain-safe tools.
3. Build a normalized context packet.
4. Send the packet to a replaceable reasoning provider.
5. Return an evidence-backed structured answer.
6. Keep actions as proposals only; execution/approval/workers are later stages.

## Reasoning result contract

```text
answer
facts[]
inferences[]
impact
recommendation
evidence[]
relatedEntities[]
proposedActions[]
confidence
```

Facts must be grounded in retrieved operational data. Inferences and recommendations must be distinguishable from facts. Missing context must produce uncertainty rather than invented facts.

## Future agent/worker boundary

```text
NAVI reasoning
      │
      ├── investigation agent(s)
      │        └── read workers
      │
      └── action proposal
               │
          human approval
               │
             worker
               │
        locaOS domain command
               │
          event + audit
```

v0.1 deliberately does not introduce a multi-agent framework, workflow engine, vector database, graph database, or fine-tuning dependency. The interfaces should remain compatible with those future capabilities.

## Acceptance example

Query: `Why does RES-2403 need attention?`

Expected behavior: NAVI retrieves the reservation and relevant operational evidence, explains the blocker, distinguishes facts from inference, and proposes a next step without inventing vehicle, customer, financial, or contract facts.
