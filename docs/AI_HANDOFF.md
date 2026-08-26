# locaOS — Persistent AI Handoff

> Living handoff for future coding agents/AI sessions. Update this file after every meaningful implementation, verification, architecture decision, or blocker.
>
> **Canonical branch:** `arena/01a031b1-locaos`
> **Do not infer progress from chat alone.** Read this file, `docs/LOCAOS_MASTER_PRODUCT_SPEC.md`, `docs/ux/README.md`, and recent git history first.

## Current checkpoint

**Date:** 2026-08-26 05:20 Africa/Casablanca

**Engineering status:** B2.1–B2.3 implemented and previously verified. The accessibility/responsive B2.5 audit exists as a documented baseline, but that work has not been implemented yet. The project is now in a **rental-operations / operator-workflow audit** and handover-integrity hardening phase.

**Latest remote checkpoint before this handoff update:** `e4e4006` plus the preceding integrity/audit commits. This handoff update itself creates the next documentation commit.

### Verified green locally

- `pnpm typecheck` → domain + API + web passed after the handover hardening fixes
- `pnpm build` → production build passed; **19 routes generated**
- `pnpm test:ci` → **57/57 tests passed** after the rental-integrity fixture and implementation fixes
- `test/rental.integrity.spec.ts` → **7/7 passed**
- `test/integration.spec.ts` → **47/47 passed**
- `test/contract.logic.spec.ts` → **3/3 passed**
- Tenant isolation / PostgreSQL RLS sweeps remain green
- Test DB migrations remain up to date at 7 migrations and `locaos_app` is provisioned as a non-superuser with RLS enforced

### Known local working-tree caveat

The developer machine has an intentional local modification in `apps/api/src/seed.ts` adding pricing `lines` to an existing seed fixture. Do **not** discard it or overwrite it while syncing. The file was modified locally to repair the contract pricing shape after `lines` became required.

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

## Rental integrity hardening — VERIFIED

This is now a completed and tested foundation layer.

### Vehicle assignment

`apps/api/src/modules/reservations/reservations.controller.ts` now validates an assignment against:

- same agency / tenant
- reserved category
- operational fleet membership
- assignable vehicle operational state
- overlapping reservation commitments
- overlapping live contract commitments

Regression coverage exists for:

- foreign-agency vehicle → rejected
- wrong-category vehicle → rejected
- maintenance vehicle → rejected
- overlapping committed vehicle → rejected

### Contract activation / handover

`apps/api/src/modules/contracts/contracts.controller.ts` revalidates current reservation/vehicle state at activation instead of trusting stale stored assignment data.

Regression coverage verifies a tampered or stale contract/vehicle mismatch cannot activate.

### READY gating

Reservation transition to `READY` is enforced server-side. The API recomputes current blockers and returns `409 RESERVATION_NOT_READY` if prerequisites remain.

### Departure inspection

Reservation-driven departure inspections are linked to the current contract where appropriate, and duplicate `clientUuid` submissions are idempotent.

### Deposit capture

Deposit creation was made duplicate-safe so repeated retries cannot create multiple live deposits for the same contract.

### Integrity test result

The dedicated rental-integrity suite is **7/7 green**, and the complete CI-style suite is **57/57 green**.

## Operator workflow audit — current findings

The product is now being tested as an actual rental-agent workflow instead of only as API/domain surfaces.

Canonical journey under audit:

`Customer → Reservation → Category/vehicle → Quote → Contract → Departure inspection → Deposit → READY → Handover/activation → Active rental → Alerts/exceptions → Return inspection → Charges/settlement → Deposit release/charge → Contract close → Vehicle back to fleet`

### Finding: customer creation was a real P0 UI gap — FIXED

Before this change:

- `/customers` had a customer list but no creation action
- `/reservations/new` only allowed selecting pre-existing demo customers
- a real walk-in / phone booking could not be onboarded manually through the UI

Implemented:

- `apps/web/src/app/(console)/customers/page.tsx` now exposes `+ Nouveau client`
- a reusable customer entry form is wired to the existing authenticated `/api/customers` write surface
- `apps/web/src/app/(console)/reservations/new/page.tsx` now exposes `+ Nouveau client` inline beside the customer selector
- newly created customer is automatically selected in the reservation form
- the new reservation page now explicitly allows no customer until selected/created instead of silently choosing the first demo customer
- a back link was added to the new-reservation page

Relevant commits:

