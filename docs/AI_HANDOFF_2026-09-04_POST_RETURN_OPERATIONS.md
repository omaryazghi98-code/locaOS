# AI Handoff — 2026-09-04 — Post-Return Operations Tasks

## Scope implemented on branch

Branch: `codex/post-return-ops`

The first-class internal operations task/work-order foundation is now implemented as a narrow vertical slice, with the first operator UI and dedicated operations permission added.

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
11. A dedicated `ops:write` permission was added. Owner, manager, agent, field agent, and mechanic receive it through migration `0012_operations_rls_permissions.sql`; accountant remains read-only.
12. `operations_tasks` now has a dedicated Drizzle schema definition in `apps/api/src/db/operations.schema.ts` while the hand-reviewed SQL migration remains authoritative for constraints/RLS.
13. The console now has an `/ops` task board showing open preparation reviews and work tasks.
14. The fleet detail page no longer exposes the generic direct-action controls while a vehicle is `INSPECTED`; it routes the operator to the operations workflow instead.
15. The operations table itself is explicitly RLS-enabled/forced in migration `0012`, rather than relying only on application-level agency filtering.

## Current lifecycle

`RETURN INSPECTION → INSPECTED → PREPARATION REVIEW TASK → CLEANING / MAINTENANCE TASK(S) → AVAILABLE`

For a clean return:

`RETURN INSPECTION → INSPECTED → PREPARATION REVIEW → NO WORK → AVAILABLE`

For cleaning:

`RETURN INSPECTION → INSPECTED → PREPARATION REVIEW → CLEANING → AVAILABLE`

For maintenance, the task is created and the vehicle enters `MAINTENANCE`; completion currently does not automatically release the vehicle because the existing state machine requires an explicit reasoned `MAINTENANCE → AVAILABLE` transition. This is intentional until maintenance/QA completion semantics are made first-class.

## Important boundary

`operations_tasks` is not the financial payable ledger. Partner/vendor work can later acquire quote, approval, invoice, reconciliation and evidence flows without changing the rental settlement authority.

## Known limitations / next engineering steps

1. The new Drizzle schema is isolated in `operations.schema.ts`; the main `schema.ts` RLS table registry still needs consolidation so the generated schema and migration metadata have one obvious source of truth.
2. Add explicit QA task semantics and a `QA_PASSED`/`QA_FAILED` decision model without inventing new vehicle states.
3. Wire maintenance completion + QA into the final availability gate. In particular, the current combined cleaning+maintenance triage path needs a deliberate ordering/state strategy; do not assume both tasks can safely run through the existing state machine concurrently.
4. Add task activity/history and manager/QA audit views.
5. Replace the legacy/simple cleaning-task path with the new operations task model where applicable.
6. Improve task-board assignment, vendor selection, scheduling, evidence capture, and task detail.
7. Add external partner assignment/portal after the internal task lifecycle is stable.

## Safety

No database reset or destructive migration was used. Existing controllers were not mass-rewritten. The implementation is isolated on `codex/post-return-ops` for review before merge.

## Verification status

Implementation was inspected through repository source, but no local test suite/CI run has been claimed from this environment. Before merge, run the migration and targeted tests locally, then exercise the real return flow: RETURN inspection → generated preparation task → triage → work completion → vehicle release, including the blocked direct `INSPECTED → AVAILABLE` path.
