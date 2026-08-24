# locaOS — Domain Model (Phase 0)

Status: **PROPOSED — awaiting review.** This is the *target* model: tables arrive
phase-by-phase (critical-analysis §13), but no phase may introduce a design that contradicts
this model.

Entity names marked ➕ are justified additions to the minimum list in Master Instructions §4.

---

## 1. Identity & tenancy

| Entity | Purpose | Key relations / invariants |
|---|---|---|
| **Agency** | Tenant root. Legal identity (RC, ICE, IF), branding, defaults (currency=MAD, tz=Africa/Casablanca, language). | 1..* Branch. All tenant rows FK → Agency. |
| **Branch** (➕) | Physical site (airport desk, city office). | Belongs to Agency. Anchor for calendars, cash sessions, stock locality. |
| **User** | Human account (email/phone + credentials). May belong to multiple agencies. | 1..* Membership. |
| **Membership** (➕) | User↔Agency employment link with Role and branch scope. | Audited assignment changes. |
| **Role** | Named role per agency (Owner, Manager, Agent, Accountant, Field agent, Mechanic). | Role × Permission matrix is data, not code. |
| **Permission** (➕) | Atomic capability (`contract:price:override`, `deposit:release`, `vehicle:transition:force`…). | Guards check permissions server-side only. |
| **AuditEvent** | Append-only record: actor, agency, entity ref, action, before/after JSON, source, IP/device, reason (required for sensitive classes). | Never updated/deleted. |

## 2. CRM

| Entity | Purpose | Notes / invariants |
|---|---|---|
| **Customer** | Renter or company. Moroccan vs foreign profile shapes; contact via phone/WhatsApp-first (email optional). | Phone normalized E.164 (+212…). |
| **IdentityDocument** | CIN, passport, residence permit, driving license. Number, type, issue/expiry, photo refs. | Encrypted number at rest; expiry drives alerts; retention configurable (Law 09-08). |
| **Driver** | Additional drivers attached to a contract, each with own license/identity refs. | Scoped per contract; license validity checked at attach. |
| **CustomerFlag** (➕) | Structured reputational markers (no-show history, damage history) with evidence refs. | Creating "blacklist"-grade flags is a human-confirmed action (§14); never automatic. |

## 3. Fleet