- `792b232` — expose standalone customer creation
- `e4e4006` — enable inline customer creation in reservations

### Finding: category vs exact vehicle selection is already a good model

Current reservation creation supports:

- required rental category
- optional exact vehicle assignment
- available vehicle choices are filtered by category/status in the UI
- server-side assignment integrity checks are now much stronger

Do not replace this with mandatory pre-assignment. A reservation may correctly sell a category first and receive a specific plate later.

### Finding: reservation blocker UX is still incomplete

Current detail page can show blockers such as:

- `vehicle_unassigned`
- `vehicle_not_ready`
- `contract_unsigned`
- `deposit_unsecured`
- `inspection_missing`

The backend correctly blocks `READY`, but the UI currently exposes `Marquer prête` while blockers remain and then surfaces the server error in a generic alert.

Required UX principle:

> **Every blocker should have an obvious remediation path.**

Target pattern:

- vehicle unassigned → `Assign vehicle`
- vehicle not ready → explain current fleet state + preparation action
- contract unsigned → `Open / prepare contract`
- deposit unsecured → `Secure deposit`
- departure inspection missing → `Start inspection`

A blocker should represent `problem → explanation → action → completion signal`, not just an internal enum.

### Finding: vehicle assignment state presentation is confusing

Observed on a created reservation:

- reservation status: `VEHICLE_ASSIGNED`
- displayed fleet status: `AVAILABLE`
- readiness blocker: `vehicle_not_ready`

The fleet state machine itself is intentionally stricter: handover readiness expects a preparation/reservation-compatible operational state rather than plain `AVAILABLE`.

Next implementation should make the transition semantics explicit and use the existing vehicle transition service rather than inventing a parallel status model.

### Finding: departure inspection UI is not agent-ready

The field inspection page has useful backend foundations including offline queueing and idempotent submission, but the current UI exposes raw UUID/manual vehicle fallback and is confusing from an operator perspective.

Observed issues:

- reservation-driven picker should be the normal path
- raw vehicle UUID should not be required during normal agent operation
- current “Démarrer l’inspection” flow is not sufficiently self-explanatory
- photo capture exists as an API capability but there is no polished agent-facing photo workflow yet
- return inspection is not yet surfaced as a coherent next step from the active rental

The field foundation must be preserved, but the UI needs a workflow wrapper around it.

### Finding: no backward navigation / step navigation

During browser testing, the reservation/inspection/contract sequence could strand the agent on a detail page or separate inspection route without an obvious prior-step action.

Add explicit, safe back navigation and contextual step navigation. This must not mutate state; it is navigation only.

### Finding: alerts expose actions the current role may not be allowed to perform

Observed:

`Résoudre` → `Permission requise: alerts:resolve`

This is an important UX/security alignment issue.

Rule:

> Do not present an apparently executable action that the current role cannot execute.

Either hide it, disable it with an explanation, or replace it with the action the role is actually allowed to perform (for example `Prendre en charge`). Server authorization remains authoritative.

### Finding: alerts need an auditable case/activity timeline

The desired operational model is richer than a simple Resolve button.

Example target timeline:

- system opened overdue case
- agent took ownership
- agent called customer at 16:42
- no answer
- WhatsApp sent
- GPS checked
- customer contacted
- manager approved extension
- return recorded
- case resolved

Each activity should be traceable with actor, timestamp, action, result/outcome, optional note, linked reservation/contract/customer/vehicle, and next action/follow-up where relevant.

Do not create autonomous punitive actions from telemetry. Human decision points remain explicit and audited.

### Finding: contract/document system is more capable than its current UI suggests

Current contract architecture already supports versioned immutable contract snapshots, FR/AR/EN templates, customer/vehicle/period/pricing/deposit/insurance/cross-border sections, additional drivers, mileage/fuel, consents, and signatures.

The print renderer consumes the immutable contract snapshot and template language; the contract content includes full identity fields in the template model even though some UI views are masked.

Do not weaken the immutable snapshot model just to make contracts editable. After a contract is issued/signed, changes should flow through the existing amendment/void/versioning mechanisms.

### Finding: contract language must be explicit and consistent

Browser testing showed language/content inconsistency when switching UI language and printing contracts.

Required behavior:

- operator chooses FR / AR / EN for the contract output
- the selected language is serialized with the contract snapshot
- headings, labels, clauses, signatures and document text all use that template
- Arabic uses RTL layout
- the UI locale and contract-output language should not be assumed to be identical unless explicitly chosen

