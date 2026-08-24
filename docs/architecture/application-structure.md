# locaOS — Application Structure (Phase 0)

Status: **PROPOSED — awaiting review.** The tree below is the Phase 1 target skeleton;
later-phase packages are marked and must not be created early (scope discipline, §3).

```
locaOS/
├── apps/
│   ├── api/                    # NestJS: modules, guards, controllers, PDF triggers
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── common/         # tenant transaction wrapper, guards, interceptors, filters
│   │       └── modules/
│   │           ├── iam/        # agencies, branches, users, sessions, audit
│   │           ├── fleet/
│   │           ├── customers/
│   │           ├── reservations/
│   │           ├── contracts/
│   │           ├── inspections/
│   │           ├── finance/
│   │           ├── maintenance/
│   │           ├── ops/        # assignments, deliveries, cleaning
│   │           ├── alerts/
│   │           └── reporting/
│   ├── web/                    # Next.js App Router
│   │   └── src/
│   │       ├── (console)/      # dense operator UI: brief, fleet, calendar, contracts, finance
│   │       ├── (field)/        # PWA route group: inspections, handover, delivery
│   │       ├── offline/        # service worker, IndexedDB outbox, sync queue
│   │       └── lib/            # API client (generated from OpenAPI), auth, i18n
│   └── worker/                 # pg-boss processors: outbox, rules, evaluators, PDF renders
├── packages/
│   ├── domain/                 # PURE TypeScript — no Nest/Next/DB imports
│   │   └── src/
│   │       ├── vehicle/        # state machine: states, guards, transitions table
│   │       ├── reservation/    # conflict windows, readiness policy
│   │       ├── pricing/        # quote computation (pure functions, versioned)
│   │       ├── money/          # centimes arithmetic, MAD formatting
│   │       ├── contracts/      # content assembly, numbering formats, amendment rules
│   │       └── alerts/         # condition evaluation for rule records
│   ├── db/                     # Prisma schema + migrations + seed + RLS SQL
│   ├── api-contracts/          # Zod schemas + types shared web⇄api; OpenAPI emitted
│   ├── telemetry/              # TelematicsProvider port + adapters (mock first)
│   ├── integrations/           # PaymentGateway, Messaging, ESignature, FlightInfo ports
│   │                           # every adapter self-declares integration status
│   ├── pdf/                    # template renderer (HTML→Chromium), FR/AR/EN fonts
│   ├── ui/                     # shared React components (density-first, RTL-aware)
│   ├── i18n/                   # fr (default) / ar (rtl) / en message catalogs
│   └── config/                 # tsconfig, eslint, tailwind preset, editorconfig
├── docs/                       # architecture, decisions, research, verification
├── docker-compose.yml          # postgres, minio, api, web, worker
├── AGENTS.md
└── README.md
```

## Placement rules (lint-enforced where possible)

| Rule | Why |
|---|---|
| `packages/domain` imports nothing from `apps/*` or framework runtimes | The state machine and money math must be unit-testable and shared with web/mobile |
| Modules never import another module's internals — only its public service | Module boundaries are the future service boundaries (§21) |
| No SQL in `apps/web`; no DB access outside repositories | §21: no direct database access from UI |
| Zod schemas live once in `api-contracts`; controllers and forms both consume them | One validation truth |
| Provider SDKs only inside `packages/telematics` / `packages/integrations` adapters | §13/§26: provider logic never enters domain entities |
| Every adapter exports `status(): IntegrationStatus` (MOCK/SIMULATED/UNAVAILABLE/CONNECTED) | Honest integration labeling, UI-visible |
| Arabic/French copy never hardcoded in components — catalogs only | Tri-lingual product (§18) |

## Naming & code conventions

- TypeScript strict mode; `noUncheckedIndexedAccess`; ESLint + Prettier (config in
  `packages/config`); conventional commits.
- Services expose intention-revealing APIs: `reserveVehicle()`, `checkInVehicle()`,
  `issueBlankContract()` — not generic `update()`.
- Errors: typed domain errors (`VehicleTransitionError`, `ReservationConflictError`) mapped
  to HTTP codes in one interceptor; no string errors.
- Tests colocated (`*.spec.ts` for unit; `apps/api/test` for Testcontainers integration;
  `e2e/` Playwright from Phase 3).
- Feature branches: `feat/<phase>-<topic>`; Phase exit requires green CI: lint, typecheck,
  unit, integration (incl. tenancy + append-only invariants), migration up-test on clean PG.

## CI pipeline (GitHub Actions, from Phase 1)

1. lint + typecheck (all workspaces)
2. unit tests (domain-heavy)
3. integration tests (Testcontainers Postgres; runs tenancy & constraint suites)
4. build (api, web, worker) + Docker image
5. security: `pnpm audit`, CodeQL, secret scanning — block on high findings
