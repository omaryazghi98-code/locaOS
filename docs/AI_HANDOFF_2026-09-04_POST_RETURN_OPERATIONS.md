# AI Handoff — 2026-09-04 — Post-Return Operations Tasks

## Scope implemented on branch

Branch: `codex/post-return-ops`

The first-class internal operations task/work-order foundation is implemented as a narrow vertical slice, with the first operator UI and dedicated operations permission added.

## Facts

1. `operations_tasks` is a tenant-scoped first-class work-order table.
2. Supported task kinds are `PREPARATION_REVIEW`, `CLEANING`, `MAINTENANCE`, and `QA`.
3. Tasks support assignment to an internal user or vendor, priority, scheduling, estimated/approved/actual cost, evidence, completion notes, and completion actor/time.
4. A RETURN inspection automatically creates a `PREPARATION_REVIEW` task through a database trigger.
5. Direct `INSPECTED → AVAILABLE` is not an agent shortcut; post-return availability is gated through operations.
6. A database guard rejects `INSPECTED → AVAILABLE` while post-return operations tasks remain open.
7. The operations API provides task listing/detail, task creation, return triage, and task update/completion.
8. Return triage can create cleaning and/or maintenance child tasks. If no additional work is required, the review task completion moves the vehicle to AVAILABLE through `OPS_SERVICE`.
9. Completing the final cleaning/maintenance work creates a QA task when no post-return work remains.
10. QA completion is the final operations release point: it verifies there are no open operations tasks and then moves `CLEANING` or `MAINTENANCE` to `AVAILABLE` through the authoritative vehicle transition service.
11. The vehicle state machine explicitly permits `MAINTENANCE → AVAILABLE` for `OPS_SERVICE` as well as the existing reasoned user path.
12. Combined cleaning + maintenance triage is deliberately sequential. Maintenance does not start while a return-cleaning task remains open; once cleaning completes, the vehicle transitions `CLEANING → MAINTENANCE` and maintenance becomes the active operational phase.
13. All task mutations in the new API are audited and emit operational events where implemented by the current operations flow.
14. A dedicated `ops:write` permission was added. Owner, manager, agent, field agent, and mechanic receive it through migration `0012_operations_rls_permissions.sql`; accountant remains read-only.
15. `operations_tasks` has a dedicated Drizzle schema definition in `apps/api/src/db/operations.schema.ts` while the hand-reviewed SQL migration remains authoritative for constraints/RLS.
16. The console has an `/ops` task board showing open preparation reviews and work tasks.
17. The fleet detail workflow routes `INSPECTED` vehicles to operations rather than exposing generic direct-action controls.
18. The operations table itself is explicitly RLS-enabled/forced in migration `0012`, rather than relying only on application-level agency filtering.

## Current lifecycle

Clean return:

`RETURN INSPECTION → INSPECTED → PREPARATION REVIEW → NO WORK → AVAILABLE`

Cleaning:

`RETURN INSPECTION → INSPECTED → PREPARATION REVIEW → CLEANING → QA → AVAILABLE`

Maintenance:

`RETURN INSPECTION → INSPECTED → PREPARATION REVIEW → MAINTENANCE → QA → AVAILABLE`

Combined cleaning + maintenance:

`RETURN INSPECTION → INSPECTED → PREPARATION REVIEW → CLEANING → MAINTENANCE → QA → AVAILABLE`

The combined path is sequential rather than allowing the vehicle state to claim two operational phases at once.

## Important boundary

`operations_tasks` is not the financial payable ledger. Partner/vendor work can later acquire quote, approval, invoice, reconciliation and evidence flows without changing the rental settlement authority.

## Known limitations / next engineering steps

1. The new Drizzle schema is isolated in `operations.schema.ts`; the main `schema.ts` RLS table registry still needs consolidation so the generated schema and migration metadata have one obvious source of truth.
2. QA is currently represented by a `QA` task plus completion semantics. A richer explicit `QA_PASSED` / `QA_FAILED` decision model, with failure reason and rework linkage, is still needed; do not invent new vehicle states for this.
3. Add task activity/history and manager/QA audit views so the operational case can be reconstructed without relying only on raw audit rows.
4. Replace the legacy/simple cleaning-task path with the new operations task model where applicable.
5. Improve task-board assignment, vendor selection, scheduling, evidence capture, and task detail.
6. Add external partner assignment/portal after the internal task lifecycle is stable.
7. Add targeted automated coverage for: blocked direct `INSPECTED → AVAILABLE`; clean triage release; maintenance → QA → available; combined cleaning → maintenance ordering; QA blocked by open work; and tenant isolation.

## Checkpoint — 2026-09-04 04:01 +01:00

- Maintenance release semantics are now implemented in the authoritative state machine for `OPS_SERVICE`.
- `CLEANING → MAINTENANCE` is explicitly allowed for the sequential combined-work path.
- The operations controller uses QA as the final release gate and transitions maintenance to AVAILABLE through `OPS_SERVICE` only after no open post-return tasks remain.
- The handoff has been updated to reflect the implemented lifecycle rather than the previous provisional maintenance limitation.
- PR #16 remains draft/open and unmerged. Latest recorded head: `e970e805e9b1fec9306b679eb3db13aa3dd61439`.
- No local test suite/CI run has been claimed. Repository inspection and source updates only.

## Safety

No database reset or destructive migration was used. Existing controllers were not mass-rewritten outside the operations controller changes. The implementation is isolated on `codex/post-return-ops` for review before merge.

## Verification status

Repository implementation has been inspected and updated, but no local test suite/CI run has been claimed from this environment. Before merge, run the migration and targeted tests locally, then exercise the real return flow: RETURN inspection → generated preparation task → triage → work completion → QA → vehicle release, including blocked direct `INSPECTED → AVAILABLE` and the combined cleaning+maintenance path.
