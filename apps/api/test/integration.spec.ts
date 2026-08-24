/**
 * Phase 1 integration suite — boots the real NestJS app (compiled dist) against a real
 * PostgreSQL test database. Asserts the non-negotiables: tenancy (app + RLS), RBAC,
 * conflict-proof availability, append-only finance, state-machine guards, blank-contract
 * lifecycle, inspection idempotency, cash reconciliation, alert engine.
 */
import { describe, beforeAll, afterAll, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { hash } from '@node-rs/argon2';
import request from 'supertest';
import pg from 'pg';
import { sql } from 'drizzle-orm';
import { AppModule } from '../dist/app.module.js';
import { db } from '../dist/db/client.js';
import { runAllChecks } from '../dist/modules/alerts/scheduler.js';
import { transitionVehicle } from '../dist/modules/fleet/fleet.service.js';
import { withTenant } from '../dist/db/client.js';
import { PERMISSIONS, ROLE_MATRIX } from '@locaos/domain';

process.env.DATABASE_URL ??= 'postgresql://locaos:locaos@127.0.0.1:5432/locaos_test';
process.env.SESSION_SECRET = 'test-secret';
process.env.ENABLE_SCHEDULER = 'false';

let app: INestApplication;
let server: any;
const TEST_PW = 'test-pass-1';

// helpers ---------------------------------------------------------------
const api = () => request(server);
const login = async (email: string) => {
  const res = await api().post('/api/auth/login').send({ email, password: TEST_PW });
  expect(res.status).toBe(200);
  return res.headers['set-cookie']!.map((c: string) => c.split(';')[0]).join('; ');
};

let A: Agency, B: Agency; // two tenants
const seedClient = new pg.Client({ connectionString: process.env.DATABASE_URL });
const tenantExec = async (agencyId: string, q: string) => {
  await seedClient.query(`select set_config('app.agency_id', '${agencyId}', false)`);
  return seedClient.query(q);
};
interface Agency {
  id: string; ownerCookie: string; fieldCookie: string; branchId: string; categoryId: string;
  customerId: string; vehicleId: string; vehicle2Id: string; ownerId: string; fieldId: string;
}

async function seedAgency(name: string): Promise<Agency> {
  const email = (p: string) => `${p}@${name.toLowerCase()}.test`;
  const pwd = await hash(TEST_PW);
  const agencyId = (await seedClient.query(`insert into agencies (legal_name, contract_prefix) values ('${name} SARL','T') returning id`)).rows[0].id as string;
  const branchId = (await tenantExec(agencyId, `insert into branches (agency_id, name, city) values ('${agencyId}','Agence ${name}','Casablanca') returning id`)).rows[0].id as string;
  const ownerId = (await seedClient.query(`insert into users (email, full_name, password_hash) values ('${email('owner')}','Owner ${name}','${pwd}') returning id`)).rows[0].id as string;
  const fieldId = (await seedClient.query(`insert into users (email, full_name, password_hash) values ('${email('field')}','Field ${name}','${pwd}') returning id`)).rows[0].id as string;
  await seedClient.query(`insert into memberships (user_id, agency_id, role_key) values ('${ownerId}','${agencyId}','owner'), ('${fieldId}','${agencyId}','field_agent')`);
  const perms = (ROLE_MATRIX.owner as readonly string[]).map((p) => `('${agencyId}','owner','${p}')`).join(',');
  await seedClient.query(`insert into role_permissions (agency_id, role_key, permission_key) values ${perms}`);
  await seedClient.query(`insert into contract_sequences (agency_id, next_value) values ('${agencyId}', 1)`);
  const categoryId = (await tenantExec(agencyId, `insert into vehicle_categories (agency_id, code, name, default_daily_rate, floor_daily_rate, default_deposit) values ('${agencyId}', 'ECO', 'Economique', 30000, 25000, 400000) returning id`)).rows[0].id;
  const modelId = (await tenantExec(agencyId, `insert into vehicle_models (agency_id, make, model, year, fuel_type) values ('${agencyId}','Dacia','Sandero',2025,'PETROL') returning id`)).rows[0].id;
  const plate1 = name === 'AgenceA' ? '11111-A-6' : '22222-B-1';
  const plate2 = name === 'AgenceA' ? '33333-A-6' : '44444-B-1';
  const vin1 = name === 'AgenceA' ? 'VIN11111111111111' : 'VIN22222222222222';
  const vin2 = name === 'AgenceA' ? 'VIN33333333333333' : 'VIN44444444444444';
  const vehicleId = (await tenantExec(agencyId, `insert into vehicles (agency_id, category_id, model_id, plate, vin, current_branch_id) values ('${agencyId}','${categoryId}','${modelId}','${plate1}','${vin1}','${branchId}') returning id`)).rows[0].id;
  const vehicle2Id = (await tenantExec(agencyId, `insert into vehicles (agency_id, category_id, model_id, plate, vin, current_branch_id) values ('${agencyId}','${categoryId}','${modelId}','${plate2}','${vin2}','${branchId}') returning id`)).rows[0].id;
  const customerId = (await tenantExec(agencyId, `insert into customers (agency_id, first_name, last_name, phone) values ('${agencyId}','Client','${name}','+2126${name === 'AgenceA' ? '10000001' : '20000002'}') returning id`)).rows[0].id;
  return {
    id: agencyId, ownerCookie: await login(email('owner')), fieldCookie: await login(email('field')),
    branchId, categoryId, customerId, vehicleId, vehicle2Id, ownerId, fieldId,
  };
}

// suite ---------------------------------------------------------------
beforeAll(async () => {
  await seedClient.connect();
  app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  server = app.getHttpServer();
  A = await seedAgency('AgenceA');
  B = await seedAgency('AgenceB');
});

afterAll(async () => {
  await app.close();
  await seedClient.end();
});

describe('authn/authz', () => {
  it('rejects wrong credentials', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'owner@agencea.test', password: 'wrong' });
    expect(res.status).toBe(401);
  });
  it('requires a session', async () => {
    expect((await api().get('/api/fleet/vehicles')).status).toBe(401);
  });
  it('field_agent cannot create customers (RBAC)', async () => {
    const res = await api().post('/api/customers').set('cookie', A.fieldCookie)
      .send({ phone: '+212611122233', firstName: 'X', lastName: 'Y' });
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).toContain('customers:write');
  });
  it('me returns agency context + permissions', async () => {
    const res = await api().get('/api/auth/me').set('cookie', A.ownerCookie);
    expect(res.status).toBe(200);
    expect(res.body.active.agencyName).toContain('AgenceA');
    expect(res.body.active.permissions).toContain('fleet:write');
  });
});

