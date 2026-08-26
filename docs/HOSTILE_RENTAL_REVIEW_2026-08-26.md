# locaOS — Hostile Rental Workflow Review

**Date:** 2026-08-26
**Mode:** read-only adversarial review; no code changes were made from this review.
**Evidence:** review output from the external model plus the current canonical handoff/source-of-truth documents. Findings must be verified against the current branch before implementation.

## Highest-priority findings

### P0 — Close can bypass return/settlement prerequisites

`apps/api/src/modules/contracts/contracts.controller.ts` → `close(...)`

Reported risk: an ACTIVE/AMENDED contract can transition to CLOSED without requiring a return inspection, deposit resolution, or settlement/outstanding-balance clearance.

Required verification/test:
- close without return inspection must fail
- close with unresolved deposit must fail or require an explicit authorized settlement path
- close with outstanding balance must fail or surface an explicit authorized decision

### P0 — Vehicle can become AVAILABLE before financial/rental closure

`packages/domain/src/vehicleStateMachine.ts` and `apps/api/src/modules/inspections/inspections.controller.ts` → `completeReturn(...)`

Reported risk: return inspection can put the vehicle into `INSPECTED`, after which a generic transition may allow `INSPECTED → AVAILABLE` while the contract remains open or a deposit remains held.

Required verification/test:
- vehicle availability must be coupled to the correct contract/settlement lifecycle
- unresolved deposit/open contract must block inappropriate availability

### P0 — Deposit amount may not be enforced against required deposit

`apps/api/src/modules/finance/finance.controller.ts` → `createDeposit(...)`
`apps/api/src/modules/contracts/contracts.controller.ts` → `activate(...)`

Reported risk: activation verifies presence of a secured deposit but not necessarily that its amount meets the quote-required deposit.

Required verification/test:
- deposit below required amount → activation rejected
- exact/greater required amount → accepted

### P0 — Double-activation concurrency risk

`apps/api/src/modules/contracts/contracts.controller.ts` → `activate(...)`

Reported risk: vehicle row locking exists, but the contract row is not necessarily locked across the full activation decision, so concurrent activation requests may race before state changes commit.

Required verification/test:
- concurrent activate requests → exactly one successful activation and one clean conflict/failure
- exactly one ACTIVE contract state and one correct vehicle transition/audit trail

### P0 — Vehicle replacement amendment may desynchronize fleet state

`apps/api/src/modules/contracts/contracts.controller.ts` → `amend(...)` with `VEHICLE_REPLACEMENT`

Reported risk: replacing `contract.vehicleId` may not transition the old vehicle out of RENTED nor the new vehicle into RENTED, leaving contract and fleet state inconsistent.

Required verification/test:
- old vehicle leaves rental state correctly
- new vehicle enters rental state correctly
- both transitions are audited
- contract amendment and fleet state remain consistent

## P1 findings

### Period amendment conflict checking

Extending a contract period may need a fresh vehicle/reservation/maintenance conflict check instead of relying only on reservation-time constraints.

### Optimistic concurrency / stale-record protection

Mutations may need a version/updatedAt guard so a stale UI cannot silently overwrite a newer operational state.

### READY blockers are not live/actionable enough

The UI can present a stale blocker snapshot and a generic READY error rather than a direct remediation path.

### Permission visibility mismatch

UI actions should be role/permission aware. Do not present an apparently executable action that the current role cannot perform.

### Settlement needs a first-class operator path

Outstanding balance, deposit release/charge, and final settlement should be visible and actionable before close.

### Deposit charge UI is missing/incomplete

The API capability may exist, but the return/damage flow must expose a normal agent workflow from damage evidence → charge → settlement/audit.

## P2 findings

- Phone validation may be weak.
- Reservation reference generation should be checked for collision guarantees.
- Inspection baseline fields are currently permissive and may need stronger departure/return evidence requirements.
- Reservation currency is currently effectively MAD-only for the MVP.
- Handover flow is split across reservation/contract/inspection surfaces instead of one guided operator workflow.

## Tomorrow-first order

1. Verify and harden return → settlement → vehicle availability coupling.
2. Add activation concurrency protection and regression coverage.
3. Verify/fix vehicle replacement amendment fleet transitions.
4. Complete actionable blocker + inspection UX.
5. Then resume contract/document, pricing, alerts/case timeline, and reporting work.

## Important review status

The external review output was truncated after the beginning of its final implementation-order section. The findings above are the concrete findings visible in the received output; do not infer any additional missing findings.
