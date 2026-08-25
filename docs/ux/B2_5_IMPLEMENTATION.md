# B2.5 Accessibility + Responsive Implementation Checkpoint

## Status

Implementation has begun on `arena/01a031b1-locaos`.

**Important:** this checkpoint has **not yet been verified locally** with `pnpm typecheck`, `pnpm build`, or `pnpm test:ci` after these changes. Do not mark B2.5 complete until those gates pass.

## Implemented in this slice

### Global accessibility/responsive foundation
- Added reusable `:focus-visible` treatment for links, buttons, inputs, selects, textareas, and tabindex controls.
- Added practical touch-target sizing.
- Added mobile/tablet breakpoints.
- Added responsive table-card presentation at narrow mobile widths.
- Added responsive login width, calendar collapse, button rows, and key-value layout behavior.
- Added reduced-motion handling.
- Added responsive dialog primitives.

### Shell
- Added accessible mobile navigation toggle.
- Added navigation backdrop/drawer behavior on narrow screens.
- Added `aria-expanded`, `aria-controls`, `aria-current`.
- Preserved role-based navigation.
- Preserved persisted density preference.

### FilterBar
- Rebuilt as a controlled presentation component.
- Each field maintains its own value through page-owned state.
- Clear action uses actual field keys.
- Added semantic search role and labels.
- Added touch-friendly responsive wrapping.

### ConfirmAction
- Removed inline dialog styling in favor of responsive shared styles.
- Preserved ESC handling and focus return.
- Preserved focus containment.
- Added `aria-expanded` on trigger.
- Added responsive action layout.

### PageHeader / EmptyState
- PageHeader now has stable React-generated heading IDs and responsive wrapping.
- EmptyState uses semantic section/heading structure and proper button semantics.

### DataTable
- Preserved semantic column headers.
- Added mobile `data-label` presentation.
- Added `aria-selected` when row selection is enabled.
- Preserved density information hierarchy.

### Fleet
- Fleet now reads the persisted locale cookie and uses `FLEET_STRINGS[locale]` instead of being hardcoded to FR.
- Removed duplicate Fleet density controls/state; it now reads the shared `locaos-density` preference.
- Preserved the existing tenant-scoped browser API call.

## Still to verify / possibly refine

1. Full typecheck.
2. Production build.
3. Domain 25/25 tests.
4. Integration 47/47 tests.
5. Manual browser validation at desktop/tablet/mobile widths.
6. Manual RTL validation.
7. ConfirmAction interaction and focus behavior on narrow screens.
8. Focus Mode mobile completion without horizontal scrolling.
9. Check all shared component user-facing defaults for catalog localization before final B2.5 sign-off.

## Next exact action

Pull the latest branch and run:

```powershell
pnpm typecheck
pnpm build
pnpm --filter @locaos/domain test
pnpm test:ci
```

If any gate fails, fix the smallest root cause before expanding B2.5 scope.
