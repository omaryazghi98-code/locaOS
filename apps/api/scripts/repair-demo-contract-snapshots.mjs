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
      r.pickup_at,
      r.return_at,
      q.id as quote_id,
      q.version as quote_version,
      q.days,
      q.subtotal,
      q.discount,
      q.total,
      q.currency,
      q.inputs
    from contracts c
    join reservations r on r.id = c.reservation_id
    join quotes q on q.id = r.quote_id
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
      'select content from contract_versions where id = $1 for update',
      [row.current_version_id],
    );
    if (!versionResult.rows[0]) continue;

    const content = versionResult.rows[0].content;
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
      currency: row.currency ?? content.pricing.currency ?? 'MAD',
    };
    content.snapshot = {
      ...(content.snapshot ?? {}),
      quoteId: row.quote_id,
      quoteVersion: String(row.quote_version),
    };

    await client.query(
      'update contract_versions set content = $1::jsonb, content_hash = $2 where id = $3',
      [JSON.stringify(content), contentHash(content), row.current_version_id],
    );
    repaired += 1;
  }

  console.log(`demo-contract-repair: ${repaired} contract snapshot(s) synchronized from rental logic.`);
} finally {
  await client.end();
}
