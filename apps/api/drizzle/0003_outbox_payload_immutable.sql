-- Outbox: payload immutable, workflow state (processed_at) mutable.
-- (Full append-only was wrong for the relay — found by smoke test; ADR-0009 refinement.)
DROP TRIGGER IF EXISTS outbox_events_append_only ON outbox_events;

CREATE OR REPLACE FUNCTION locaos_outbox_guard() RETURNS trigger AS $$
BEGIN
  IF OLD.event_type <> NEW.event_type
     OR OLD.payload::text <> NEW.payload::text
     OR OLD.agency_id <> NEW.agency_id
     OR OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'outbox_events payload is immutable (only processed_at may change)';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER outbox_events_payload_immutable
  BEFORE UPDATE ON outbox_events
  FOR EACH ROW EXECUTE FUNCTION locaos_outbox_guard();
