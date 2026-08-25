# B2.5 Runtime / Manual UX Handoff

Date: 2026-08-25 (Africa/Casablanca)
Canonical branch: `arena/01a031b1-locaos`

This file records the latest manual browser findings and corrections after the original B2.5 audit. Read it together with `docs/AI_HANDOFF.md`.

## Verified manual findings

### Browser / hydration
- Login hydration warning caused by the browser/password-manager environment injecting `autocomplete="off"`; it disappeared in Incognito with extensions disabled. No application hydration defect was confirmed for that warning.

### Real runtime defects found and fixed
- `PermissionsGuard` crashed because its `Reflector` dependency was undefined in the Windows `tsx watch` runtime. Fixed in `6f044e5`.
- Command Center rendered an illegal nested `<html>` element. Fixed in `240e99a`.
- Desktop Command Center KPI cards had missing/naked labels due to positional navigation-string lookups. Added named `COMMAND_KPIS` catalog entries in `84f2ddf` and updated the page in `5873181`.
- Command Center desktop density control presentation was polished in `7c3ff8b`.

### Runtime environment lessons
- Windows local dev requires exactly one Next server on `:3000`, one API on `:3001`, and PostgreSQL on `:5432`.
- `EADDRINUSE :3000` / `:3001` was caused by duplicate local dev processes, not repository defects.
- API login failures with `ECONNREFUSED 127.0.0.1:5432` were caused by PostgreSQL being stopped/starting up.
- PostgreSQL can be started with `pnpm db:start` and verified with `pnpm db:status`.

## Manual UX defects now confirmed

### Arabic RTL persistence
Observed: switching to Arabic correctly moves the sidebar to the right immediately, but after navigation/reload the root layout could return to LTR and the sidebar moved left.

Root cause: `apps/web/src/app/layout.tsx` is a Server Component but attempted to read `document.cookie`; this cannot be the authoritative server-side cookie read.

Correction committed:
- `74d3538` — `fix(i18n): persist root RTL direction from language cookie`
- Root layout now reads `locaos-lang` with `next/headers` `cookies()` and sets `<html lang dir>` server-side.
- `client-preferences.ts` was updated in `36de226` so `setLocale()` also updates `document.documentElement.lang/dir` immediately.

### Contract printing
Observed: the Contracts page button `Imprimer un contrat vierge` POSTed `/api/contracts/blank` through the generic `ActionButton` but stopped after the JSON response; it never opened the generated PDF.

The backend already has:
- `POST /api/contracts/blank` to reserve a traceable blank contract number.
- `GET /api/contracts/:id/pdf` to render the structured contract content through server-side Chromium.
- Structured FR/AR/EN contract templates with Moroccan-agency-oriented fields and clauses.

Correction committed:
- `d9e3f02` — new `ContractBlankPrintButton` that creates the blank contract and opens its PDF.
- `01c864c` — Contracts page now uses the new button and passes the active cookie locale.

### Contextual contract printing from reservations and vehicles
Requirement clarified: operators should not re-enter data that the system already knows from the booking/rental context.

Implemented:
- `bc83face` — added `ContractFromReservationButton` that calls `/api/contracts/from-reservation` for the reservation context and immediately opens the resulting contract PDF.
- `2595229` — Reservation detail now shows one contextual `Prepare / print contract` action when a vehicle is assigned, using the active FR/AR/EN locale. The previous separate FR + Arabic generate buttons were removed.
- `ad436b4` — Vehicle detail now shows `Contrat / PDF` when there is an active/current contract, and `Préparer contrat` linking to the associated reservation when a next reservation exists but no current contract exists.

Workflow rule:
- Reservation context supplies customer, vehicle, branch, pickup/return and other known rental data.
- Vehicle context reuses the current contract or directs the operator to the associated reservation.
- Unknown fields remain printable blanks for handwriting; do not ask the operator to duplicate data already present in the booking/rental context.
- Printing must not create or modify financial ledger records.

### PDF renderer — Windows local development
Observed: `/api/contracts/:id/pdf` returned `{"error":{"code":"INTERNAL","message":"Erreur interne"}}` on Windows.

Root cause: the API always tried to launch `@sparticuz/chromium`. The package documentation states that its bundled Chromium is Linux-only and does not work on Windows/macOS; local development should use a locally installed browser. citeturn327205search0turn327205search2

Correction committed:
- `2c2ae575` — `fix(pdf): use local Chrome on Windows and macOS`
- PDF browser selection now honors `CHROMIUM_EXECUTABLE`, otherwise auto-detects installed Chrome/Edge on Windows and Chrome/Edge on macOS.
- The bundled Sparticuz browser remains the Linux/server fallback.
- Local browser launches use local-browser args rather than the Linux serverless Chromium args.

**Not yet manually verified after this fix.** The next required test is a real FR contract PDF and then an AR contract PDF.

### Morocco contract example / template
The existing backend template is already Morocco-oriented and is explicitly documented as common Moroccan agency practice, not legal advice. It contains fields for agency identity/ICE, CIN/passport, driving licence, vehicle/VIN, rental period, pricing, deposit, insurance/deductible, mileage/fuel, cross-border authorization, additional drivers, CNDP-related consent fields, and signatures.

External research used for this audit indicates that Moroccan rental-contract practice commonly covers agency identity, customer identity, licence information, vehicle state/details, duration and price, deposit, fuel/mileage, insurance/deductible, and signatures. Official Office des Changes material confirms that in the specific non-resident/foreign-vehicle contexts it regulates, a rental contract must specify duration, price, and payment terms. The repository template must remain a product template and should not be presented as legal advice.

## Still open — must be audited before declaring B2.5 complete

1. Pull and manually verify the Windows PDF renderer correction with a real FR contract, then an AR contract.
2. Systematically test every visible button/action on the console and identify true no-op actions vs role-gated/invalid-state actions.
3. Verify Arabic persistence with: switch to AR → navigate to another page → hard refresh → verify `<html dir="rtl">` and sidebar on the right.
4. Audit all pages for mixed-language strings after switching FR/EN/AR; do not assume the Shell translation implies page translation.
5. Test tablet at 1024×768 and 768×1024.
6. Test mobile at 390×844, including nav drawer, tables/cards, dialogs, Focus Mode, and Arabic RTL.
7. Run final `pnpm typecheck`, `pnpm build`, `pnpm test:ci`, and lint after all runtime/UI fixes.

## Important rule
Do not start B2.4 operational-list expansion until these B2.5 runtime/RTL/print/manual defects are closed and verified.
