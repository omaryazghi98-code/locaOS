# NAVI — Frontend Command Center

Branch: `genspark_ai_developer` · base: `codex/post-return-ops` · PR #17

## Implemented

NAVI lives at `/navi` inside the console shell. It uses existing authenticated, tenant-scoped endpoints and does not create backend/domain/schema/permission truth.

- Layered NAVI design tokens in `apps/web/src/app/navi.css`.
- Five independent real-data fetches with per-panel loading/error/retry and 60s visible-tab refresh.
- Evidence-anchored hero brief and animated tabular KPIs.
- Structured command router over loaded data: `ANSWER → EVIDENCE → RELATED → ACTIONS`.
- Attention stack with existing alert acknowledgement/resolution.
- Post-return pipeline: `INSPECTED → REVUE → NETTOYAGE → MAINTENANCE → QA → DISPONIBLE` derived from real vehicle/task state.
- Fleet pulse, operation lanes and activity timeline from available APIs.
- `NaviAction` for accessible confirmation/prompt mutations with pending/done/error/retry states.
- Ambient raw-WebGL hero surface only; constrained DPR/render rate, viewport pause, CSS fallback and reduced-motion removal.
- FR/AR/EN catalog, RTL-aware interaction, keyboard/focus/ARIA handling.
- `StatusBadge` now exposes `data-status` semantic tokens.
- NAVI is available in the shell navigation for all roles whose existing read permissions support its panels.

## Phase 5 propagation — completed

The NAVI visual grammar is now propagated without making every screen a duplicate of the command center:

- `/` dashboard: NAVI panels, operational hierarchy, risk/action surfaces and direct NAVI entry while retaining the existing command-center data contract.
- `/fleet`: NAVI fleet-pulse/status distribution using the same semantic vehicle-state tokens; existing localized table and density behavior retained.
- `/fleet/[id]`: operational status badge, NAVI panels for vehicle facts/actions, explicit INSPECTED → operations routing, and history/documents remain authoritative.
- `/ops`: NAVI panels for triage/work/QA counts, accessible `NaviAction` mutations, explicit QA validation language, and direct NAVI pipeline linkage.

The propagation does not add new API endpoints or new lifecycle states.

## Backend gaps — deliberately not fabricated

1. No natural-language query endpoint (`/api/navi/query`); command input remains a structured router over loaded data.
2. No agency-wide operational event feed; activity timeline remains alerts + operations tasks.
3. `command-center.actions[kind=TRANSFER].label` can expose a truncated UUID; NAVI uses the plate from `branchMismatches` instead.
4. `/api/ops/tasks` does not guarantee `updated_at`; timeline uses `created_at`/`completed_at`.
5. `focus.returns[].customerName` can be null; NAVI handles fallbacks.

## Phase 6 — remaining verification

After the propagation commits, verification still needs to be run against the resulting branch:

- `pnpm --filter @locaos/web typecheck`
- `pnpm lint`
- axe/accessibility pass
- keyboard-only walkthrough of NAVI pipeline and `/ops` actions
- FR/AR/EN and RTL screenshot review at desktop/mobile widths
- Lighthouse/performance check on `/navi`
- verify reduced-motion behavior and shader containment

No post-propagation test/CI result is claimed here until actually run.

## Next architectural step

Do not put AI decision authority inside NAVI components. The future intelligence layer should resolve user intent into an allow-listed domain tool/action, call the authoritative API, return evidence/result, and refresh NAVI state. AI must never bypass the domain state machine, permissions, tenant isolation, settlement rules, inspection evidence or audit trail.
