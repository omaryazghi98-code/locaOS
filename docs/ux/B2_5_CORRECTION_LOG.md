# B2.5 Correction Log

## Scope

Post-implementation audit corrections for the B2.5 accessibility/responsive foundation.

## Corrections pushed

- Centralized browser locale/density preference events in `apps/web/src/lib/client-preferences.ts`.
- LanguageSwitcher now uses the shared locale preference mechanism.
- Shell subscribes to shared locale/density updates instead of owning isolated persistence state.
- Fleet subscribes to the same locale/density events.
- Focus Mode subscribes to the same locale-change event.
- Shared UI copy added to `packages/domain/src/i18n.ts` for selection, confirmation, filtering, and language labels.
- DataTable defaults now use the shared catalog and expose an `aria-label`.
- ConfirmAction defaults use the shared catalog and temporarily mark `#app-content` inert while the dialog is open.
- Shell exposes `#app-content` as the dialog isolation target.
- Tablet Shell navigation no longer collapses into a 72px iconless rail; it becomes a readable 228px sidebar between 768px and 1100px.
- Mobile navigation closes on route changes, returns focus to its trigger, focuses the first nav link when opened, and makes the closed drawer non-interactive/hidden to keyboard users.
- Fleet no longer owns an independent density preference; it consumes the shared preference events.
- Fleet no longer hardcodes `FLEET_STRINGS.fr`; it follows the shared locale state.
- Focus Mode no longer reads the language cookie only once; it follows shared locale changes.
- `document.body` horizontal overflow is set to `clip` during the Shell session instead of relying only on the previous hidden overflow behavior.

## Known limitation not completed in this pass

`apps/web/src/app/layout.tsx` still contains the older server-locale implementation. The repository write connector rejected a direct update/delete of that file despite reporting the same blob SHA, so this specific server-rendered initial-locale correction remains a follow-up item. The client-side Shell/LanguageSwitcher still corrects `document.documentElement.lang` and `dir` after hydration.

## Verification status

The pre-correction branch was verified with:

- domain tests: 25/25
- full typecheck: pass
- production build: pass, 19 routes
- integration tests: 47/47

The corrections in this file have **not yet been locally re-run through those gates**. No CI status is configured/reported for the latest correction commit. Local verification is mandatory before marking B2.5 complete.

## Required verification commands

```powershell
pnpm typecheck
pnpm build
pnpm --filter @locaos/domain test
pnpm test:ci
pnpm lint
```

Then manually verify at 1440px, 1024px/768px, and 390px widths:

- Shell/navigation
- FR/EN/AR switching and RTL
- density synchronization
- Fleet
- Focus Mode
- FilterBar
- ConfirmAction focus/ESC/background isolation
