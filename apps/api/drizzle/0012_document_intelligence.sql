-- Document Intelligence foundation.
-- OCR/extraction output is evidence and never directly becomes canonical domain truth.

create table if not exists document_intakes (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  document_id uuid not null references documents(id),
  document_family text not null default 'UNKNOWN',
  status text not null default 'RECEIVED',
  provider text,
  provider_run_id text,
  source_sha256 text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_intakes_status_ck check (status in ('RECEIVED','CLASSIFIED','OCR_PENDING','OCR_COMPLETE','EXTRACTION_COMPLETE','VALIDATION_REQUIRED','READY_FOR_CONFIRMATION','CONFIRMED','REJECTED','FAILED')),
  constraint document_intakes_family_ck check (document_family in ('UNKNOWN','DRIVER_LICENSE','CIN','PASSPORT','RESIDENCE_PERMIT','VEHICLE_REGISTRATION','INSURANCE','TECHNICAL_INSPECTION','CONTRACT','INVOICE','RECEIPT','INSPECTION','OTHER'))
);

create unique index if not exists document_intakes_document_uq on document_intakes(agency_id, document_id);
create index if not exists document_intakes_queue_idx on document_intakes(agency_id, status, created_at);

create table if not exists document_extraction_runs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  intake_id uuid not null references document_intakes(id),
  provider text not null,
  provider_run_id text,
  status text not null default 'STARTED',
  raw_text text,
  provider_metadata jsonb,
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint document_extraction_runs_status_ck check (status in ('STARTED','SUCCEEDED','FAILED'))
);

create index if not exists document_extraction_runs_intake_idx on document_extraction_runs(agency_id, intake_id, created_at);

create table if not exists document_extracted_fields (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  extraction_run_id uuid not null references document_extraction_runs(id),
  field_key text not null,
  value_text text,
  confidence numeric(5,4),
  source_region jsonb,
  validation_status text not null default 'UNREVIEWED',
  confirmed_value text,
  confirmed_by uuid,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint document_extracted_fields_validation_ck check (validation_status in ('UNREVIEWED','VALID','INVALID','CONFIRMED','REJECTED')),
  constraint document_extracted_fields_confidence_ck check (confidence is null or (confidence >= 0 and confidence <= 1))
);

create index if not exists document_extracted_fields_run_idx on document_extracted_fields(agency_id, extraction_run_id, field_key);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['document_intakes','document_extraction_runs','document_extracted_fields']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I FOR ALL
      USING (agency_id = NULLIF(current_setting('app.agency_id', true), '')::uuid)
      WITH CHECK (agency_id = NULLIF(current_setting('app.agency_id', true), '')::uuid)
    $f$, t);
  END LOOP;
END $$;
