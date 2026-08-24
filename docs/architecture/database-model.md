# locaOS — Database Model (Phase 0 design)

Status: **PROPOSED — awaiting review.** PostgreSQL 16+. Schema evolves via forward-only
migrations (Prisma + handwritten SQL for advanced constraints). Table set arrives
phase-by-phase; this document is the target.

---

## 1. Conventions

- UUID v7 primary keys (`id uuid primary key`) — time-ordered, index-friendly.
- Every tenant table: `agency_id uuid not null references agencies(id)` + indexed.
- Timestamps `created_at/updated_at timestamptz not null default now()` (UTC only).
- Money: `amount bigint not null` (centimes) + `currency char(3) not null default 'MAD'`.
- Enum-like statuses: Postgres enums (reversible via migration) or `text` + check
  constraints when the vocabulary is expected to evolve (alert rules, integration status).
- Soft deletion (`deleted_at`) **only** where a row must remain referenceable
  (customers, vehicles). Financial/audit/versioned tables: hard rows, append-only.
- Append-only enforced by `BEFORE UPDATE/DELETE` rejection triggers on:
  `payments`, `audit_events`, `contract_versions`, `vehicle_state_transitions`,
  `ledger_entries`, `telematics_events`.

## 2. Tenancy & IAM

| Table | Key columns | Constraints / indexes |
|---|---|---|
| `agencies` | id, legal_name, rc_number➖, ice_number➖, if_number➖, default_lang, currency, tz | unique(ice_number) where not null |
| `branches` | id, agency_id→, name, city, address, geo point | unique(agency_id, name) |
| `users` | id, email, phone, password_hash, is_platform_admin, status | unique(email); unique(phone) |
| `sessions` | id, user_id→, token_hash, agency_id (active context), device_meta, ip, expires_at, revoked_at | idx(token_hash); idx(user_id) |
| `memberships` | id, user_id→, agency_id→, role_id→, branch_ids[], status | unique(user_id, agency_id) |
| `roles` | id, agency_id→, name, is_system | unique(agency_id, name) |
| `role_permissions` | role_id→, permission_key | pk(role_id, permission_key); permission keys checked in code registry |
| `audit_events` | id, agency_id, actor_user_id, entity_type, entity_id, action, before jsonb, after jsonb, source, ip, device, reason, created_at | **append-only trigger**; idx(agency_id, entity_type, entity_id, created_at); idx(actor_user_id) |

**RLS baseline (all tenant tables):**

```sql
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON vehicles
  FOR ALL
  USING (agency_id = current_setting('app.agency_id')::uuid)
  WITH CHECK (agency_id = current_setting('app.agency_id')::uuid);
```

Application sets `SET LOCAL app.agency_id` per transaction (tenant transaction wrapper);
repositories are agency-scoped by construction (defense in depth, ADR-0003).

## 3. CRM

| Table | Key columns | Constraints / indexes |
|---|---|---|
| `customers` | id, agency_id→, kind (INDIVIDUAL/COMPANY), first/last/company name, phone (E.164), whatsapp_same bool, email, deleted_at | unique(agency_id, phone) where not deleted; idx(agency_id, last_name) |
| `identity_documents` | id, agency_id→, customer_id→, type (CIN/PASSPORT/RESIDENCE_PERMIT/DRIVER_LICENSE), number_encrypted, number_last4, issue_date, expiry_date, front_object_key, back_object_key | idx(customer_id); idx(expiry_date) for alerts; number encrypted at rest (ADR-0006 security) |
| `drivers` | id, agency_id→, contract_id→, full_name, license_number_encrypted, license_country, birth_date, identity_document_id→ | unique(contract_id, identity_document_id) |
| `customer_flags` | id, agency_id→, customer_id→, kind, severity, evidence jsonb, created_by→, approval_id→ | human-confirmed creation enforced by service |

## 4. Fleet