describe('tenant isolation (two walls)', () => {
  it('agency A never sees agency B customers (app wall)', async () => {
    const res = await api().get('/api/customers').set('cookie', A.ownerCookie);
    expect(res.status).toBe(200);
    expect(res.body.every((c: { phone: string }) => c.phone.endsWith('000001'))).toBe(true);
  });
  it('direct cross-tenant fetch by id → 404', async () => {
    const res = await api().get(`/api/customers/${B.customerId}`).set('cookie', A.ownerCookie);
    expect(res.status).toBe(404);
  });
  it('RLS wall: cross-tenant rows invisible and cross-tenant writes rejected', async () => {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(`select set_config('app.agency_id', '${A.id}', false)`);
    const rows = await client.query('select count(*)::int as n from customers where phone like $1', ['%000002']);
    expect(rows.rows[0].n).toBe(0); // B's customer invisible to A's context
    await client.query(`select set_config('app.agency_id', '${A.id}', false)`);
    // B's row is invisible to A's context: scoped update touches 0 rows
    const upd = await client.query('update customers set first_name = $1 where id = $2', ['HACK', B.customerId]);
    expect(upd.rowCount).toBe(0);
    // writing a row for B's agency under A's context violates WITH CHECK
    const bad = await client.query(`update customers set agency_id = '${B.id}' where phone like '%000001'`).catch((e: Error) => e);
    expect((bad as Error).message).toContain('row-level security');
    await client.end();
  });
});

