#!/usr/bin/env node
/**
 * Embedded PostgreSQL lifecycle (dev + CI; zero Docker). Debian mirrors are unreachable
 * in restricted environments, so the PG 17 binaries come from npm (@embedded-postgres —
 * ships only initdb/pg_ctl/postgres, so everything else uses the `pg` driver).
 * pg_ctl starts the server detached, logging to .pgdata/postgres.log.
 * Production uses a real PostgreSQL server — see docker-compose.yml.
 */
import { spawnSync, spawn } from 'node:child_process';
import { existsSync, writeFileSync, appendFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import pg from 'pg';

const MODE = process.argv[2] ?? 'status';
const ROOT = process.cwd();
const DIR = join(ROOT, '.pgdata');
const LOG = join(ROOT, '.pgdata', 'postgres.log');
const PORT = Number(process.env.PG_PORT ?? 5432);
const USER = 'locaos';
const PASSWORD = process.env.PG_PASSWORD ?? 'locaos';
const DATABASE = process.env.PG_DATABASE ?? 'locaos';

const NATIVE = join(ROOT, 'node_modules', '@embedded-postgres', 'linux-x64', 'native', 'bin');
const bin = (name) => join(NATIVE, name);

async function isPostgres() {
  const c = new pg.Client({ host: '127.0.0.1', port: PORT, user: USER, password: PASSWORD, database: 'postgres', connectionTimeoutMillis: 1500 });
  try { await c.connect(); await c.end(); return true; } catch { try { await c.end(); } catch {} return false; }
}

async function waitForPostgres(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPostgres()) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function ensureDatabase() {
  const c = new pg.Client({ host: '127.0.0.1', port: PORT, user: USER, password: PASSWORD, database: 'postgres' });
  await c.connect();
  const { rows } = await c.query('SELECT 1 FROM pg_database WHERE datname = $1', [DATABASE]);
  if (rows.length === 0) await c.query(`CREATE DATABASE ${DATABASE}`);
  await c.end();
}

if (MODE === 'start') {
  if (await isPostgres()) { console.log(`db: already running on :${PORT}`); process.exit(0); }
  if (!existsSync(join(DIR, 'PG_VERSION'))) {
    console.log('db: initialising cluster…');
    const pwfile = join(mkdtempSync(join(tmpdir(), 'locaos-pw-')), 'pw');
    writeFileSync(pwfile, PASSWORD);
    const init = spawnSync(bin('initdb'), ['-D', DIR, '-U', USER, '-A', 'password', `--pwfile=${pwfile}`, '-E', 'UTF8'], { encoding: 'utf8' });
    rmSync(join(pwfile, '..'), { recursive: true, force: true });
    if (init.status !== 0) { console.error(init.stdout, init.stderr); process.exit(1); }
    writeFileSync(join(DIR, 'pg_hba.conf'), `local all all trust\nhost all all 127.0.0.1/32 password\nhost all all ::1/128 password\n`);
    appendFileSync(join(DIR, 'postgresql.conf'),
      `\nport = ${PORT}\nlisten_addresses = '127.0.0.1'\nunix_socket_directories = '${DIR.replace(/'/g, "''")}'\n`);
  }
  const child = spawn(bin('pg_ctl'), ['-D', DIR, '-l', LOG, '-w', 'start'], { detached: true, stdio: 'ignore' });
  child.unref();
  if (!(await waitForPostgres())) { console.error('db: failed to start — see', LOG); process.exit(1); }
  await ensureDatabase();
  const r = spawnSync('node', [join(ROOT, 'scripts', 'provision-app-role.mjs')], {
    env: { ...process.env, DATABASE_URL: `postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DATABASE}` },
    stdio: 'inherit', cwd: ROOT,
  });
  if (r.status !== 0) process.exit(1);
  console.log(`db: ready — postgresql://${USER}:****@127.0.0.1:${PORT}/${DATABASE} (app: locaos_app)`);
  process.exit(0);
}

if (MODE === 'stop') {
  const r = spawnSync(bin('pg_ctl'), ['-D', DIR, '-m', 'fast', 'stop'], { encoding: 'utf8' });
  console.log(r.status === 0 ? 'db: stopped' : 'db: stop failed (not running?)');
  process.exit(0);
}

if (MODE === 'reset') {
  spawnSync(bin('pg_ctl'), ['-D', DIR, '-m', 'immediate', 'stop'], { encoding: 'utf8' });
  if (existsSync(DIR)) rmSync(DIR, { recursive: true, force: true });
  console.log('db: data directory removed');
  process.exit(0);
}

console.log((await isPostgres()) ? `db: running on :${PORT}` : 'db: not running');
process.exit((await isPostgres()) ? 0 : 1);
