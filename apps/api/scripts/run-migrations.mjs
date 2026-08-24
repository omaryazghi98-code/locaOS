#!/usr/bin/env node
/**
 * Minimal, explicit migration runner: applies .sql files in ./drizzle in filename order,
 * tracking applied migrations in the _migrations table. Forward-only (§22).
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '..', 'drizzle');
const url = process.env.DATABASE_URL ?? 'postgresql://locaos:locaos@127.0.0.1:5432/locaos';

const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query(`CREATE TABLE IF NOT EXISTS _migrations (
  name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);

const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
const { rows } = await client.query('SELECT name FROM _migrations');
const applied = new Set(rows.map((r) => r.name));

for (const file of files) {
  if (applied.has(file)) continue;
  const sql = await readFile(join(dir, file), 'utf8');
  console.log(`migration: applying ${file}`);
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(`migration FAILED: ${file}\n${e.message}`);
    process.exit(1);
  }
}
console.log(`migration: up to date (${applied.size} previously applied, ${files.length} total)`);
await client.end();
