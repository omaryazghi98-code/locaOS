// BigInt → string in every JSON response (money in centimes). Loaded with the app module.
(BigInt.prototype as unknown as { toJSON?: () => string }).toJSON = function (this: bigint) {
  return this.toString();
};

import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import * as schema from './schema';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://locaos:locaos@127.0.0.1:5432/locaos',
  max: 10,
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Tenant transaction wrapper — the FIRST wall of isolation (ADR-0003).
 * Sets app.agency_id for the transaction; RLS policies are the second wall.
 * Every tenant read/write must pass through here.
 */
export async function withTenant<T>(agencyId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.agency_id', ${agencyId}, true)`);
    return fn(tx);
  });
}

/** Platform-level transaction (no tenant context) — auth/session/plumbing only. */
export async function withPlatform<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}
