import pg from 'pg';
import { createHash } from 'node:crypto';

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://locaos:locaos@127.0.0.1:5432/locaos';
const DAY_MS = 86_400_000;

function rentalDays(pickupAt, returnAt) {
  const diff = new Date(returnAt).getTime() - new Date(pickupAt).getTime();
  if (!Number.isFinite(diff) || diff <= 0) throw new Error('Invalid rental period in demo data');
  return Math.max(1, Math.ceil(diff / DAY_MS));
}

const money = (value) => value == null ? null : String(Number(value) / 100);
const contentHash = (content) => createHash('sha256').update(JSON.stringify(content)).digest('hex');

const client = new Client({ connectionString: DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query(`
    select
      c.id as contract_id,
      c.current_version_id,
      c.agency_id,
      r.pickup_at,
      r.return_at,
      q.id as quote_id,
      q.version as quote_version,
      q.days,
      q.subtotal,
      q.discount,
      q.total,
      q.inputs,
      a.currency as agency_currency
    from contracts c
    join reservations r on r.id = c.reservation_id
    join quotes q on q.id = r.quote_id
    join agencies a on a.id = c.agency_id
    where c.current_version_id is not null
  `);

  let repaired = 0;
  for (const row of rows) {
    const derivedDays = rentalDays(row.pickup_at, row.return_at);
    const quoteDays = Number(row.days);
    if (quoteDays !== derivedDays) {
      throw new Error(
        `Quote/reservation duration mismatch for contract ${row.contract_id}: quote=${quoteDays}, derived=${derivedDays}`,
      );
    }

    const versionResult = await client.query(
      'select content, version from contract_versions where id = $1',
      [row.current_version_id],
    );
    if (!versionResult.rows[0]) continue;

    const content = structuredClone(versionResult.rows[0].content);
    content.period = {
      ...content.period,
      pickupAt: new Date(row.pickup_at).toISOString(),
      returnAt: new Date(row.return_at).toISOString(),
      days: String(derivedDays),
    };
    content.pricing = {
      ...content.pricing,
      subtotal: money(row.subtotal),
      dailyRate: row.inputs?.dailyRate != null ? String(Number(row.inputs.dailyRate) / 100) : content.pricing.dailyRate,
      days: String(derivedDays),
      discount: money(row.discount),
      total: money(row.total),
      currency: row.agency_currency ?? content.pricing.currency ?? 'MAD',
    };
    content.snapshot = {
      ...(content.snapshot ?? {}),
      capturedAt: new Date().toISOString(),
      quoteId: row.quote_id,
      quoteVersion: String(row.quote_version),
    };

    const { rows: latestRows } = await client.query(
      'select coalesce(max(version), 0) as max_version from contract_versions where contract_id = $1',
      [row.contract_id],
    );
    const nextVersion = Number(latestRows[0]?.max_version ?? 0) + 1;
    const newVersionId = crypto.randomUUID();
    const hash = contentHash(content);

    await client.query('begin');
    try {
      await client.query(
        `insert into contract_versions
          (id, agency_id, contract_id, version, content, content_hash, created_by, created_at)
         select $1, agency_id, contract_id, $2, $3::jsonb, $4, created_by, now()
         from contract_versions where id = $5`,
        [newVersionId, nextVersion, JSON.stringify(content), hash, row.current_version_id],
      );
      await client.query(
        'update contracts set current_version_id = $1, updated_at = now() where id = $2',
        [newVersionId, row.contract_id],
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    }

    repaired += 1;
  }

  console.log(`demo-contract-repair: ${repaired} contract snapshot(s) synchronized via immutable versions.`);
} finally {
  await client.end();
}