Current template definitions already contain FR/AR/EN dictionaries; the remaining work is making the selection/UX deterministic and consistent across the whole print workflow.

### Finding: contract format should follow actual rental-document patterns

Real Moroccan rental forms reviewed during this audit consistently expose a richer rental-document structure than the current simple PDF presentation.

Observed/reference fields include:

- renter identification
- CIN/passport
- driving licence
- additional driver(s)
- vehicle make/model
- registration
- VIN/chassis
- rental dates
- tariff / duration / totals
- deposit
- insurance / deductible
- mileage / fuel at departure and return
- vehicle condition / damages
- accessories/documents
- customer + agency signatures/stamp

locaOS should therefore evolve the contract renderer around **versioned document templates**, not one universal layout.

Important: legal compliance is not being inferred solely from these examples. Any field marked as legally required must be validated against current Moroccan requirements before being hard-coded as mandatory.

### Finding: contract copies / package

Target operational document workflow:

- Agency copy
- Customer copy
- Departure inspection / condition report
- Deposit receipt/confirmation
- Applicable declaration or authorization where required

Printing/exporting should be auditable, and printing a blank contract must never create a financial record.

### Finding: identifier masking needs separate presentation policies

Customer identity numbers are stored encrypted at rest and revealed only through an audited permissioned endpoint. This is good and must be preserved.

Do not assume the same masking policy should apply to:

- secure database record
- agent UI
- signed rental contract
- customer copy
- internal/exported reports

The document-template layer must be able to express whatever identifier display is required after legal/document validation.

### Finding: pricing needs a real owner-configurable rule engine

Current reservation creation accepts an agent-entered daily rate and compares it with a category floor.

This is not yet the desired commercial model.

Target hierarchy:

`Agency defaults → category/vehicle price → duration band → seasonal/date rule → optional customer/channel rule → authorized discount → floor/MAP/override`

Example:

- 1–4 days → 350 MAD/day
- 5–14 days → 300 MAD/day
- 15–29 days → 275 MAD/day
- 30+ days → 250 MAD/day

Every quote should preserve the rule/version that produced it so historical contracts remain explainable.

The observed MAP warning where the visible daily rate appeared above the displayed floor must be investigated before changing pricing semantics.

### Finding: management visibility must be preserved as a first-class goal

The product spec/handoff direction remains owner/manager-centric for detailed visibility.

Future management surfaces should be able to drill into:

- revenue / outstanding balances
- deposits
- fleet utilization
- revenue and profitability by vehicle
- maintenance cost / downtime
- document expiry/compliance risk
- reservations at risk
- overdue rentals
- missing signatures / deposits / inspections
- alerts and staff activity
- operational exceptions

No AI-generated insight should bypass source records or human approval requirements.

### Finding: click-to-call is feasible as an integration boundary

Future architecture should support a `Call customer` action from customer/reservation/alert contexts without hard-coding a vendor now.

Minimum abstraction:

`telephony provider/PBX/SIP → call event/activity → linked customer/reservation/case → audit timeline`

The call activity should preserve actor, target, time/status/duration when available, and outcome/note. Provider state must truthfully report MOCK / UNAVAILABLE / production state rather than pretending a call succeeded.

## Document/privacy guidance from current audit

The customer/contract document examples reviewed during this audit suggest that real rental paperwork commonly identifies the renter directly and includes licence/identity fields, while locaOS currently uses masked identity in some UI/document views.

Do not convert this observation into a claim of legal compliance. Treat it as a document-template requirement to validate against current Moroccan rental/document rules.

The rental contract should be modeled as a rental agreement, not automatically as a generic `wakala` / power-of-attorney instrument. Cross-border or special authorizations are separate document/use cases and should be modeled explicitly.

## Current product-state audit summary

### P0 / blocking operational gaps

1. Customer onboarding UI — **fixed**.
2. Reservation blocker remediation — **not yet fixed**.
3. Departure/return inspection UX — **not yet fixed**.
4. Role/action alignment on alerts — **not yet fixed**.
5. Operator step/back navigation — **not yet fixed**.

### P1 / major workflow improvements

1. Vehicle reservation/preparation state presentation.
2. Explicit contract language/output selection.
3. Versioned Moroccan-style document templates and print package.
4. Owner-configurable tiered pricing/MAP.
5. Auditable activity/case timeline for operational interventions.
6. Return settlement / deposit lifecycle UI.
7. Manager/owner drill-down reporting.
8. Telephony integration boundary.

