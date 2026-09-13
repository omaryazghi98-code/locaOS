-- Operations tasks are tenant data and must have the same RLS wall as the rest of the rental domain.
ALTER TABLE operations_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations_tasks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON operations_tasks;
CREATE POLICY tenant_isolation ON operations_tasks FOR ALL
  USING (agency_id = NULLIF(current_setting('app.agency_id', true), '')::uuid)
  WITH CHECK (agency_id = NULLIF(current_setting('app.agency_id', true), '')::uuid);

-- Task mutation is its own capability. Keep fleet:write for fleet-state mutations;
-- operations work should not require broad fleet write permission.
INSERT INTO role_permissions (agency_id, role_key, permission_key)
SELECT a.id, r.role_key, 'ops:write'
FROM agencies a
CROSS JOIN (VALUES ('owner'), ('manager'), ('agent'), ('field_agent'), ('mechanic')) AS r(role_key)
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.agency_id = a.id AND rp.role_key = r.role_key AND rp.permission_key = 'ops:write'
);
