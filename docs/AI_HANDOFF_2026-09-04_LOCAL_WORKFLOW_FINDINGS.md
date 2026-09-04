# AI Handoff Checkpoint — 2026-09-04 Local Workflow Findings

## Purpose
Preserve the current manual local verification findings so work is not lost across chat/session limits. Repository state remains the source of truth.

## Local runtime verification reported by operator
- Branch: `fix/return-settlement-availability`
- Latest known HEAD: `685fd499a780522ade3f42bc685381930c9bd2de`
- PostgreSQL is running locally.
- `pnpm db:start` reports `db: already running on :5432`.
- `pnpm db:migrate` completed successfully through migrations `0006`–`0009`; total reported: 11 migrations, up to date.
- `START_LOCAOS.bat` launches the local application successfully.
- Operator successfully created a new customer and a reservation and reached the reservation detail screen.

## Manual workflow findings — 2026-09-04
Observed on reservation detail after customer + reservation creation:
- Reservation reaches `VEHICLE_ASSIGNED` and displays the assigned vehicle plate correctly.
- Current reservation screen exposes `Préparer / imprimer le contrat`, but creating/preparing the contract currently errors.
- The departure inspection workflow is still flaky and exposes/asks for a vehicle UUID in manual-entry mode.
- Vehicles are operationally identified by their plate/registration number; agents should not be expected to type UUIDs.
- The operator is continuing the real workflow test through contract → inspection → activation and will report further blockers.

## Important code audit finding: contract regression
Comparison of `05765a1b8de5f2a63aa9b25fe46b5cbcf19cda7c` → `685fd499a780522ade3f42bc685381930c9bd2de` shows:
- `apps/api/src/modules/contracts/contracts.controller.ts` changed by **53 additions / 206 deletions**.
- The current controller still calls local helpers `loadAssemblyData`, `fmt`, and `blankContract`, but the current version shown on HEAD no longer contains those helper definitions at the end of the file.
- The pre-activation checkpoint (`05765...`) contained those helpers, plus the PDF and paper-scan routes and the fuller amendment implementation.
- Therefore the current contract-generation error is strongly consistent with an accidental controller rewrite/regression, not a customer-data problem. Do not rewrite the controller blindly: restore the lost baseline behavior and reapply only the intended activation hardening.
- The safe target is: preserve the pre-existing controller behavior from `05765...`, then reapply the authoritative activation checks from the current work (vehicle row lock, READY reservation, departure inspection, required deposit coverage, conditional SIGNED→ACTIVE update, conflict code, vehicle transition, reservation transition).

## Inspection UX/domain requirement
- Inspection submission API currently requires `vehicleId` as a UUID.
- The field UI currently has a manual `ID véhicule` input and labels it `UUID — aucun départ trouvé` when the today's-departures picker is empty.
- This is not acceptable operator UX for locaOS. UUIDs are internal identifiers and must not be a normal agent-facing workflow.
- Preferred workflow: choose/search a reservation and/or vehicle by human-facing reservation reference + plate; resolve the internal UUID server-side. Manual UUID entry should not be required for ordinary inspection work.
- Reservation-linked inspection integrity must remain authoritative: the resolved vehicle must match the reservation's assigned vehicle.
- Do not weaken the backend UUID identity requirement merely to improve UX; change the UI/API boundary so agents use plate/reference while the backend continues using UUIDs internally.

## Customer contact UX requirements
### Phone
- Phone numbers should support country selection/country codes rather than forcing agents to know/type the full E.164 form manually.
- Morocco should be a convenient default, while other countries must remain selectable.
- Normalize to E.164 server-side before persistence/uniqueness checks.
- Do not infer nationality, residency, or customer segment from phone country code. A `+212` number is not proof of Moroccan nationality or domestic status.

### Email
- Email is **optional** and must remain optional.
- The operator explicitly does not want email to block customer creation because many rental customers do not need/provide one.
- Add completion/autocomplete suggestions to make entry easier (for example common domain completion) without turning them into validation requirements.
- Do not invent or auto-save an email value merely because a suggestion was shown; suggestions are convenience only.
- Backend already models `email` as optional and validates it only when present; preserve that behavior.

## Customer Match Code — confirmed product direction
- Match Code remains a planned feature, not yet implemented.
- It is an operational indexing/deduplication key, not the authoritative `customer.id`, nationality, residence, or customer segment.
- Never infer Moroccan identity from `+212`.
- Design should support search, repeat rentals, CSV/Excel exports/imports, duplicate suggestions, customer corrections/merge, identity documents, NAVI, and historical traceability.
- Strong identity evidence may include identity-document evidence; fuzzy matching can suggest duplicates but must never silently merge records.
- Algorithm/versioning must allow the match strategy to evolve without invalidating historical exports.

## Current customer schema finding
Current `customers` fields include `kind`, `segment`, name/company fields, `phone`, `email`, notes, timestamps, and tenant identity. There is currently no dedicated nationality or residence field. Identity documents are separate and include encrypted number, last4, document type, and `issuerCountry`.

## Next exact engineering order from this checkpoint
1. Restore the lost `contracts.controller.ts` baseline behavior and reapply only activation hardening; add regression coverage for contract generation/PDF routes.
2. Replace inspection UUID entry with plate/reservation-oriented agent UX while retaining UUIDs internally and enforcing reservation/vehicle matching server-side.
3. Finish the manual reservation → contract → inspection → sign → deposit → READY → activation journey.
4. Fix customer phone country-code UX + E.164 normalization without inferring identity/segment.
5. Add optional email completion suggestions; never make email obligatory.
6. Audit customer search/indexing and then design Match Code before any schema migration.
7. Continue the P0 settlement/return implementation only after the forward rental path is actually usable end-to-end.

## Safety / verification rules
- Do not claim CI/test green without current evidence.
- Do not perform destructive DB actions based on inference.
- Separate FACT → INFERENCE → ACTION in future debugging.
- Any controller restoration must be compared against the known-good pre-regression version so unrelated behavior is not silently removed.
