# ADR-0005 — Offline-first field operations via PWA (IndexedDB outbox)

- Status: Proposed
- Date: 2026-08-24

## Context

Field agents inspect, photograph, capture signatures, hand over vehicles, and verify
customers at airports, hotels, parking lots, and roadsides — often with poor connectivity
(§17). The inspection workflow must be extremely fast (§9) and must not lose evidence.

## Decision

- Field routes ship as a PWA: service worker precaches the shell and the day's operation
  packet (tasks, reservations, contracts, vehicle summaries); inspection submissions queue in
  an IndexedDB outbox with **client-generated UUIDs** and compressed, checksummed photo blobs.
- Sync is idempotent: the server treats a repeated `client_uuid` as the same submission
  (unique constraint; replay is a no-op). Photos upload out-of-band after the record lands.
- Conflict policy: field groups (mileage, fuel, checklist, signatures) apply last-write-wins
  **with full version history retained**; a conflicting overwrite raises an anomaly alert —
  never a silent merge (critical-analysis §5).
- Location capture on inspections is optional, clearly indicated, and governed by a
  configurable retention policy (Law 09-08, register #3).

## Consequences

- No app-store dependency for staff devices; one codebase.
- Background sync requires modern Chromium/WebKit; a minimum-device policy is documented.
- Server must keep idempotency + version-history obligations forever (append-only
  inspection versions); test suite includes airplane-mode E2E.
- Escape hatch: BLE OBD or continuous background GPS would force a native companion app for
  that feature only, behind the same API contracts.

## Alternatives considered

- **Native apps (React Native)** — offline + camera are PWA-feasible; double platform cost
  not justified yet (§21 speculative cost).
- **"Offline tolerance" (retry-only)** — loses photos/signatures on connection loss during
  capture; unacceptable for evidence-grade workflows.