| Table | Key columns | Constraints / indexes |
|---|---|---|
| `vehicle_categories` | id, agency_id→, code, name, default_quote_template_id | unique(agency_id, code) |
| `vehicle_models` | id, make, model, year, fuel_type (PETROL/DIESEL/HYBRID/EV), battery_kwh | unique(make, model, year) |
| `vehicles` | id, agency_id→, category_id→, model_id→, plate, vin, current_branch_id→, operational_status, fleet_status, current_mileage_km, fuel_level_pct, acquired_at, deleted_at | unique(agency_id, plate); check (mileage >= 0); idx(operational_status) partial where fleet_status='IN_FLEET' |
| `vehicle_state_transitions` | id, agency_id→, vehicle_id→, from_status, to_status, actor_user_id, reason, source_type, source_id, created_at | **append-only trigger**; idx(vehicle_id, created_at) |
| `vehicle_documents` | id, agency_id→, vehicle_id→, type (REGISTRATION/VT/INSURANCE/VIGNETTE➖/OTHER), ref_number, issued_at, expires_at, object_key | idx(vehicle_id, type, expires_at) |
| `insurance_policies` | id, agency_id→, vehicle_id→ (nullable = fleet policy), insurer_name, policy_number, coverage jsonb, starts_at, ends_at, franchise_amount | daterange exclusion per vehicle where not fleet-wide |

**Status vocabulary check constraint** (enum `vehicle_status`): the 14 states of §6; guards
live in the domain package — the DB stores, the domain validates transitions
(`vehicle_state_transitions` is the log, not the validator).

## 5. Reservations & operations

| Table | Key columns | Constraints / indexes |
|---|---|---|
| `reservations` | id, agency_id→, customer_id→, vehicle_id→ null, category_id→, branch_out_id→, branch_in_id→, pickup_at, return_at, status, flight_number, flight_landing_at, quote_id→, assigned_employee_id→, created_by→ | **exclusion constraint below**; status enum (DRAFT/CONFIRMED/VEHICLE_ASSIGNED/READY/IN_PROGRESS/COMPLETED/CANCELLED/NO_SHOW); idx(pickup_at) per branch |
| `quotes` | id, agency_id→, reservation_id→, version, lines jsonb (structured), total, deposit_required, valid_until, created_by→ | unique(reservation_id, version) |
| `employee_assignments` | id, agency_id→, user_id→, task_type, task_id, window tstzrange, status | exclusion: no overlapping ACTIVE assignments per user |
| `deliveries` / `pickups` | id, agency_id→, reservation_id→, kind (AIRPORT/HOTEL/CUSTOMER_SITE/BRANCH), address/geo, scheduled_at, status, linked_inspection_id | idx(agency_id, scheduled_at) |
| `cleaning_tasks` | id, agency_id→, vehicle_id→, assigned_to→, status, checklist jsonb, started_at/completed_at | idx(vehicle_id, status) |

```sql
-- The anti-double-booking backbone (requires btree_gist).
-- Active statuses only; cancelled/completed/no-show rows never block.
ALTER TABLE reservations ADD CONSTRAINT no_overlap_active_per_vehicle
  EXCLUDE USING gist (
    vehicle_id WITH =,
    tstzrange(pickup_at, return_at) WITH &&
  ) WHERE (vehicle_id IS NOT NULL AND status IN ('DRAFT','CONFIRMED','VEHICLE_ASSIGNED','READY','IN_PROGRESS'));
```

Category-level reservations (`vehicle_id null`) are conflict-checked in the service against
category availability; assignment (setting `vehicle_id`) retries under the same constraint.

```sql
-- Maintenance blocking windows reuse the same mechanism.
CREATE TABLE maintenance_windows (
  id uuid PRIMARY KEY, agency_id uuid NOT NULL, vehicle_id uuid NOT NULL,
  window tstzrange NOT NULL, kind text NOT NULL, source_task_id uuid,
  EXCLUDE USING gist (vehicle_id WITH =, window WITH &&)
);
```

## 6. Contracts

