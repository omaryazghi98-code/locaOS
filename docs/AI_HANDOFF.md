# locaOS — Persistent AI Handoff

> Living handoff for future coding agents/AI sessions. Update this file after every meaningful implementation, verification, architecture decision, or blocker.
>
> **Canonical branch:** `arena/01a031b1-locaos`
> **Do not infer progress from chat alone.** Read this file, `docs/LOCAOS_MASTER_PRODUCT_SPEC.md`, `docs/ux/README.md`, and recent git history first.

## Current checkpoint

**Date:** 2026-08-25 04:xx Africa/Casablanca

**Engineering status:** B2.1–B2.3 implemented and locally verified.

**Latest remote commit at handoff creation:** `fbac13b` (followed by this handoff commit).

### Verified green locally

- `pnpm --filter @locaos/domain test` → **25/25 passed**
- `pnpm --filter @locaos/domain typecheck` → passed
- `pnpm typecheck` → domain + API + web all passed
- `pnpm lint` → **0 errors** (warnings only)
- `pnpm build` → production build passed; **19 routes generated**
- `pnpm db:start` → Windows embedded PostgreSQL starts successfully
- `pnpm db:status` → PostgreSQL running on `127.0.0.1:5432`
- `pnpm test:ci` → **47/47 integration tests passed**
- 7 migrations applied from a clean test DB
- `locaos_app` provisioned as non-superuser with RLS enforced
- Working tree was clean before this handoff commit

## Implemented phases

### Phase 0 — Architecture / research

Complete. Master product specification exists at `docs/LOCAOS_MASTER_PRODUCT_SPEC.md`.

### Phase 1 / MVP

Complete.

### V1 operational intelligence + hardening

Complete and previously verified.

### B0 — UX plan

Complete. See `docs/ux/README.md`.

### B1 — i18n / RTL / cross-platform bootstrap

Complete.

Key outcomes:

- Typed FR/AR/EN UI catalog
- Language switcher with persisted preference
- RTL handling for Arabic
- Windows/Linux/macOS-aware embedded PostgreSQL development path
- Root typecheck ordering fixed

### B2.1 — Persona-aware Shell

Complete.

- Role-aware navigation for owner, manager, agent, field_agent, accountant, mechanic
- Active-role propagation from console layout into Shell
- Density modes: compact / comfortable / detailed
- Density persistence via `localStorage` (`locaos-density`)
- English language preference persistence fixed

### B2.2 — Focus Mode

Complete and repaired.

Original implementation incorrectly referenced multiple nonexistent `/api/ops/focus/*` endpoints. This was replaced with a real tenant-scoped `/api/ops/focus` backend surface and the UI was wired to it.

Focus Mode now covers the intended task-first workflow: pickups, returns, blockers, inspections, and contract actions.

Client components use a browser-safe fetch helper; server-only `next/headers` usage remains in server-side API helpers.

### B2.3 — Shared UX foundation + Fleet reference

Complete and verified.

Shared components:

- `PageHeader`
- `Section`
- `StatusBadge`
- `EmptyState`
- `DataTable`
- `FilterBar`
- `AlertCard`
- `QuickAction`
- `ConfirmAction`

Fleet was migrated as the reference implementation.

### Windows development / test bootstrap repairs

Several real environment/code integration issues were discovered and fixed during verification:

- Platform-specific optional embedded PostgreSQL binaries
- Windows `.exe` resolution for native PostgreSQL tools
- Better bootstrap error reporting
- Windows-safe test runner process invocation
- Browser-safe API fetching for client components
- Root workspace build command
- Strict TypeScript issues exposed by B2 integration

The result is now verified on Windows through the complete build + 47-test integration pipeline.

## Important verification facts

### Production build

`pnpm build` succeeds and Next.js reports 19 generated routes.

Remaining build output consists of non-blocking warnings, including a few unused variables/imports and the Next.js ESLint plugin notice. These are not currently blockers.

### Integration suite

`pnpm test:ci` completed successfully with:

- 1 test file passed
- **47 tests passed**
- tenant isolation / RLS sweeps green
- financial boundary tests green
- concurrent vehicle transition test green
- storage/audit integrity tests green

## Current git safety / workflow

