# NAVI Vertical Slice — Status

## Goal

Prove the first experience hypothesis without replacing CRM mode: the same authoritative rental operation should be presented as a contextual command surface that tells the operator what matters and why.

## Current slice

The `/navi` page now consumes the existing real-data operational endpoints:

- `/api/ops/brief?scope=morning`
- `/api/ops/focus`

It presents:

- live operational greeting
- departures / returns / utilization / tomorrow indicators
- attention signals from critical alerts
- blocked pickups and their blockers
- return inspections that still need work
- vehicles requiring attention
- cash/deposit context
- upcoming operations with links into existing workflows
- an explicit future-facing NAVI interaction surface without pretending that generic natural-language AI execution already exists

## Intent

This is deliberately a **real-data vertical slice**, not a mock AI dashboard.

The first experiment asks whether the interface itself can make existing domain truth feel contextual and actionable.

## Next increments

1. Add a real event/timeline retrieval surface backed by existing event/audit infrastructure.
2. Add evidence-backed entity context (customer, vehicle, reservation, contract).
3. Add a bounded natural-language retrieval endpoint with citations/evidence IDs.
4. Add one low-risk confirmed action from NAVI into an existing domain command.
5. Only then evaluate a larger persistent-memory/retrieval subsystem.

## Safety

NAVI does not become an authority over financial or contract state. Existing domain services remain authoritative.
