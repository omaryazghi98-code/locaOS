#!/usr/bin/env node
/**
 * Provision the application role: NON-superuser, subject to RLS (ADR-0003 second wall).
 * The bootstrap role owns the schema and runs migrations; the API connects as this role.
 * Idempotent — run after migrations on any environment.
 */
import pg from 'pg';

const url = process.env.DATABASE_URL;
const APP_USER = process.env.PG_APP_USER ?? 'locaos_app';
const APP_PASSWORD = process.env.PG_APP_PASSWORD ?? 'locaos_app';
if (!url) { console.error('DATABASE_URL required'); process.exit(1); }

// connect as the role in DATABASE_URL (must be the privileged/owner role)
const c = new pg.Client({ connectionString: url });
await c.connect();
await c.query(`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_USER}') THEN
    CREATE ROLE ${APP_USER} LOGIN PASSWORD '${APP_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
  ELSE
    ALTER ROLE ${APP_USER} WITH LOGIN PASSWORD '${APP_PASSWORD}' NOSUPERUSER;
  END IF;
END $$`);
const dbName = (await c.query('select current_database() as d')).rows[0].d;
await c.query(`GRANT CONNECT ON DATABASE "${dbName}" TO ${APP_USER}`);
await c.query('GRANT USAGE ON SCHEMA public TO ' + APP_USER);
await c.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_USER}`);
await c.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${APP_USER}`);
await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_USER}`);
await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${APP_USER}`);
await c.end();
console.log(`provision: app role '${APP_USER}' ready (non-superuser → RLS enforced)`);