| Table | Key columns | Constraints / indexes |
|---|---|---|
| `contract_sequences` | agency_id, next_value | pk(agency_id) — numbering authority, row-locked increment |
| `contracts` | id, agency_id→, number int, reservation_id→, customer_id→, vehicle_id→, branch_id→, language (fr/ar/en), status, period tstzrange, deposit_id→, current_version_id→, signed_object_key, voided_reason | **unique(agency_id, number)** — blank stubs occupy numbers; status enum (BLANK_ISSUED/DRAFT/SIGNED/ACTIVE/CLOSED/AMENDED/VOIDED) |
| `contract_versions` | id, contract_id→, version int, template_id→, template_version, content jsonb (structured — full field set), rendered_object_key, hash, created_by→, created_at | **append-only trigger**; unique(contract_id, version); hash = content digest for signature evidence |
| `contract_amendments` | id, agency_id→, contract_id→, kind (VEHICLE_REPLACEMENT/PERIOD/DRIVER/PRICE/OTHER), payload jsonb, reason, approval_id→, resulting_version_id→ | idx(contract_id) |
| `contract_templates` | id, agency_id→, language, name, schema_version, body jsonb (structured layout), active | unique(agency_id, language, name) |
| `signatures` | id, agency_id→, contract_version_id→, signatory_role (CUSTOMER/AGENT), signatory_name, image_object_key, content_hash, captured_at, captured_geo | idx(contract_version_id) |

Structured `content jsonb` keeps contract data queryable/explainable; the template engine
renders to HTML→PDF (ADR-0007). Never a hand-authored HTML blob.

## 7. Inspections

| Table | Key columns | Constraints / indexes |
|---|---|---|
| `inspections` | id, agency_id→, contract_id→, kind (DEPARTURE/RETURN), vehicle_id→, client_uuid (offline idempotency), performed_by→, performed_at, mileage_km, fuel_level, checklist jsonb, location geo, customer_ack bool, customer_ack_method, device_meta jsonb | **unique(agency_id, client_uuid)**; idx(contract_id, kind) |
| `inspection_photos` | id, inspection_id→, slot (FRONT/REAR/LEFT/RIGHT/INTERIOR/ZONE_n), object_key, checksum, taken_at, exif_stripped bool | idx(inspection_id) |
| `damages` | id, agency_id→, vehicle_id→, discovered_inspection_id→, preexisting bool, zone_code, severity, description, photos jsonb, resolution (NONE/CHARGED/WAIVED), charge_payment_id→ | idx(vehicle_id, discovered_inspection_id) |

## 8. Finance