## B2.5 — Accessibility + Responsive Audit

**Audit date:** 2026-08-25

The earlier B2.5 audit remains valid as a separate backlog. It covered:

- visible keyboard focus
- responsive Shell/navigation
- DataTable mobile strategy
- row interaction semantics
- ConfirmAction hardening
- FilterBar correctness
- catalog-driven shared UI strings
- Fleet language correctness
- shared density state
- loading/error primitives
- Focus Mode responsive behavior
- contrast verification

Do not silently mark these complete merely because the rental workflow is being improved.

## Current git safety / workflow

- Canonical branch: `arena/01a031b1-locaos`
- Never force-push.
- Prefer fast-forward pulls.
- Do not silently rewrite history.
- Do not commit generated lockfile normalization unless it is an intentional dependency change.
- Preserve the local `apps/api/src/seed.ts` change until it is intentionally committed or consciously discarded.

## Architecture rules future agents must preserve

1. **Tenant isolation has two walls:** application scoping + PostgreSQL RLS. Never weaken either wall to implement platform administration.
2. **Platform/God Mode must be a separate security boundary**, not a boolean bypass in tenant authorization.
3. **Financial records are append-only/auditable.** Printing a blank contract must never create a financial record.
4. **No fake integrations.** Providers must truthfully report MOCK / UNAVAILABLE / etc.; do not simulate success as production success.
5. **Telemetry is evidence, not accusation.** Do not create autonomous punitive actions.
6. **Visibility is not authorization.** Role-aware navigation must never be treated as the security boundary.
7. **Client/server boundaries matter.** `next/headers` belongs in server-side code only; client components must use the browser-safe API helper.
8. **Use the existing domain terminology and invariants.** Do not introduce competing status models or duplicate business rules in the UI.
9. **Do not weaken immutable contract snapshots.** Signed/issued historical contracts remain immutable; use amendments/versioning/voiding for changes.
10. **Do not invent parallel vehicle status mutations.** Use the existing fleet transition service/state machine.
11. **Do not treat browser visibility as permission.** API authorization remains authoritative.
12. **Do not claim legal compliance from industry examples.** Mark legal/document requirements as pending validation until supported by current authoritative sources.
13. **Do not add autonomous punitive behavior from telemetry.** Human decisions must remain explicit and auditable.

## Current verification gate

Before calling a milestone complete, run the narrowest relevant checks followed by:

- `pnpm typecheck`
- `pnpm build`
- `pnpm test:ci`

Current verified result:

- typecheck ✅
- build ✅
- 57/57 tests ✅

Manual verification is still required for operator UX flows.

## Next exact implementation order

### 1. Customer workflow verification

Verify the newly added:

`Customers → + Nouveau client`

and

`Reservations → New reservation → + Nouveau client → customer automatically selected`

Do not redesign it further until the flow is confirmed in-browser.

### 2. Reservation blocker/action system

Replace generic blocker pills and dead-end `Marquer prête` behavior with:

`blocker → explanation → action → completion`

Add clear back navigation and avoid exposing role-forbidden actions.

### 3. Vehicle preparation state

Use the existing fleet transition service so a confirmed reservation with an assigned vehicle becomes operationally prepared/reserved without inventing a second vehicle-state model.

Add regression coverage around reservation assignment → vehicle state → READY gating.

### 4. Field inspection redesign

Make reservation-driven inspection the default, remove raw UUID entry from the normal agent path, add clear departure/return context, photo capture UX, evidence summary, and success/next-step navigation.

### 5. Contract output workflow

Add explicit contract-output language choice and document package actions:

- agency copy
- customer copy
- inspection/condition report
- deposit receipt
- applicable declarations/authorizations

Preserve immutable contract snapshots.

### 6. Pricing rule engine

Introduce configurable duration bands and owner/category/vehicle floors with explainable quote snapshots.

### 7. Alert/case activity timeline

Implement ownership + auditable intervention activities before full telephony integration.

### 8. Return/settlement workflow

Return inspection → damage/fuel/mileage → extra charges → deposit release/charge → payment/final balance → contract close → vehicle fleet state.

### 9. Owner/manager reporting and telephony

After the operational transaction model is solid, expose drill-down reporting and the provider-neutral click-to-call/activity boundary.

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
