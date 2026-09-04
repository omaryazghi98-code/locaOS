# NAVI — Frontend Command Center (branch `genspark_ai_developer`, base `codex/post-return-ops`)

## What was built (frontend only — zero backend/domain changes)

Route: `/navi` inside the console shell (auth, role nav, FR/AR/EN + RTL, density all inherited).

```
apps/web/src/app/navi.css                       tokens + NAVI component classes (layered on globals.css, nothing renamed)
apps/web/src/app/(console)/navi/page.tsx        server page → <NaviCommandCenter/>
apps/web/src/lib/navi/
  types.ts        read-model types mirroring REAL payloads (command-center, focus, tasks, alerts, vehicles)
  useNaviData.ts  5 independent fetches, per-panel loading/error/retry, 60 s refresh while tab visible
  derive.ts       pure regroupings: attention items (P1/P2/P3), fleet counts, post-return lanes, activity, brief counts
  intents.ts      command router: structured retrieval over loaded data → ANSWER → EVIDENCE → RELATED → ACTIONS
  i18n.ts         FR/AR/EN catalog for all NAVI copy
  hooks.ts        useLocale (existing cookie/event contract), useReducedMotion, useNow, useInViewport
apps/web/src/components/navi/
  NaviCommandCenter  orchestrator (hero, brief lede with evidence anchors, KPIs, two-column panels)
  NaviSurface        raw-WebGL ambient shader (hero only; DPR≤1.25, 75% res, 30 fps, paused off-screen/hidden;
                     CSS gradient fallback; removed under prefers-reduced-motion; pointer-events none)
  NaviCommandInput   ⌘K combobox (ARIA 1.2 listbox), suggestion chips, thinking → answer states
  AttentionStack     Immédiat / Aujourd'hui / Cette semaine cards: severity, what, why, entities, primary action,
                     in-place ack/resolve for alerts (existing /api/alerts/:id/ack|resolve)
  PostReturnPipeline INSPECTED → REVUE → NETTOYAGE → MAINTENANCE → QA → DISPONIBLE lanes from vehicle status +
                     open tasks; triage/start/complete wired to existing /api/ops/tasks endpoints
  OperationLanes     today's departures/returns on a time axis with "now" marker, readiness/blocker chips
  FleetPulse         14-status distribution bar + legend filter + vehicle chips
  ActivityTimeline   alerts + task events, newest first
  NaviAction         accessible inline confirm/prompt mutation (pending → done → error/retry), replaces confirm()/prompt()
  primitives         AnimatedNumber, Chip, Kbd, Skeleton, PanelState, Panel
```

Propagation started: `StatusBadge` now emits `data-status` and uses per-status tokens (class contract preserved).
Shell nav gained a `NAVI` entry for all roles (endpoints used require only ops:read / alerts:read / fleet:read).

## Status colour semantics (navi.css)
AVAILABLE green · RESERVED indigo · PREPARING/CONTRACT_READY/IN_TRANSIT blues · RENTED brand blue · OVERDUE red ·
AWAITING_INSPECTION amber · INSPECTED teal · CLEANING cyan · MAINTENANCE orange · QA/PREPARATION_REVIEW violet (task lanes, not vehicle states) ·
IMMOBILIZED/ACCIDENT deep red · UNAVAILABLE slate.

## Verified
`pnpm --filter @locaos/web typecheck` ✓ · `pnpm lint` 0 errors ✓ · rendered against seeded Atlas Rent data at 1440px and 390px.

## Backend gaps documented (NOT fabricated)
1. **No natural-language query endpoint** (`/api/navi/query`). The command input is a structured intent router over
   already-loaded data (plate, RES-ref, attention, blockers, returns, preparation, fleet, navigation). Labelled as such in UI.
2. **No global operational event feed.** Activity timeline uses open alerts + operations tasks only. Vehicle state
   transitions exist per vehicle (`/api/fleet/vehicles/:id`) but not agency-wide.
3. `command-center.actions[kind=TRANSFER].label` exposes a truncated UUID — NAVI shows the plate from `branchMismatches` instead.
4. `/api/ops/tasks` returns no `updated_at` guaranteed in the list; timeline uses `created_at`/`completed_at`.
5. `focus.returns[].customerName` can be null (seed RES without customer join) — handled with fallbacks.

## Remaining work (next PR)
- Phase 5 propagation: dashboard `/`, `/fleet`, `/ops` to adopt NAVI panels/cards (tokens already shared).
- Phase 6 audit: axe pass, keyboard walkthrough of pipeline actions, RTL screenshot review, Lighthouse on `/navi`.
- Optional: extract NaviAction to replace ActionButton's native dialogs across the console.
