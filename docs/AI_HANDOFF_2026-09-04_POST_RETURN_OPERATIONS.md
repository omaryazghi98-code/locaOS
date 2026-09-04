# AI Handoff — 2026-09-04 — Post-Return Operations Tasks

## Scope implemented on branch

Branch: `codex/post-return-ops`

The first-class internal operations task/work-order foundation is now implemented as a narrow vertical slice.

## Facts

1. `operations_tasks` is a tenant-scoped first-class work-order table.
2. Supported task kinds are `PREPARATION_REVIEW`, `CLEANING`, `MAINTENANCE`, and `QA`.
3. Tasks support assignment to an internal user or vendor, priority, scheduling, estimated/approved/actual cost, evidence, completion notes, and completion actor/time.
4. A RETURN inspection automatically creates a `PREPARATION_REVIEW` task through a database trigger.
5. Direct `INSPECTED → AVAILABLE` was removed from the domain vehicle state machine.
6. A database guard rejects `INSPECTED → AVAILABLE` while post-return operations tasks remain open.
7. The operations API provides task listing/detail, task creation, return triage, and task update/completion.
8. Return triage can create cleaning and/or maintenance child tasks. If no additional work is required, the review task completion is allowed to move the vehicle to AVAILABLE through `OPS_SERVICE`.
9. Completing the final cleaning task can move `CLEANING → AVAILABLE` through the authoritative vehicle transition service.
10. All task mutations in the new API are audited and emit operational events.

## Current lifecycle

`RETURN INSPECTION → INSPECTED → PREPARATION REVIEW TASK → CLEANING / MAINTENANCE TASK(S) → AVAILABLE`

For a clean return:

`RETURN INSPECTION → INSPECTED → PREPARATION REVIEW → NO WORK → AVAILABLE`

For cleaning:

`RETURN INSPECTION → INSPECTED → PREPARATION REVIEW → CLEANING → AVAILABLE`

For maintenance, the task is created and the vehicle enters `MAINTENANCE`; completion currently does not automatically release the vehicle because the existing state machine requires an explicit reasoned `MAINTENANCE → AVAILABLE` transition. This is intentional until maintenance/QA completion semantics are made first-class.

## Important boundary

`operations_tasks` is not the financial payable ledger. Partner/vendor work can later acquire quote, approval, invoice, reconciliation and evidence flows without changing the rental settlement authority.

## Next engineering step

1. Add schema/Drizzle representation for `operations_tasks` instead of raw SQL-only access.
2. Add explicit QA task semantics and a `QA_PASSED`/`QA_FAILED` decision model without inventing new vehicle states.
3. Wire maintenance completion + QA into the final availability gate.
4. Add task activity/history and manager/QA audit views.
5. Replace the legacy/simple cleaning-task path with the new operations task model where applicable.
6. Build the UI task board/work-order detail view.
7. Add external partner assignment/portal after the internal task lifecycle is stable.

## Safety

No database reset or destructive migration was used. Existing controllers were not mass-rewritten. The implementation is isolated on `codex/post-return-ops` for review before merge.
