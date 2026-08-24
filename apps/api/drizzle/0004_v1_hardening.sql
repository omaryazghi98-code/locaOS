-- V1 hardening: enum state, RLS on new tenant tables, telematics immutability.

ALTER TYPE contract_status ADD VALUE IF NOT EXISTS 'GENERATED';
ALTER TYPE contract_status ADD VALUE IF NOT EXISTS 'SIGNATURE_REQUESTED';

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'vendors','maintenance_plans','maintenance_records','vehicle_transfers','telematics_devices',
    'telematics_events','vehicle_positions','documents','notification_outbox','signature_requests',
    'compliance_rules'
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

-- Telemetry is evidence: append-only (idempotent ingest via unique provider_message_id).
CREATE TRIGGER telematics_events_append_only
  BEFORE UPDATE OR DELETE ON telematics_events
  FOR EACH ROW EXECUTE FUNCTION locaos_block_mutation();
