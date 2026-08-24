# ADR-0004 — pnpm/Turborepo monorepo; Next.js console + PWA field app

- Status: Proposed
- Date: 2026-08-24

## Context

Agency staff use two faces of one product: a dense operator console (owner/desk) and a
field workflow (airport/hotel/roadside, poor connectivity). Both need the same types,
validation schemas, i18n, and domain rules. Morocco-first means French default UI, Arabic
(RTL) and English for contracts and UI (§18).

## Decision

- **Monorepo** via pnpm workspaces + Turborepo task graph (`apps/api|web|worker`,
  `packages/*` — see application-structure).
- **Operator console:** Next.js (App Router) + React 19, Tailwind CSS + shadcn/ui — chosen
  for dense, information-first operational layouts with RTL-capable styling; TanStack Query
  for server state; React Hook Form + shared Zod schemas.
- **Field app:** a PWA route group in the same Next.js app (`(field)`) with a service worker
  and IndexedDB outbox (ADR-0005).
- **i18n:** ICU message catalogs `fr` (default), `ar` (RTL), `en`; copy only via catalogs.
- PDF rendering stays server-side (ADR-0007); the web app never composes document HTML.

## Consequences

- One design system, one auth surface, one CI; field PWA shares console components.
- Next.js couples us to its App Router evolution — accepted for the ecosystem and SSR/PWA
  tooling; API remains a separate NestJS app so the console is replaceable.
- shadcn/ui copies components into the repo — deliberate: full control for dense tables,
  keyboard-first flows, and RTL fixes.

## Alternatives considered

- **SPA (Vite) + API** — loses SSR/PWA ergonomics we want day one; more wiring.
- **Vue/Nuxt** — equally viable; React chosen for hiring pool and shared component ecosystem.
- **Separate field-app repo + native shell** — rejected until BLE/OBD or background GPS
  becomes a hard requirement (assumption A4; revisit trigger documented).
