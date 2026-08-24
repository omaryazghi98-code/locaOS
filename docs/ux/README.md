# locaOS — Phase B UX Foundation

This document is the Phase B plan of record.

## Work packages

### B0 — Hygiene
- Ensure clean-checkout typecheck builds `@locaos/domain` before workspace typechecks.
- Add this UX plan and verification gates.

### B1 — i18n foundation
- Typed FR/AR/EN UI string catalog following the existing `labels.ts` pattern.
- FR as default.
- RTL support using `dir="rtl"` and CSS logical properties.
- Language switcher with persisted preference.
- Migrate the shell as the reference pattern, then sweep existing pages.

### B2 — UX shell architecture
- Compact / Comfortable / Detailed presentation tiers.
- Persist density preference per user.
- Focus Mode for desk/field workflows.
- Role-aware navigation: Owner/Manager command center; Desk/Field task-first UX.
- Keyboard navigation and accessibility pass.
- Status icons + text; do not rely on color alone.
- Consistent skeleton, empty, and error states.

### B3 — Contract Ready
- Identify today's/tomorrow's pickups.
- Show contract-packet readiness.
- Surface missing information.
- Support populated, partial, and Blank Slate paths.
- Support batch print with audited print actions.
- Reuse existing numbering authority and Blank-Slate lifecycle.
- Printing/preparation must create no financial side effects.

### B4 — Field mobile UX
- Task-first inspection flow across the defined inspection zones.
- Photo capture.
- Offline photo queue using an IndexedDB-backed outbox.
- Upload and reconciliation using existing idempotency patterns.
- Departure/return comparison view.

### B5 — Command surfaces
- Global search and Ctrl/Cmd+K command palette.
- Saved views.
- Filtering/sorting/grouping.
- Column visibility.
- Bulk actions on primary operational lists.
- Remove raw UUIDs from ordinary user workflows.

### B6 — Alerts UX
- Category and severity filters.
- Clear "Why am I seeing this?" explanation panel for alerts.

## Explicit exclusions for Phase B

- No AI features.
- No Platform Control Plane / God Mode.
- No feature-flag/entitlement system.
- No billing provider integration.
- No new external provider integrations.
- No weakening of RLS or existing financial invariants.

## Verification gates

After each package:

1. Run the relevant tests.
2. Run full integration tests where applicable.
3. Run lint.
4. Run typecheck.
5. Verify migrations remain clean.
6. Review tenant isolation and authorization impact.
7. Commit a meaningful checkpoint.

## Stop conditions

Stop and report rather than guessing when a change would:

- materially alter the architecture,
- weaken tenant isolation,
- affect financial invariants,
- require an unverified legal interpretation,
- require unavailable external credentials,
- or expand scope beyond Phase B.
