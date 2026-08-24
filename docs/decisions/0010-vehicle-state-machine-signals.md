# ADR-0010 — Vehicle status: one state machine + derived condition layer (signals)

- Status: Proposed (outcome of the research reconciliation, §1)
- Date: 2026-08-24
- Supersedes: none — formalizes the Phase 0 stance after the research supplied named
  exception flows (GHOST STATE, MAINTENANCE CONFLICT, phantom booking).

## Context

The mandated 14-state vocabulary mixes pipeline states, exception states, and derived
conditions. The research adds named *contradictions* (GPS movement while AVAILABLE; rented
but stationary; contract expired but moving; reserved while maintenance triggers) which are
observations about disagreement between telemetry/data and asserted status — not statuses.
Options: (A) single 14-state machine only; (B) two orthogonal axes (physical × pipeline);
(C) one machine + derived condition layer.

## Decision

**Option C.**

1. `vehicles.operational_status` remains the single authoritative state machine with exactly
   the 14 states. Exceptional states are interrupting: the transition record stores the
   interrupted pipeline position and resolution must name an explicit exit target.
2. **OVERDUE** is a *system-owned materialized derived state* — entered/cleared only by the
   scheduled evaluator.
3. A **signal layer** (`vehicle_signals`) evaluates continuous predicates
   (GHOST_STATE, PHANTOM_BOOKING, UNAUTHORIZED_USE, MAINTENANCE_CONFLICT, PREAUTH_EXPIRING,
   FLEET_BELOW_MINIMUM, UTILIZATION_STRESS…). Signals raise alerts and may **request**
   transitions via Approval records; they can never mutate status directly.
4. `fleetStatus` (IN_FLEET/FOR_SALE/SOLD/RETIRED) remains the separate lifecycle axis.

Rationale: staff assert and speak one status; contradictions are evidence about the world,
and telemetry is testimony, not verdict — noisy or malicious GPS input must not be able to
rewrite operational truth (product brief §14). Option B is not chosen for information-loss
reasons alone but because it doubles every alert condition, permission, and UI surface while
the concurrent-exception cases it solves are rare and already representable via interrupted-
status records.

## Consequences

- Deterministic, auditable truth: only guarded services mutate status; every change has a
  transition row + audit event.
- Signals are a read model — recomputable; a telemetry replay cannot corrupt history.
- Test obligations: signal-isolation test (telemetry storm changes zero statuses without
  approvals); evaluator determinism; OVERDUE entry/exit by evaluator only.
- Revisit trigger: ≥3 genuinely concurrent exception dimensions observed in production →
  split to Option B (two axes). Decision recorded, not laziness.

## Alternatives considered

- **Option A (single machine, no signal layer)** — contradictions would have to be encoded as
  states or scattered ifs; loses the §12 rules-engine discipline.
- **Option B (two axes)** — no information loss but doubles state surfaces today for rare
  cases; reassigned to the revisit trigger.
- **Telemetry-triggered automatic transitions** — violates §14 (detect-and-act) and corrupts
  truth under GPS noise; rejected.
