#!/usr/bin/env node
/**
 * CI/test wrapper: ensures the embedded Postgres is up, (re)creates the locaos_test
 * database, applies migrations, builds the API, then runs the vitest suite against it.
 * Also usable locally: `node scripts/test-db.mjs`
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const TEST_DB = process.env.PG_TEST_DATABASE ?? 'locaos_test';
const BASE_URL = process.env.DATABASE_URL ?? 'postgresql://locaos:locaos@127.0.0.1:5432/locaos';
const TEST_URL = BASE_URL.replace(/\/[\^/]+$/, `/${TEST_DB}`);

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const run = (cmd, args, opts = {}) => {
  const executable = cmd === 'pnpm' ? pnpmCommand : cmd;
  const r = spawnSync(executable, args, { stdio: 'inherit', cwd: root, ...opts });
  if (r.error) {
    console.error(`test-db: failed to launch ${executable}:`, r.error.message);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
};

// 1) postgres up
run('node', ['scripts/db.mjs', 'start']);

// 2) recreate test db
const admin = new pg.Client({ connectionString: BASE_URL.replace(/\/[\^/]+$/, '/postgres') });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
await admin.query(`CREATE DATABASE ${TEST_DB}`);
await admin.end();

// 3) migrate + build
run('node', ['apps/api/scripts/run-migrations.mjs'], { env: { ...process.env, DATABASE_URL: TEST_URL } });
run('node', ['scripts/provision-app-role.mjs'], { env: { ...process.env, DATABASE_URL: TEST_URL } });
run('pnpm', ['--filter', '@locaos/domain', 'build']);
run('pnpm', ['--filter', '@locaos/api', 'build']);

// 4) run tests against the test db
const APP_TEST_URL = TEST_URL.replace('locaos:locaos@', 'locaos_app:locaos_app@');
run('pnpm', ['--filter', '@locaos/api', 'test'], {
  env: { ...process.env, DATABASE_URL: APP_TEST_URL, ENABLE_SCHEDULER: 'false', SESSION_SECRET: 'test-secret' },
});