| Entity | Purpose | Notes |
|---|---|---|
| **VehicleCategory** | Commercial class (economy, SUV, 7-places…) with default pricing refs. | Agency-scoped. |
| **VehicleModel** (➕) | Make/model/year/trim normalization. | Fuel type incl. EV/hybrid fields (battery capacity) for later phases. |
| **Vehicle** | Physical asset: plate, VIN, category, model, branch, mileage, fuel, `operationalStatus`, `fleetStatus` (IN_FLEET/FOR_SALE/SOLD/RETIRED), plate documents. | Status mutated **only** through the state machine service. |
| **VehicleStateTransition** | Append-only transition log: from, to, actor, reason, source ref (contract/reservation/maintenance/event). | One row per legal transition. |
| **VehicleDocument** | Registration (carte grise), VT (visite technique), insurance link, vignette. Expiry dates. | Expiry → configurable alert lead times (VT periodicity is data, not code — register #5). |
| **InsurancePolicy** | Policy per vehicle/fleet: insurer, coverage, dates, franchise amounts. | Status changes audited; never altered by automation. |

### Vehicle state machine (operational status)

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE
    AVAILABLE --> RESERVED: readiness window opens
    RESERVED --> PREPARING: prep starts
    RESERVED --> AVAILABLE: reservation cancelled
    PREPARING --> CONTRACT_READY: prepared + docs ok
    PREPARING --> AVAILABLE: abort
    CONTRACT_READY --> IN_TRANSIT: delivery route
    CONTRACT_READY --> RENTED: handover at branch
    IN_TRANSIT --> RENTED: handover complete
    RENTED --> OVERDUE: due date passed (system only)
    OVERDUE --> AWAITING_INSPECTION: vehicle returned
    RENTED --> AWAITING_INSPECTION: returned (check-in)
    AWAITING_INSPECTION --> INSPECTED: return inspection done
    INSPECTED --> CLEANING: cleaning required
    INSPECTED --> AVAILABLE: no cleaning needed
    CLEANING --> AVAILABLE: cleaning done
    AVAILABLE --> MAINTENANCE: planned service
    MAINTENANCE --> AVAILABLE: work completed
    ANY --> ACCIDENT: crash reported / detected
    ANY --> IMMOBILIZED: admin/technical hold
    ANY --> UNAVAILABLE: doc missing / voluntary
    ACCIDENT --> MAINTENANCE: repairs
    ACCIDENT --> AWAITING_INSPECTION: returned damaged
    IMMOBILIZED --> previous-ish: explicit release
    UNAVAILABLE --> AVAILABLE: docs restored
```

Rules (see critical-analysis §2):

- `ANY` exceptional states preserve the pipeline state they interrupted in the transition
  record; resolution must state the exit target explicitly (no silent `→ AVAILABLE`).
- `OVERDUE` entered/exited only by the scheduled evaluator.
- `RESERVED` entered only by the reservation service inside the preparation window.
- Every transition = 1 `VehicleStateTransition` row + 1 `AuditEvent`; guards run in the
  domain package (pure TS), applied transactionally by the fleet module.

## 4. Reservations & operations

| Entity | Purpose | Notes / invariants |
|---|---|---|
| **Reservation** | Operational commitment: customer, vehicle **or** category (with substitution), branch out/return, pickup & return date-times, pricing snapshot, deposit plan, flight info (➕ fields), status. | No overlap with other *active* reservations on a *specific* vehicle — DB exclusion constraint. Category-level bookings hold a placeholder until vehicle assignment. |
| **ReservationStatus** (values) | `DRAFT → CONFIRMED → VEHICLE_ASSIGNED → READY → IN_PROGRESS → COMPLETED` (+ `CANCELLED`, `NO_SHOW`). | Distinct from vehicle status; the service keeps both consistent. |
| **Quote** (➕) | Versioned pricing computation (rates, modifiers, deposit requirement) with inputs retained for explanation. | Contracts reference the accepted quote; price changes are new versions + audit. |
| **EmployeeAssignment** | Assigns a field agent to tasks (delivery, pickup, inspection) with time windows. | Double-booking of agents across overlapping windows → conflict detection. |
| **Delivery** / **Pickup** | Typed operation tasks: location (airport/hotel/customer), scheduled slot, status, proof of completion, linked inspection. | Drive the field agent's mobile day view. |
| **CleaningTask** | Post-return cleaning with checklist + responsible agent. | Linked to vehicle `CLEANING` state entry/exit. |

## 5. Contracts

| Entity | Purpose | Notes / invariants |
|---|---|---|
| **Contract** | Rental contract header: reservation ref, vehicle, customer, drivers, branch, period, deposit refs, language, numbering, `status`. | Number issued from per-agency sequence; unique per agency. |
| **ContractStatus** | `BLANK_ISSUED → DRAFT → SIGNED → ACTIVE → CLOSED` (+ `AMENDED`, `VOIDED(reason)`). | Blank-issued stubs are reconciled or voided — sequence gaps visible (§8). |
| **ContractVersion** | Immutable snapshot of full contract content per template; superseded versions retained. | Regeneration = new version, never overwrite. |
| **ContractAmendment** | Structured change record: vehicle replacement, period change, driver added, price revision — each referencing cause + approvals. | Amendments produce new versions; price changes require permission + reason. |
| **ContractTemplate** (➕) | Versioned, language-specific (FR/AR/EN) structured template — field schema + layout, not free HTML. | Contract content generated from structured data; never hand-assembled blobs (§8). |
| **Signature** (➕) | Captured signature refs per signatory role (customer, agent) with timestamp + evidence (hash of signed content). | Handwritten image first; qualified e-signature is a later port (register #6). |

## 6. Inspections

| Entity | Purpose | Notes |
|---|---|---|
| **Inspection** | Departure or return record: vehicle, contract, type, mileage, fuel level, checklist (accessories), location, timestamps, employee + customer acknowledgement. | Offline-created: idempotent by client UUID. |
| **InspectionPhoto** | Standardized capture slots (front/rear/sides/interior/damage zones) with device metadata. | Object-store refs; checksum; EXIF policy. |
| **Damage** | Existing vs new damage: zone (coded), severity, description, photos, resolution (charged/waived, amount ref). | Return-vs-departure diff is the system's core evidence pair. |

## 7. Finance

| Entity | Purpose | Notes / invariants |
|---|---|---|
| **Payment** | Money movement: method (CASH/CARD/TRANSFER/ONLINE/CHEQUE?), direction, amount (int centimes), currency, actor, refs (contract/reservation/invoice/fine), provider ref. | **Append-only.** Corrections = reversal Payment linked to original. Every mutation audited (§10). |
| **Deposit** | Deposit plan per contract: amount, method (cash held / card pre-auth / bank), status `PLANNED → HELD/PRE_AUTHORIZED → RELEASED → PARTIALLY_CHARGED → SETTLED`. | Charges against deposit require human confirmation + link to damages/charges. |
| **Invoice** | Formal document with lines (rental, extras, damages, fines, fuel); numbering per agency; PDF snapshot. | Linked payments; DGI compliance rules deferred — configurable (register #8). |
| **Fine** | Traffic fine on agency-owned vehicle: source ref, date, amount, status `RECEIVED → ATTRIBUTED → INVOICED → PAID/DISPUTED`. | Attribution to customer is evidence-based, human-confirmed (§14). |
| **CashSession** (➕) | Drawer session per branch/employee: opened_at/closed_at, expected cash (derived from Payments), counted denominations, variance + explanation. | Answers "how much should be in the drawer / who handled it" (§10). |
| **LedgerEntry** (➕) | Derived double-entry-style projection for reporting; rebuildable from Payments. | Reporting aid — Payments remain the source of truth. |

## 8. Maintenance

| Entity | Purpose | Notes |
|---|---|---|
| **MaintenanceRecord** | Actual work performed: type, garage (internal/external), cost, mileage, downtime, linked vehicle documents renewed. | Costs feed profitability + downtime analytics. |
| **MaintenanceTask** | Planned/upcoming work with **blocking calendar window** (exclusion-constrained like reservations). | The conflict the reservation service must respect (§7). |

## 9. Telematics (port defined, adapters later)

| Entity | Purpose | Notes |
|---|---|---|
| **GpsDevice** | Device registry: provider, identifier, binding to vehicle (history-aware). | Provider-agnostic fields only. |
| **GpsPosition** | Normalized position fix (time, point, speed, heading, validity flags). | Raw payloads retained in object store for replay. |
| **TelematicsEvent** | Normalized domain events: VehicleMoved/Stopped, IgnitionOn/Off, GpsDisconnected, BatteryVoltageChanged, MileageChanged, HarshBraking, CrashDetected, GeofenceEntered/Exited. | Ingestion idempotent per provider message id (§13). |
| **Geofence** | Named area (home branch, airport, border zones) used by rules. | Rules evaluate events × geofences — no provider coupling. |

## 10. Alerts, notifications, AI

| Entity | Purpose | Notes |
|---|---|---|
| **AlertRule** | Declarative rule: event type, JSON condition, severity, dedup window, actionKind (NOTIFY / CREATE_TASK / REQUIRE_APPROVAL). | Versioned data; system rules seeded; user-editable subset (§12). |
| **Alert** | Raised instance: rule ref, evidence refs, severity, status `OPEN → ACKNOWLEDGED → RESOLVED(suppressed)`, assignee, resolution note. | Deduped within window; never auto-resolved silently. |
| **Approval** (➕) | Human-confirmation record for REQUIRE_APPROVAL actions: requested action JSON, approver, decision, timestamp. | The §14 gate, persisted. |
| **Notification** | Outbound message: channel (in-app/SMS/WhatsApp/email — port), template ref, status. | Channel adapters carry integration status labels. |
| **AiInsight** | Phase 10+: typed answer objects (FACT/INFERENCE/RECOMMENDATION/UNCERTAINTY) with record citations + confidence. | Read-only inputs; no write path (ADR-0009). |

## 11. Reporting & snapshots

| Entity | Purpose |
|---|---|
| **DailyOpsSnapshot** (➕) | Per agency/branch/day: departures, returns, utilization, expected cash, exception counts. Materialized from events; rebuildable — powers the morning brief (§16). |
| **VehicleDayFact** (➕) | Per vehicle/day state intervals + revenue attribution — utilization/downtime analytics without heavy scans. |

## 12. Cross-cutting invariants (non-negotiable)

1. Every tenant-scoped row carries `agencyId`; cross-agency FKs are structurally invalid.
2. Money is integer centimes; currency explicit; no float arithmetic anywhere.
3. Financial records, audit events, contract versions, vehicle transitions: append-only.
4. All status mutations flow through domain services that validate transitions and write
   audit; there is no "update status" endpoint.
5. All timestamps stored UTC; rendered in `Africa/Casablanca` (register #10).
6. Offline-originated writes carry client UUIDs; ingestion is idempotent.
7. External integrations declare runtime status (MOCK/SIMULATED/UNAVAILABLE/CONNECTED);
   non-CONNECTED adapters never feed live business decisions silently (§26).