describe('reservations — conflict-proof availability', () => {
  const base = (a: Agency, over: Partial<Record<string, unknown>> = {}) => ({
    customerId: a.customerId, categoryId: a.categoryId, vehicleId: a.vehicleId,
    branchOutId: a.branchId, branchInId: a.branchId,
    pickupAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    returnAt: new Date(Date.now() + 6 * 86400000).toISOString(),
    dailyRate: '300', ...over,
  });

  it('creates with quote', async () => {
    const res = await api().post('/api/reservations').set('cookie', A.ownerCookie).send(base(A));
    expect(res.status).toBe(201);
    expect(res.body.quote.total).toBe('90000'); // 300.00 MAD/j × 3 j
    expect(res.body.reservation.status).toBe('VEHICLE_ASSIGNED');
  });

  it('rejects overlapping booking for the same vehicle (DB exclusion constraint → 409)', async () => {
    const res = await api().post('/api/reservations').set('cookie', A.ownerCookie)
      .send(base(A, { pickupAt: new Date(Date.now() + 4 * 86400000).toISOString(), returnAt: new Date(Date.now() + 5 * 86400000).toISOString() }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RESERVATION_CONFLICT');
  });

  it('allows a different vehicle or non-overlapping window', async () => {
    const ok1 = await api().post('/api/reservations').set('cookie', A.ownerCookie)
      .send(base(A, { vehicleId: A.vehicle2Id }));
    expect(ok1.status).toBe(201);
    const ok2 = await api().post('/api/reservations').set('cookie', A.ownerCookie)
      .send(base(A, { pickupAt: new Date(Date.now() + 10 * 86400000).toISOString(), returnAt: new Date(Date.now() + 12 * 86400000).toISOString() }));
    expect(ok2.status).toBe(201);
  });

  it('rejects reservations overlapping a maintenance window (LOCAOS_CONFLICT → 409)', async () => {
    await tenantExec(A.id, `insert into maintenance_windows (agency_id, vehicle_id, window_start, window_end, kind, note)
      values ('${A.id}', '${A.vehicle2Id}', now() + interval '30 days', now() + interval '32 days', 'PLANNED', 'revision')`);
    const res = await api().post('/api/reservations').set('cookie', A.ownerCookie)
      .send(base(A, { vehicleId: A.vehicle2Id, pickupAt: new Date(Date.now() + 31 * 86400000).toISOString(), returnAt: new Date(Date.now() + 33 * 86400000).toISOString() }));
    expect(res.status).toBe(409);
  });
});

describe('vehicle state machine', () => {
  it('rejects illegal user transitions', async () => {
    const res = await api().post(`/api/fleet/vehicles/${A.vehicleId}/transition`).set('cookie', A.ownerCookie)
      .send({ to: 'RENTED' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNKNOWN_TRANSITION');
  });
  it('rejects missing reason for exceptional states', async () => {
    const res = await api().post(`/api/fleet/vehicles/${A.vehicleId}/transition`).set('cookie', A.ownerCookie)
      .send({ to: 'MAINTENANCE' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('REASON_REQUIRED');
  });
  it('legal interrupt + explicit exit, all audited', async () => {
    const inMaintenance = await api().post(`/api/fleet/vehicles/${A.vehicleId}/transition`).set('cookie', A.ownerCookie)
      .send({ to: 'MAINTENANCE', reason: 'révision test' });
    expect(inMaintenance.status).toBe(201);
    const back = await api().post(`/api/fleet/vehicles/${A.vehicleId}/transition`).set('cookie', A.ownerCookie)
      .send({ to: 'AVAILABLE', reason: 'terminé' });
    expect(back.status).toBe(201);
    const detail = await api().get(`/api/fleet/vehicles/${A.vehicleId}`).set('cookie', A.ownerCookie);
    expect(detail.body.transitions.length).toBeGreaterThanOrEqual(2);
    const audits = await tenantExec(A.id, `select count(*)::int as n from audit_events where entity_type='vehicle' and action='VEHICLE_TRANSITION'`);
    expect(Number(audits.rows[0].n)).toBeGreaterThanOrEqual(2);
  });
  it('service transitions validate through the domain layer (OVERDUE system-only)', async () => {
    await expect(withTenant(A.id, (tx) => transitionVehicle(tx, A.id, { vehicleId: A.vehicleId, to: 'OVERDUE', actorKind: 'USER', reason: 'x' })))
      .rejects.toThrow();
  });
});

describe('contracts — numbering, blank lifecycle, versions', () => {
  it('issues blank contracts with unique reserved numbers', async () => {
    const r1 = await api().post('/api/contracts/blank').set('cookie', A.ownerCookie).send({ language: 'fr' });
    const r2 = await api().post('/api/contracts/blank').set('cookie', A.ownerCookie).send({ language: 'ar' });
    expect(r1.status).toBe(201); expect(r2.status).toBe(201);
    expect(r1.body.number).not.toBe(r2.body.number);
  });

  it('reconciles a blank contract to a reservation keeping the SAME number', async () => {
    const blank = await api().post('/api/contracts/blank').set('cookie', A.ownerCookie).send({ language: 'fr' });
    const resv = await api().post('/api/reservations').set('cookie', A.ownerCookie).send({
      customerId: A.customerId, categoryId: A.categoryId, vehicleId: null,
      branchOutId: A.branchId, branchInId: A.branchId,
      pickupAt: new Date(Date.now() + 40 * 86400000).toISOString(),
      returnAt: new Date(Date.now() + 42 * 86400000).toISOString(), dailyRate: '300',
    });
    const rec = await api().post(`/api/contracts/blank/${blank.body.id}/reconcile`).set('cookie', A.ownerCookie)
      .send({ reservationId: resv.body.reservation.id });
    expect(rec.status).toBe(201);
    expect(rec.body.number).toBe(blank.body.number);
    expect(rec.body.status).toBe('DRAFT');
    expect(rec.body.customerId).toBe(A.customerId);
  });

  it('voiding requires a reason and leaves a visible trace', async () => {
    const blank = await api().post('/api/contracts/blank').set('cookie', A.ownerCookie).send({ language: 'fr' });
    const voided = await api().post(`/api/contracts/${blank.body.id}/void`).set('cookie', A.ownerCookie)
      .send({ reason: 'formulaire déchiré sur place' });
    expect(voided.status).toBe(201);
    expect(voided.body.status).toBe('VOIDED');
  });

  it('generates a populated contract from a reservation, signs, versions are immutable', async () => {
    const resv = await api().post('/api/reservations').set('cookie', A.ownerCookie).send({
      customerId: A.customerId, categoryId: A.categoryId, vehicleId: A.vehicle2Id,
      branchOutId: A.branchId, branchInId: A.branchId,
      pickupAt: new Date(Date.now() + 50 * 86400000).toISOString(),
      returnAt: new Date(Date.now() + 52 * 86400000).toISOString(), dailyRate: '300',
    });
    const gen = await api().post('/api/contracts/from-reservation').set('cookie', A.ownerCookie)
      .send({ reservationId: resv.body.reservation.id, language: 'fr' });
    expect(gen.status).toBe(201);
    const signed = await api().post(`/api/contracts/${gen.body.contract.id}/sign`).set('cookie', A.ownerCookie)
      .send({ customerName: 'Client AgenceA', gpsConsent: true });
    expect(signed.status).toBe(201);
    const detail = await api().get(`/api/contracts/${gen.body.contract.id}`).set('cookie', A.ownerCookie);
    expect(detail.body.versions.length).toBe(2); // draft + signed version
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(`select set_config('app.agency_id', '${A.id}', false)`);
    const upd = await client.query(`update contract_versions set content_hash='HACK'`).catch((e: Error) => e);
    expect((upd as Error).message).toContain('append-only');
    await client.end();
  });
});

describe('finance — append-only, multi-currency, refunds', () => {
  it('records a MAD payment', async () => {
    const res = await api().post('/api/finance/payments').set('cookie', A.ownerCookie)
      .send({ method: 'CASH', amount: '1500', currency: 'MAD' });
    expect(res.status).toBe(201);
  });
  it('rejects foreign currency without a human-confirmed FX rate', async () => {
    const res = await api().post('/api/finance/payments').set('cookie', A.ownerCookie)
      .send({ method: 'CASH', amount: '100', currency: 'EUR' });
    expect(res.status).toBe(400);
  });
  it('EUR payment with rate computes MAD equivalent', async () => {
    const res = await api().post('/api/finance/payments').set('cookie', A.ownerCookie)
      .send({ method: 'CASH', amount: '100', currency: 'EUR', fxRate: 10.85 });
    expect(res.status).toBe(201);
    expect(res.body.madEquivalent).toBe('108500'); // 100.00 EUR × 10.85
  });
  it('payments are append-only at the database level', async () => {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(`select set_config('app.agency_id', '${A.id}', false)`);
    const upd = await client.query('update payments set amount = 1').catch((e: Error) => e);
    expect((upd as Error).message).toContain('append-only');
    await client.end();
  });
  it('refund = linked reversal entry (never an edit)', async () => {
    const pay = await api().post('/api/finance/payments').set('cookie', A.ownerCookie)
      .send({ method: 'CASH', amount: '200', currency: 'MAD' });
    const refund = await api().post('/api/finance/refunds').set('cookie', A.ownerCookie)
      .send({ reversesPaymentId: pay.body.id, amount: '200', currency: 'MAD' });
    expect(refund.status).toBe(201);
    expect(refund.body.method).toBe('REFUND');
    expect(refund.body.reversesPaymentId).toBe(pay.body.id);
  });
});

describe('inspections — idempotent offline submissions', () => {
  it('same clientUuid is a no-op duplicate', async () => {
    const clientUuid = '99999999-9999-4999-8999-999999999999';
    const payload = { clientUuid, kind: 'DEPARTURE', vehicleId: A.vehicleId, mileageKm: 51000, fuelLevelPct: 80, checklist: { triangle: true }, customerAck: true, customerAckName: 'Client' };
    const first = await api().post('/api/inspections').set('cookie', A.ownerCookie).send(payload);
    const second = await api().post('/api/inspections').set('cookie', A.ownerCookie).send(payload);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.duplicate).toBe(true);
    expect(second.body.inspection.id).toBe(first.body.inspection.id);
  });
});

describe('cash reconciliation — the drawer', () => {
  it('open → payments attach → close computes variance exactly', async () => {
    const open = await api().post('/api/finance/cash-sessions/open').set('cookie', A.ownerCookie)
      .send({ branchId: A.branchId, openingBalance: '100' });
    expect(open.status).toBe(201);
    await api().post('/api/finance/payments').set('cookie', A.ownerCookie).send({ method: 'CASH', amount: '500', currency: 'MAD' });
    const before = await api().get('/api/finance/cash-sessions/current').set('cookie', A.ownerCookie);
    // expected = opening 100.00 + 500.00
    expect(before.body.expectedMAD).toBe('60000');
    // counted: exactly the expected in MAD denominations
    const close = await api().post(`/api/finance/cash-sessions/${before.body.session.id}/close`).set('cookie', A.ownerCookie)
      .send({ counted: { MAD: { '200': 2, '100': 2 }, EUR: {} }, fxRates: {}, varianceExplanation: undefined });
    expect(close.status).toBe(201);
    expect(close.body.varianceMAD).toBe('0');
    expect(close.body.status).toBe('CLOSED');
    // a variance case
    const open2 = await api().post('/api/finance/cash-sessions/open').set('cookie', A.ownerCookie)
      .send({ branchId: A.branchId, openingBalance: '0' });
    expect(open2.status).toBe(201);
    const close2 = await api().post(`/api/finance/cash-sessions/${open2.body.id}/close`).set('cookie', A.ownerCookie)
      .send({ counted: { MAD: { '50': 1 }, EUR: {} }, fxRates: {}, varianceExplanation: 'écart test' });
    expect(close2.body.varianceMAD).toBe('5000'); // counted 50.00 vs expected 0.00
  });
});

describe('alert engine — scheduled checks raise alerts', () => {
  it('doc expiry + blank aging checks create deduped alerts', async () => {
    await tenantExec(A.id, `insert into vehicle_documents (agency_id, vehicle_id, type, expires_at)
      values ('${A.id}', '${A.vehicleId}', 'VT', current_date + 10)`);
    await runAllChecks();
    const alerts = await api().get('/api/alerts?status=OPEN').set('cookie', A.ownerCookie);
    const vt = alerts.body.filter((x: { ruleKey: string }) => x.ruleKey === 'VT_EXPIRING');
    expect(vt.length).toBeGreaterThanOrEqual(1);
    // dedup: run again, same day → no new alert
    await runAllChecks();
    const again = await api().get('/api/alerts?status=OPEN').set('cookie', A.ownerCookie);
    expect(again.body.filter((x: { ruleKey: string }) => x.ruleKey === 'VT_EXPIRING').length).toBe(vt.length);
    // ack + resolve with note (audit)
    const ack = await api().post(`/api/alerts/${vt[0].id}/ack`).set('cookie', A.ownerCookie);
    expect(ack.status).toBe(201);
    const resolve = await api().post(`/api/alerts/${vt[0].id}/resolve`).set('cookie', A.ownerCookie)
      .send({ note: 'VT passée ce matin' });
    expect(resolve.body.status).toBe('RESOLVED');
  });
});

// ═══ V1 subsystems ═══════════════════════════════════════════════════════════════
describe('V1 — maintenance subsystem', () => {
  it('creates a plan and a record; costs and downtime recorded, plan progresses', async () => {
    const plan = await api().post('/api/maintenance/plans').set('cookie', A.ownerCookie)
      .send({ vehicleId: A.vehicleId, taskKind: 'OIL', basis: 'MILEAGE', intervalKm: 10000, lastDoneKm: 40000 });
    expect(plan.status).toBe(201);
    expect(plan.body.nextDueKm).toBe(50000);
    const rec = await api().post('/api/maintenance/records').set('cookie', A.ownerCookie)
      .send({ vehicleId: A.vehicleId, planId: plan.body.id, taskKind: 'OIL', mileageKm: 51000, partsCost: '600', laborCost: '200', downtimeHours: 4 });
    expect(rec.status).toBe(201);
    expect(rec.body.totalCost).toBe('80000');
    const plans = await api().get('/api/maintenance/plans').set('cookie', A.ownerCookie);
    const mine = plans.body.find((p: { id: string }) => p.id === plan.body.id);
    expect(mine.state).toBe('OK'); // record advanced the plan: next due 61000 at mileage 51000
  });
  it('deterministic detection raises MAINTENANCE_DUE for an overdue plan', async () => {
    // plan due in the past
    const plan = await api().post('/api/maintenance/plans').set('cookie', A.ownerCookie)
      .send({ vehicleId: A.vehicle2Id, taskKind: 'TIRES', basis: 'TIME', intervalDays: 7 });
    expect(plan.status).toBe(201);
    await tenantExec(A.id, `update maintenance_plans set next_due_at = now() - interval '1 day' where id = '${plan.body.id}'`);
    const { runV1Checks } = await import('../dist/modules/alerts/scheduler.v1.js');
    await withTenant(A.id, (tx) => runV1Checks(tx as never, A.id));
    const alerts = await api().get('/api/alerts?status=OPEN').set('cookie', A.ownerCookie);
    expect(alerts.body.some((x: { ruleKey: string }) => x.ruleKey === 'MAINTENANCE_DUE')).toBe(true);
  });
});

describe('V1 — telematics signals (DETECT → EXPLAIN → ALERT)', () => {
  it('ingest is idempotent; ghost movement raises a CRITICAL evidence-based alert', async () => {
    await tenantExec(A.id, `insert into telematics_devices (agency_id, provider, external_id, vehicle_id, status)
      values ('${A.id}', 'MOCK', 'TEST-DEV-1', '${A.vehicleId}', 'MOCK')`);
    const { ingestFix } = await import('../dist/modules/telematics/telematics.controller.js');
    const fix = (msgId: string, speed: number, minsAgo = 0) => ({
      deviceId: 'TEST-DEV-1', messageId: msgId, occurredAt: new Date(Date.now() - minsAgo * 60000).toISOString(),
      lat: 33.36, lng: -7.58, speedKmh: speed, ignitionOn: speed > 0,
    });
    // vehicle is AVAILABLE in these tests (never transitioned to RENTED) → moving = ghost
    const r1 = await ingestFix(A.id, fix('m1', 40, 4));
    const dup = await ingestFix(A.id, fix('m1', 40, 4));
    expect(r1.accepted).toBe(true);
    expect(dup.accepted).toBe(false); // idempotent
    await ingestFix(A.id, fix('m2', 55, 2));
    const { runV1Checks } = await import('../dist/modules/alerts/scheduler.v1.js');
    await withTenant(A.id, (tx) => runV1Checks(tx as never, A.id));
    const alerts = await api().get('/api/alerts?status=OPEN').set('cookie', A.ownerCookie);
    const ghost = alerts.body.find((x: { ruleKey: string }) => x.ruleKey === 'GHOST_MOVE');
    expect(ghost).toBeTruthy();
    expect(ghost.severity).toBe('CRITICAL');
    expect(ghost.message).toContain('vérifier avant toute conclusion'); // explains, never accuses
  });
});

describe('V1 — transfers (recommend, human executes)', () => {
  it('recommends a transfer for a cross-branch departure and executes it', async () => {
    // second branch for agency A
    const b2 = (await tenantExec(A.id, `insert into branches (agency_id, name, city) values ('${A.id}','Agence Nord','Rabat') returning id`)).rows[0].id;
    const resv = await api().post('/api/reservations').set('cookie', A.ownerCookie).send({
      customerId: A.customerId, categoryId: A.categoryId, vehicleId: A.vehicle2Id,
      branchOutId: b2, branchInId: b2,
      pickupAt: new Date(Date.now() + 20 * 3600000).toISOString(),
      returnAt: new Date(Date.now() + 22 * 3600000).toISOString(), dailyRate: '300',
    });
    expect(resv.status).toBe(201);
    const { runV1Checks } = await import('../dist/modules/alerts/scheduler.v1.js');
    await withTenant(A.id, (tx) => runV1Checks(tx as never, A.id));
    const list = await api().get('/api/transfers').set('cookie', A.ownerCookie);
    const mine = list.body.find((x: { t: { reservationId: string } }) => x.t.reservationId === resv.body.reservation.id);
    expect(mine).toBeTruthy(); // recommended, not auto-executed
    const exec = await api().post(`/api/transfers/${mine.t.id}/execute`).set('cookie', A.ownerCookie);
    expect(exec.status).toBe(201);
    expect(exec.body.status).toBe('DONE');
    const veh = await api().get(`/api/fleet/vehicles/${A.vehicle2Id}`).set('cookie', A.ownerCookie);
    expect(veh.body.vehicle.currentBranchId).toBe(b2); // branch updated by the human action
  });
});

describe('V1 — signature & messaging providers (honest modes)', () => {
  it('signature: mock creates PENDING only; completion is an explicit human action labeled SIMULATED', async () => {
    const { integrationStatuses } = await import('../dist/modules/integrations/providers.js');
    const statuses = integrationStatuses();
    expect(statuses.some((p: { kind: string; status: string }) => p.kind === 'SIGNATURE' && p.status === 'MOCK')).toBe(true);
    const resv = await api().post('/api/reservations').set('cookie', A.ownerCookie).send({
      customerId: A.customerId, categoryId: A.categoryId, vehicleId: null,
      branchOutId: A.branchId, branchInId: A.branchId,
      pickupAt: new Date(Date.now() + 60 * 86400000).toISOString(),
      returnAt: new Date(Date.now() + 62 * 86400000).toISOString(), dailyRate: '300',
    });
    const gen = await api().post('/api/contracts/from-reservation').set('cookie', A.ownerCookie)
      .send({ reservationId: resv.body.reservation.id, language: 'fr' });
    const req = await api().post(`/api/integrations/contracts/${gen.body.contract.id}/signature-request`)
      .set('cookie', A.ownerCookie).send({ signerName: 'Client Test' });
    expect(req.status).toBe(201);
    expect(req.body.mode).toBe('MOCK');
    expect(req.body.status).toBe('PENDING'); // never fakes success
    const done = await api().post(`/api/integrations/signature-requests/${req.body.requestId}/complete-mock`)
      .set('cookie', A.ownerCookie);
    expect(done.status).toBe(201);
    expect(done.body.note).toContain('SIMUL');
  });
  it('messaging: mock provider marks messages SIMULATED and never claims SENT', async () => {
    const send = await api().post('/api/integrations/messages').set('cookie', A.ownerCookie)
      .send({ toPhone: '+212600000001', template: 'RETURN_REMINDER', params: { name: 'Test', date: 'demain', branch: 'CMN' } });
    expect(send.status).toBe(201);
    expect(['SIMULATED']).toContain(send.body.status);
    const outbox = await api().get('/api/integrations/messages').set('cookie', A.ownerCookie);
    expect(outbox.body.some((m: { status: string }) => m.status === 'SIMULATED')).toBe(true);
  });
});

describe('V1 — unified documents + compliance registry', () => {
  it('uploads with metadata, serves signed URLs, denies cross-tenant access', async () => {
    const up = await api().post('/api/documents').set('cookie', A.ownerCookie)
      .attach('file', Buffer.from('%PDF-1.4 fake'), { filename: 'attestation.pdf', contentType: 'application/pdf' })
      .field('kind', 'INSURANCE').field('entityType', 'vehicle').field('entityId', A.vehicleId).field('label', 'Attestation test');
    expect(up.status).toBe(201);
    expect(up.body.url).toContain('/api/files/');
    const listA = await api().get('/api/documents?entityType=vehicle').set('cookie', A.ownerCookie);
    expect(listA.body.length).toBeGreaterThan(0);
    const listB = await api().get('/api/documents?entityType=vehicle').set('cookie', B.ownerCookie);
    expect(listB.body.length).toBe(0); // tenant isolation on documents
    // signed URL without signature is rejected
    const bare = await api().get(`/api/files/${encodeURIComponent(up.body.objectKey)}`);
    expect(bare.status).toBe(401);
  });
  it('compliance registry: source-labelled rules, toggling is audited, OFF by default', async () => {
    await tenantExec(A.id, `insert into compliance_rules (agency_id, key, label, source_ref, effective_date, config, enabled)
      values ('${A.id}', 'FLEET_MINIMUM', 'Flotte minimum (test)', 'source test registre #15', '2024-04-15', '{"minimum": 7}', false)`);
    const rules = await api().get('/api/compliance/rules').set('cookie', A.ownerCookie);
    const rule = rules.body.find((r: { key: string }) => r.key === 'FLEET_MINIMUM');
    expect(rule.enabled).toBe(false);
    expect(rule.sourceRef).toContain('registre'); // source is part of the record
    const on = await api().post('/api/compliance/rules/FLEET_MINIMUM/toggle').set('cookie', A.ownerCookie).send({ enabled: true });
    expect(on.body.enabled).toBe(true);
    const audits = await tenantExec(A.id, `select count(*)::int as n from audit_events where action='COMPLIANCE_RULE_TOGGLED'`);
    expect(Number(audits.rows[0].n)).toBeGreaterThanOrEqual(1);
  });
});

// ═══ V1 hardening pass ═══════════════════════════════════════════════════════════
describe('hardening — operational scenarios (fail safely + auditable)', () => {
  const mk = (over: Record<string, unknown> = {}) => ({
    customerId: A.customerId, categoryId: A.categoryId, vehicleId: A.vehicleId,
    branchOutId: A.branchId, branchInId: A.branchId,
    pickupAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    returnAt: new Date(Date.now() + 7 * 86400000).toISOString(), dailyRate: '300', ...over,
  });
  const FUTURE = 360 * 86400000;

  it('C: booking while vehicle is under an active contract fails safely (both DB walls)', async () => {
    const r1 = await api().post('/api/reservations').set('cookie', A.ownerCookie)
      .send(mk({ pickupAt: new Date(Date.now() + FUTURE + 30 * 86400000).toISOString(), returnAt: new Date(Date.now() + FUTURE + 32 * 86400000).toISOString() }));
    expect(r1.status).toBe(201);
    const gen = await api().post('/api/contracts/from-reservation').set('cookie', A.ownerCookie)
      .send({ reservationId: r1.body.reservation.id, language: 'fr' });
    await api().post(`/api/contracts/${gen.body.contract.id}/sign`).set('cookie', A.ownerCookie).send({ customerName: 'X Y' });
    await api().post(`/api/contracts/${gen.body.contract.id}/activate`).set('cookie', A.ownerCookie);
    const overlap = await api().post('/api/reservations').set('cookie', A.ownerCookie)
      .send(mk({ pickupAt: new Date(Date.now() + FUTURE + 31 * 86400000).toISOString(), returnAt: new Date(Date.now() + FUTURE + 33 * 86400000).toISOString() }));
    expect(overlap.status).toBe(409); // exclusion constraint and/or VEHICLE_STILL_OUT guard
    const after = await api().post('/api/reservations').set('cookie', A.ownerCookie)
      .send(mk({ pickupAt: new Date(Date.now() + FUTURE + 60 * 86400000).toISOString(), returnAt: new Date(Date.now() + FUTURE + 61 * 86400000).toISOString() }));
    expect(after.status).toBe(201);
  });

  it('D: vehicle replacement amendment keeps the contract, changes the vehicle, bumps a version', async () => {
    const r = await api().post('/api/reservations').set('cookie', A.ownerCookie)
      .send(mk({ pickupAt: new Date(Date.now() + FUTURE + 10 * 86400000).toISOString(), returnAt: new Date(Date.now() + FUTURE + 12 * 86400000).toISOString() }));
    const gen = await api().post('/api/contracts/from-reservation').set('cookie', A.ownerCookie).send({ reservationId: r.body.reservation.id, language: 'fr' });
    await api().post(`/api/contracts/${gen.body.contract.id}/sign`).set('cookie', A.ownerCookie).send({ customerName: 'Rem Client' });
    const am = await api().post(`/api/contracts/${gen.body.contract.id}/amendments`).set('cookie', A.ownerCookie)
      .send({ kind: 'VEHICLE_REPLACEMENT', reason: 'panne batterie', newVehicleId: A.vehicle2Id });
    expect(am.status).toBe(201);
    const detail = await api().get(`/api/contracts/${gen.body.contract.id}`).set('cookie', A.ownerCookie);
    expect(detail.body.contract.vehicleId).toBe(A.vehicle2Id);
    expect(detail.body.contract.status).toBe('AMENDED');
    expect(detail.body.versions.length).toBe(3); // draft + signed + amended
  });

  it('E: cancellation after payment keeps the immutable payment (auditable trail)', async () => {
    const r = await api().post('/api/reservations').set('cookie', A.ownerCookie)
      .send(mk({ pickupAt: new Date(Date.now() + FUTURE + 20 * 86400000).toISOString(), returnAt: new Date(Date.now() + FUTURE + 22 * 86400000).toISOString() }));
    const pay = await api().post('/api/finance/payments').set('cookie', A.ownerCookie)
      .send({ method: 'CASH', amount: '500', currency: 'MAD', reservationId: r.body.reservation.id });
    expect(pay.status).toBe(201);
    const cancel = await api().post(`/api/reservations/${r.body.reservation.id}/status`).set('cookie', A.ownerCookie)
      .send({ to: 'CANCELLED', reason: 'client a annulé' });
    expect(cancel.status).toBe(201);
    const stillThere = await api().get('/api/finance/payments').set('cookie', A.ownerCookie);
    expect(stillThere.body.some((p: { id: string }) => p.id === pay.body.id)).toBe(true);
  });

  it('F: concurrent conflicting vehicle transitions — exactly one wins', async () => {
    const [t1, t2] = await Promise.allSettled([
      api().post(`/api/fleet/vehicles/${A.vehicleId}/transition`).set('cookie', A.ownerCookie).send({ to: 'MAINTENANCE', reason: 'concurrent 1' }),
      api().post(`/api/fleet/vehicles/${A.vehicleId}/transition`).set('cookie', A.ownerCookie).send({ to: 'MAINTENANCE', reason: 'concurrent 2' }),
    ]);
    const codes = [t1, t2].map((t) => t.status === 'fulfilled' ? t.value.status : 'rejected');
    const ok = codes.filter((c) => c === 201).length;
    expect(ok).toBe(1); // the loser is rejected by the state machine on committed state
    // cleanup: restore
    const detail = await api().get(`/api/fleet/vehicles/${A.vehicleId}`).set('cookie', A.ownerCookie);
    if (detail.body.vehicle.operationalStatus === 'MAINTENANCE') {
      await api().post(`/api/fleet/vehicles/${A.vehicleId}/transition`).set('cookie', A.ownerCookie).send({ to: 'AVAILABLE', reason: 'test cleanup' });
    } else {
      await api().post(`/api/fleet/vehicles/${A.vehicleId}/transition`).set('cookie', A.ownerCookie).send({ to: 'AVAILABLE', reason: 'test cleanup' });
    }
  });
});

describe('hardening — financial boundaries', () => {
  it('refund exceeding the original payment is rejected', async () => {
    const pay = await api().post('/api/finance/payments').set('cookie', A.ownerCookie).send({ method: 'CASH', amount: '100', currency: 'MAD' });
    const tooBig = await api().post('/api/finance/refunds').set('cookie', A.ownerCookie)
      .send({ reversesPaymentId: pay.body.id, amount: '150', currency: 'MAD' });
    expect(tooBig.status).toBe(400);
    const ok = await api().post('/api/finance/refunds').set('cookie', A.ownerCookie)
      .send({ reversesPaymentId: pay.body.id, amount: '100', currency: 'MAD' });
    expect(ok.status).toBe(201);
    const overRest = await api().post('/api/finance/refunds').set('cookie', A.ownerCookie)
      .send({ reversesPaymentId: pay.body.id, amount: '1', currency: 'MAD' });
    expect(overRest.status).toBe(400); // cumulative refunds capped at original
  });
  it('payments cannot attach to BLANK_ISSUED or VOIDED contracts (no invisible paper finance)', async () => {
    const blank = await api().post('/api/contracts/blank').set('cookie', A.ownerCookie).send({ language: 'fr' });
    const res = await api().post('/api/finance/payments').set('cookie', A.ownerCookie)
      .send({ method: 'CASH', amount: '100', currency: 'MAD', contractId: blank.body.id });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('BLANK_ISSUED');
  });
  it('cash session variance cannot be overwritten (closing twice fails)', async () => {
    const open = await api().post('/api/finance/cash-sessions/open').set('cookie', A.ownerCookie).send({ branchId: A.branchId, openingBalance: '0' });
    const close = await api().post(`/api/finance/cash-sessions/${open.body.id}/close`).set('cookie', A.ownerCookie)
      .send({ counted: { MAD: { '10': 1 }, EUR: {} }, fxRates: {} });
    expect(close.status).toBe(201);
    expect(close.body.varianceMAD).toBe('1000');
    const again = await api().post(`/api/finance/cash-sessions/${open.body.id}/close`).set('cookie', A.ownerCookie)
      .send({ counted: { MAD: {}, EUR: {} }, fxRates: {}, varianceExplanation: 'tentative d’écrasement' });
    expect(again.status).toBeGreaterThanOrEqual(400);
  });
});

describe('hardening — tenant isolation sweep (API + RLS)', () => {
  it('every V1 surface returns zero cross-tenant rows (API wall)', async () => {
    const endpoints = [
      '/api/fleet/vehicles', '/api/customers', '/api/reservations', '/api/contracts',
      '/api/inspections', '/api/finance/payments', '/api/documents', '/api/telematics/devices',
      '/api/telematics/positions', '/api/maintenance/plans', '/api/maintenance/records',
      '/api/maintenance/vendors', '/api/alerts?status=OPEN,ACKNOWLEDGED,RESOLVED', '/api/ops/branches',
      '/api/transfers', '/api/integrations/messages', '/api/compliance/rules',
      '/api/reports/customers', '/api/reports/branches',
    ];
    for (const ep of endpoints) {
      const mine = await api().get(ep).set('cookie', A.ownerCookie);
      if (mine.status !== 200) continue; // some may need params
      const blob = JSON.stringify(mine.body);
      expect(blob.includes(B.customerId), `${ep} leaked B customer`).toBe(false);
      expect(blob.includes(B.vehicleId), `${ep} leaked B vehicle`).toBe(false);
      expect(blob.includes(B.branchId), `${ep} leaked B branch`).toBe(false);
    }
  });
  it('RLS wall: every V1 tenant table hides B rows under A context', async () => {
    const tables = ['vehicles', 'customers', 'reservations', 'contracts', 'inspections', 'payments',
      'documents', 'telematics_devices', 'telematics_events', 'vehicle_positions',
      'maintenance_plans', 'maintenance_records', 'vendors', 'alerts', 'branches', 'compliance_rules'];
    const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await c.connect();
    await c.query(`select set_config('app.agency_id', '${A.id}', false)`);
    let bAgencyRows = 0;
    for (const t of tables) {
      const r = await c.query(`select count(*)::int as n from ${t} where agency_id = $1`, [B.id]);
      bAgencyRows += r.rows[0].n;
    }
    expect(bAgencyRows).toBe(0);
    await c.end();
  });
});

describe('hardening — storage & audit integrity', () => {
  it('path traversal is neutralized', async () => {
    const evil = await api().get('/api/files/..%2F..%2Fetc%2Fpasswd?exp=9999999999&sig=abc').set('cookie', A.ownerCookie);
    expect(evil.status).toBeGreaterThanOrEqual(400);
    expect(evil.body.toString()).not.toContain('root:');
  });
  it('a signed URL from another tenant is rejected', async () => {
    // upload under A, get URL; strip/forge the agency param → rejected
    const up = await api().post('/api/documents').set('cookie', A.ownerCookie)
      .attach('file', Buffer.from('%PDF-1.4 tenant-test'), { filename: 'a.pdf', contentType: 'application/pdf' })
      .field('kind', 'OTHER').field('entityType', 'other');
    expect(up.status).toBe(201);
    const url = new URL(up.body.url, 'http://x');
    url.searchParams.set('a', B.id); // claim it belongs to B
    const forged = await api().get(`${url.pathname}${url.search}`).set('cookie', B.ownerCookie);
    expect([401, 403]).toContain(forged.status); // agency claim or signature fails — never 200
    const legit = await api().get(up.body.url).set('cookie', A.ownerCookie);
    expect(legit.status).toBe(200);
    // download audited
    const audits = await tenantExec(A.id, `select count(*)::int as n from audit_events where action='DOCUMENT_DOWNLOADED'`);
    expect(Number(audits.rows[0].n)).toBeGreaterThanOrEqual(1);
  });
  it('audit log is immutable through SQL (append-only trigger)', async () => {
    const bad = await tenantExec(A.id, `update audit_events set action='TAMPERED'`).catch((e: Error) => e);
    expect((bad as Error).message).toContain('append-only');
  });
});