- Canonical branch: `arena/01a031b1-locaos`
- Never force-push.
- Prefer fast-forward pulls.
- Do not silently rewrite history.
- Do not commit generated lockfile normalization unless it is an intentional dependency change.
- The older local B2.1/B2.2 stash was deliberately preserved as a backup during reconciliation. Do not drop/pop it without explicitly reviewing whether it is still needed.

## Architecture rules future agents must preserve

1. **Tenant isolation has two walls:** application scoping + PostgreSQL RLS. Never weaken either wall to implement platform administration.
2. **Platform/God Mode must be a separate security boundary**, not a boolean bypass in tenant authorization.
3. **Financial records are append-only/auditable.** Printing a blank contract must never create a financial record.
4. **No fake integrations.** Providers must truthfully report MOCK / UNAVAILABLE / etc.; do not simulate success as production success.
5. **Telemetry is evidence, not accusation.** Do not create autonomous punitive actions.
6. **Visibility is not authorization.** Role-aware navigation must never be treated as the security boundary.
7. **Client/server boundaries matter.** `next/headers` belongs in server-side code only; client components must use the browser-safe API helper.
8. **Use the existing domain terminology and invariants.** Do not introduce competing status models or duplicate business rules in the UI.
9. **Do not expand product scope casually.** Follow the master spec and phase boundaries.

## Known non-blocking items

- A few lint warnings remain (unused vars/imports).
- Full browser/manual UX validation of Focus Mode, RTL switching, density behavior, and responsive layouts is still desirable before declaring the entire B2 UX phase complete.
- The existing ESLint/Next plugin warning should be evaluated later, but it is not currently a build blocker.

## Next action — DO THIS NEXT

### B2.5 — Accessibility + responsive foundation

Do **not** jump directly to B2.4 table/state features yet.

B2.5 should first establish reusable UX guarantees that the shared components can inherit:

- visible `:focus-visible` states
- semantic landmarks and controls
- keyboard navigation expectations
- accessible dialog focus behavior
- `aria-*` coverage where needed
- table/header semantics
- contrast/token review
- responsive desktop/tablet/mobile behavior
- mobile-safe DataTable overflow and interaction patterns
- responsive Shell/navigation behavior
- systematic loading / empty / error presentation

### B2.5 stop condition

Do not begin broad B2.4 list-state work until the accessibility/responsive foundation is implemented and verified against the existing shared components and Fleet reference.

## Planned sequence after B2.5

1. **B2.4 — Operational list UX**
   - Fleet
   - Reservations
   - Customers
   - Contracts
   - Filtering
   - Sorting
   - Grouping where justified
   - Column visibility
   - Bulk selection/actions where safe
   - Saved views only when a clear persistence model is defined

2. **B3 — Contract Ready**
   - Today/tomorrow pickup readiness
   - Missing-information flags
   - populated / partial / Blank-Slate paths
   - batch preparation/printing with audited print actions
   - no financial side effects from preparation/printing

3. **Platform control plane / God Mode**
   - platform IAM
   - support sessions / break-glass
   - platform audit domain
   - agency management
   - feature flags
   - entitlements / plans
   - remote configuration
   - health / emergency controls
   - release metadata / rollout controls

4. **V2** according to the master spec.

## Mandatory handoff procedure for every future AI

Before changing code:

1. Read this file.
2. Read `docs/LOCAOS_MASTER_PRODUCT_SPEC.md` and the phase-specific plan.
3. Inspect current `git status` and current branch/HEAD.
4. Read recent commit history; do not trust chat summaries over repository state.
5. Verify the claimed baseline with tests where practical.
6. State the intended change and its acceptance criteria before implementation.
7. Make the smallest coherent change; preserve existing API/security/domain invariants.
8. Run the narrowest relevant tests first, then the full verification gate for the phase.
9. Commit meaningful milestones with clear messages.
10. Push to `arena/01a031b1-locaos` when the change is intended to become the canonical checkpoint.
11. Update this handoff file with:
    - date/time
    - commit hash
    - what changed
    - tests actually run and their results
    - known failures/blockers
    - next exact action
12. Never claim a test passed unless its output was actually observed.

## Recovery rule

If an agent becomes confused, loses context, or encounters a failed session:

- stop coding;
- inspect this handoff and git history;
- identify the last verified commit;
- restore/sync to that checkpoint;
- continue from the documented next action.

**The repository is the source of truth. This file is the continuity layer.**