| Table | Key columns | Constraints / indexes |
|---|---|---|
| `payments` | id, agency_id→, direction (IN/OUT), method (CASH/CARD/TRANSFER/ONLINE/DEPOSIT_CASH/REFUND), amount bigint, currency, contract_id→/reservation_id→/invoice_id→/fine_id→ null, reverses_payment_id→, provider_ref, received_by→, received_at, cash_session_id→, meta jsonb | **append-only trigger**; check (amount > 0); idx(agency_id, received_at); idx(cash_session_id); refunds must reference original (FK reverses_payment_id) |
| `deposits` | id, agency_id→, contract_id→, amount, method (CASH_HELD/CARD_PREAUTH/BANK), status (PLANNED/HELD/PRE_AUTHORIZED/RELEASED/PARTIALLY_CHARGED/SETTLED), held_by→, released_by→, released_at, release_reason | status transitions via service + audit; idx(contract_id) |
| `deposit_charges` | id, deposit_id→, amount, reason, damage_id→/fine_id→ null, approval_id→, payment_id→ | human-confirmed (Approval ref required) |
| `invoices` | id, agency_id→, number int, contract_id→, issued_at, total, status (DRAFT/ISSUED/PARTIALLY_PAID/PAID/CANCELLED), object_key | unique(agency_id, number); own sequence — DGI rules deferred/configurable (register #8) |
| `invoice_lines` | id, invoice_id→, kind (RENTAL/EXTRA/DAMAGE/FUEL/FINE/OTHER), description, qty, unit_amount, total | — |
| `fines` | id, agency_id→, vehicle_id→, source_ref, occurred_at, amount, status (RECEIVED/ATTRIBUTED/INVOICED/PAID/DISPUTED), attributed_customer_id→, attribution_evidence jsonb, invoice_id→ | idx(vehicle_id, occurred_at) |
| `cash_sessions` | id, agency_id→, branch_id→, opened_by→, closed_by→, opened_at, closed_at, expected_amount (derived snapshot), counted jsonb (denominations), counted_total, variance, variance_explanation | one open session per (branch, drawer); idx(branch_id, opened_at desc) |
| `ledger_entries` | id, agency_id→, payment_id→, entry_kind, account code, amount (signed), occurred_at | **append-only trigger**; derived/rebuildable projection |

## 9. Maintenance

| Table | Key columns | Constraints / indexes |
|---|---|---|
| `maintenance_tasks` | id, agency_id→, vehicle_id→, kind, scheduled_window_id→, status (PLANNED/IN_PROGRESS/DONE/CANCELLED), assigned_to→, notes | idx(vehicle_id, status) |
| `maintenance_records` | id, agency_id→, vehicle_id→, task_id→ null, performed_at, garage (INTERNAL/EXTERNAL), garage_name, cost_amount, cost_currency, mileage_km, downtime_hours, documents jsonb (object keys) | idx(vehicle_id, performed_at) |

## 10. Telematics (schema lands with Phase 11; contract fixed now)

| Table | Key columns | Constraints / indexes |
|---|---|---|
| `gps_devices` | id, agency_id→, provider, external_id, vehicle_id→, binding history | unique(provider, external_id) |
| `gps_positions` | id, device_id→, fix_at, geo point, speed_kmh, heading, valid bool | BRIN(fix_at); partitioned by month when volume demands |
| `telematics_events` | id, agency_id→, device_id→, event_type, payload jsonb, occurred_at, provider_message_id | **append-only trigger**; unique(provider, provider_message_id) — idempotent ingestion |
| `geofences` | id, agency_id→, name, kind (BRANCH/AIRPORT/CUSTOM/BORDER), geometry | GIST index |

## 11. Alerts, notifications, approvals, AI, snapshots

| Table | Key columns | Constraints / indexes |
|---|---|---|
| `alert_rules` | id, agency_id (null = system rule), name, event_type, condition jsonb, severity, dedup_window_s, action_kind (NOTIFY/CREATE_TASK/REQUIRE_APPROVAL), enabled, version | idx(event_type, enabled) |
| `alerts` | id, agency_id→, rule_id→, dedup_key, severity, evidence jsonb, status (OPEN/ACKNOWLEDGED/RESOLVED/SUPPRESSED), assignee→, resolved_by→, resolution_note, created_at | unique(agency_id, dedup_key) within active window (partial idx); idx(agency_id, status, severity) |
| `approvals` | id, agency_id→, requested_action jsonb, requested_by→, decided_by→ null, decision null, decided_at, reason | idx(agency_id, decision) partial where decision is null |
| `notifications` | id, agency_id→, channel (IN_APP/SMS/WHATSAPP/EMAIL), template, payload jsonb, status (QUEUED/SENT/FAILED), provider_ref, integration_status_at_send | idx(status) partial |
| `ai_insights` | id, agency_id→, kind, question, answer jsonb (typed blocks), cited_records jsonb, confidence numeric, created_at | append-only; read-only source joins |
| `daily_ops_snapshots` | agency_id, branch_id, day (date), departures, returns, utilization_pct, expected_cash bigint, exception_counts jsonb, generated_at, rebuilt_from | pk(agency_id, branch_id, day) — materialized cache, rebuildable |
| `vehicle_day_facts` | agency_id, vehicle_id, day, state_intervals jsonb, revenue_amount, downtime_hours | pk(agency_id, vehicle_id, day) |

## 12. Testing hooks this design buys us

- Overlap prevention: concurrent reservation insertion test (two txns, one must fail with 23P01-classified error → mapped to 409).
- RLS: cross-tenant select/update/delete must return zero rows / raise.
- Append-only: UPDATE on payments/audit must raise.
- Idempotency: replaying an inspection/telematics client UUID must be a no-op.
- Numbering: concurrent blank-contract issuance must produce distinct, gapless-at-rest numbers.
