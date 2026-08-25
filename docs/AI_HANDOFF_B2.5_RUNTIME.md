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
Observed: `/api/contracts/:id/pdf` returned an internal error on Windows.

Root cause: the API always tried to launch `@sparticuz/chromium`, whose bundled browser is intended for Linux/serverless use.

Correction committed:
- `2c2ae575` — `fix(pdf): use local Chrome on Windows and macOS`
- PDF browser selection now honors `CHROMIUM_EXECUTABLE`, otherwise auto-detects a locally installed Chrome/Edge on Windows/macOS, with the bundled Chromium remaining the Linux/server fallback.

**Still needs manual FR + AR PDF verification after syncing.**

### Contract snapshot / serialization refactor
Problem identified: contract generation had the right immutable-version architecture but the serialized agreement was incomplete and contained hardcoded rental terms (for example insurance/cross-border/consent defaults). That risks divergence between the operational data and the printed contract.

New rule:
- `contract_versions.content` is the canonical serialized agreement snapshot.
- The Contract UI and PDF must consume that same snapshot.
- Known reservation/quote/vehicle/customer/deposit data is copied into the snapshot at capture time.
- Unknown terms stay empty/null instead of being invented.
- Later changes require an explicit amendment/new contract version rather than silently mutating the signed snapshot.

Implemented:
- `28d576d` — domain contract schema now includes explicit snapshot metadata, quote version, pricing subtotal, planned/held deposit status, and keeps unconfigured insurance/cross-border/consent terms nullable.
- `a77f3b3` — contract assembly now serializes quote subtotal/discount/total, quote version, deposit planned/held state, rental capture time, and real vehicle mileage/fuel when available; removed hardcoded insurance/cross-border/consent defaults.
- `b5b2008` — PDF renderer now prints the serialized subtotal/discount/total, deposit status, and snapshot traceability from that same content object.
- `5c335ad` — Contract detail page now displays the serialized agreement snapshot (contract total, pricing, deposit, booking/quote version, customer, vehicle, period, mileage/fuel) instead of making the live reservation data the only visible source.
- `7ac06a6` — domain tests cover the serialized snapshot structure and blank-contract null behavior.

Important current limitation:
- The reservation assembly helper still does not yet populate departure/return inspection rows because that helper remains in `contracts.controller.ts`; the schema and assembly layer are prepared for those fields and leave them null until sourced.
- The amendment controller still needs a focused audit for complete snapshot recomputation on every amendment kind, especially PRICE, so new versions preserve all existing terms while changing only the amended field(s).

### Morocco contract example / template
The existing backend template is Morocco-oriented and is explicitly documented as common Moroccan agency practice, not legal advice. It contains fields for agency identity/ICE, CIN/passport, driving licence, vehicle/VIN, rental period, pricing, deposit, insurance/deductible, mileage/fuel, cross-border authorization, additional drivers, CNDP-related consent fields, and signatures.

## Still open — must be audited before declaring B2.5 complete

1. Pull and manually verify the Windows PDF renderer correction with a real FR contract, then an AR contract.
2. Verify the new serialized contract UI/PDF values against the reservation/quote used to generate the contract.
3. Populate departure/return inspection snapshot references and recorded mileage/fuel from the controller assembly helper.
4. Audit contract amendment logic so every amendment creates a complete new snapshot rather than a partial mutation.
5. Systematically test every visible button/action on the console and identify true no-op actions vs role-gated/invalid-state actions.
6. Verify Arabic persistence with: switch to AR → navigate to another page → hard refresh → verify `<html dir="rtl">` and sidebar on the right.
7. Audit all pages for mixed-language strings after switching FR/EN/AR; do not assume the Shell translation implies page translation.
8. Test tablet at 1024×768 and 768×1024.
9. Test mobile at 390×844, including nav drawer, tables/cards, dialogs, Focus Mode, and Arabic RTL.
10. Run final `pnpm typecheck`, `pnpm build`, `pnpm test:ci`, and lint after all runtime/UI fixes.

## Important rule
Do not start B2.4 operational-list expansion until these B2.5 runtime/RTL/print/manual defects are closed and verified.
