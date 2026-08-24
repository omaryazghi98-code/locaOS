-- locaOS migration 0001 — hardening (hand-reviewed SQL, ADR-0002/0003/0008/0010)
-- Extensions
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Tenant isolation: RLS as the second wall (first wall = app-layer scoping) ──
-- FORCE applies policies even to the table owner (single-role deployment).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'branches','audit_events','customers','identity_documents','customer_flags',
    'consent_records','vehicle_categories','vehicle_models','vehicles','vehicle_state_transitions',
    'vehicle_documents','maintenance_windows','compliance_rule_sets','reservations','quotes',
    'contract_sequences','contract_templates','contracts','contract_versions','contract_amendments',
    'inspections','inspection_photos','damages','payments','deposits','deposit_charges',
    'cash_sessions','cleaning_tasks','alert_rules','alerts','approvals','outbox_events'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I FOR ALL
      USING (agency_id = NULLIF(current_setting('app.agency_id', true), '')::uuid)
      WITH CHECK (agency_id = NULLIF(current_setting('app.agency_id', true), '')::uuid)
    $f$, t, t);
  END LOOP;
END $$;

-- ─── Append-only integrity (ADR-0008/0011): corrections are new rows, never edits ──
CREATE OR REPLACE FUNCTION locaos_block_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only — % is not permitted (use a reversal/correction row)',
    TG_TABLE_NAME, TG_OP;
END $$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'payments','audit_events','contract_versions','vehicle_state_transitions','outbox_events'
  ]
  LOOP
    EXECUTE format('CREATE TRIGGER %I_append_only BEFORE UPDATE OR DELETE ON %I
                    FOR EACH ROW EXECUTE FUNCTION locaos_block_mutation()', t, t);
  END LOOP;
END $$;

-- ─── Conflict-proof availability: no overlapping ACTIVE reservations per vehicle ──
-- (btree_gist; the application maps 23P01-class errors to HTTP 409 with conflict details)
ALTER TABLE reservations ADD CONSTRAINT reservations_no_overlap_active
  EXCLUDE USING gist (
    vehicle_id WITH =,
    tstzrange(pickup_at, return_at) WITH &&
  ) WHERE (vehicle_id IS NOT NULL AND status IN ('DRAFT','CONFIRMED','VEHICLE_ASSIGNED','READY','IN_PROGRESS'));

-- Maintenance windows block the same vehicle in the same way.
ALTER TABLE maintenance_windows ADD CONSTRAINT maintenance_windows_no_overlap
  EXCLUDE USING gist (
    vehicle_id WITH =,
    tstzrange(window_start, window_end) WITH &&
  );

-- Reservations may not overlap an active maintenance window on the same vehicle.
-- (Cross-table exclusion constraints don't exist in PG; enforced by an advisory-lock
--  trigger guard on both tables — same guarantee, same LOCAOS_CONFLICT error class.)
CREATE OR REPLACE FUNCTION locaos_guard_reservation_vs_maintenance() RETURNS trigger AS $$
DECLARE v uuid; s timestamptz; e timestamptz; conflict text;
BEGIN
  v := NEW.vehicle_id; s := NEW.pickup_at; e := NEW.return_at;
  IF v IS NULL THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('vehicle:' || v, 0));
  SELECT mw.kind || ' [' || mw.window_start || ' → ' || mw.window_end || ']' INTO conflict
    FROM maintenance_windows mw
    WHERE mw.vehicle_id = v AND tstzrange(mw.window_start, mw.window_end) && tstzrange(s, e)
    LIMIT 1;
  IF conflict IS NOT NULL THEN
    RAISE EXCEPTION 'LOCAOS_CONFLICT:MAINTENANCE:%', conflict USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER reservations_maintenance_guard
  BEFORE INSERT OR UPDATE OF vehicle_id, pickup_at, return_at, status ON reservations
  FOR EACH ROW EXECUTE FUNCTION locaos_guard_reservation_vs_maintenance();

CREATE OR REPLACE FUNCTION locaos_guard_maintenance_vs_reservations() RETURNS trigger AS $$
DECLARE conflict text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('vehicle:' || NEW.vehicle_id, 0));
  SELECT r.reference || ' (' || r.status || ')' INTO conflict
    FROM reservations r
    WHERE r.vehicle_id = NEW.vehicle_id
      AND r.status IN ('DRAFT','CONFIRMED','VEHICLE_ASSIGNED','READY','IN_PROGRESS')
      AND tstzrange(r.pickup_at, r.return_at) && tstzrange(NEW.window_start, NEW.window_end)
    LIMIT 1;
  IF conflict IS NOT NULL THEN
    RAISE EXCEPTION 'LOCAOS_CONFLICT:RESERVATION:%', conflict USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER maintenance_reservations_guard
  BEFORE INSERT OR UPDATE OF vehicle_id, window_start, window_end ON maintenance_windows
  FOR EACH ROW EXECUTE FUNCTION locaos_guard_maintenance_vs_reservations();

-- ─── Contract numbering: single per-agency authority (gap-auditable) ─────────────
-- Row-locked increment; the UPDATE ... RETURNING pattern is used by the API transaction.
ALTER TABLE contract_sequences ADD CONSTRAINT contract_sequences_next_positive CHECK (next_value > 0);

-- ─── Alerts: dedup uniqueness already enforced by unique(agency_id, dedup_key) ────
-- Partial index for the open-alert work queue.
CREATE INDEX alerts_open_queue ON alerts (agency_id, severity, created_at) WHERE status IN ('OPEN','ACKNOWLEDGED');

-- ─── Cash session integrity ──────────────────────────────────────────────────────
ALTER TABLE cash_sessions ADD CONSTRAINT cash_sessions_one_open_per_branch
  EXCLUDE USING gist (
    branch_id WITH =,
    tstzrange(opened_at, COALESCE(closed_at, 'infinity'::timestamptz)) WITH &&
  ) WHERE (status = 'OPEN');

-- ─── Payment integrity checks ────────────────────────────────────────────────────
ALTER TABLE payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);
ALTER TABLE payments ADD CONSTRAINT payments_fx_required
  CHECK (currency = 'MAD' OR (fx_rate IS NOT NULL AND fx_rate > 0 AND mad_equivalent IS NOT NULL));
ALTER TABLE payments ADD CONSTRAINT payments_refund_links
  CHECK (method <> 'REFUND' OR (direction = 'OUT' AND reverses_payment_id IS NOT NULL));
