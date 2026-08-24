-- V1 hardening pass: transfer recommendation dedup under concurrency.
CREATE UNIQUE INDEX vehicle_transfers_active_uq
  ON vehicle_transfers (reservation_id)
  WHERE status IN ('RECOMMENDED','APPROVED','IN_PROGRESS');
