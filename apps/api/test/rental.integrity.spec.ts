import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import pg from 'pg';
import { hash } from '@node-rs/argon2';
import { AppModule } from '../dist/app.module.js';
import { ROLE_MATRIX } from '@locaos/domain';

process.env.DATABASE_URL ??= 'postgresql://locaos:locaos@127.0.0.1:5432/locaos_test';
process.env.SESSION_SECRET = 'test-secret';
process.env.ENABLE_SCHEDULER = 'false';

let app: INestApplication;
let server: any;
const seedClient = new pg.Client({ connectionString: process.env.DATABASE_URL });
const TEST_PW = 'rental-integrity-test-pass';

interface Fixture {
  id: string;
  ownerCookie: string;
  branchId: string;
  categoryId: string;
  category2Id: string;
  customerId: string;
  vehicleId: string;
  vehicle2Id: string;
  foreignVehicleId: string;
}

const api = () => request(server);

async function login(email: string) {
  const res = await api().post('/api/auth/login').send({ email, password: TEST_PW });
  expect(res.status).toBe(200);
  return res.headers['set-cookie']!.map((c: string) => c.split(';')[0]).join('; ');
}

async function seedFixture(): Promise<Fixture> {
  const suffix = Date.now().toString(36);
  const pwd = await hash(TEST_PW);
  const agencyA = (await seedClient.query(`insert into agencies (legal_name, contract_prefix) values ('Integrity A ${suffix} SARL','IA') returning id`)).rows[0].id as string;
  const agencyB = (await seedClient.query(`insert into agencies (legal_name, contract_prefix) values ('Integrity B ${suffix} SARL','IB') returning id`)).rows[0].id as string;

  await seedClient.query(`select set_config('app.agency_id', '${agencyA}', false)`);
  const branchId = (await seedClient.query(`insert into branches (agency_id, name, city) values ('${agencyA}','Integrity','Casablanca') returning id`)).rows[0].id as string;
  const email = `owner-${suffix}@integrity-a.test`;
  const userId = (await seedClient.query(`insert into users (email, full_name, password_hash) values ('${email}','Integrity Owner','${pwd}') returning id`)).rows[0].id as string;
  await seedClient.query(`insert into memberships (user_id, agency_id, role_key) values ('${userId}','${agencyA}','owner')`);
  const perms = (ROLE_MATRIX.owner as readonly string[]).map((p) => `('${agencyA}','owner','${p}')`).join(',');
  await seedClient.query(`insert into role_permissions (agency_id, role_key, permission_key) values ${perms}`);
  await seedClient.query(`insert into contract_sequences (agency_id, next_value) values ('${agencyA}', 1)`);

  const categoryId = (await seedClient.query(`insert into vehicle_categories (agency_id, code, name, default_daily_rate, floor_daily_rate, default_deposit) values ('${agencyA}','ECO','Economique',30000,25000,400000) returning id`)).rows[0].id as string;
  const category2Id = (await seedClient.query(`insert into vehicle_categories (agency_id, code, name, default_daily_rate, floor_daily_rate, default_deposit) values ('${agencyA}','SUV','SUV',50000,40000,600000) returning id`)).rows[0].id as string;
  const modelA = (await seedClient.query(`insert into vehicle_models (agency_id, make, model, year, fuel_type) values ('${agencyA}','Dacia','Sandero',2025,'PETROL') returning id`)).rows[0].id as string;
  const vehicleId = (await seedClient.query(`insert into vehicles (agency_id, category_id, model_id, plate, vin, current_branch_id) values ('${agencyA}','${categoryId}','${modelA}','IA-11111','IA-VIN-111111111111','${branchId}') returning id`)).rows[0].id as string;
  const vehicle2Id = (await seedClient.query(`insert into vehicles (agency_id, category_id, model_id, plate, vin, current_branch_id) values ('${agencyA}','${categoryId}','${modelA}','IA-22222','IA-VIN-222222222222','${branchId}') returning id`)).rows[0].id as string;

  await seedClient.query(`select set_config('app.agency_id', '${agencyB}', false)`);
  const modelB = (await seedClient.query(`insert into vehicle_models (agency_id, make, model, year, fuel_type) values ('${agencyB}','Dacia','Duster',2025,'PETROL') returning id`)).rows[0].id as string;
  const foreignCategory = (await seedClient.query(`insert into vehicle_categories (agency_id, code, name, default_daily_rate, floor_daily_rate, default_deposit) values ('${agencyB}','ECO-B','Economique B',30000,25000,400000) returning id`)).rows[0].id as string;
  const foreignVehicleId = (await seedClient.query(`insert into vehicles (agency_id, category_id, model_id, plate, vin) values ('${agencyB}','${foreignCategory}','${modelB}','IB-33333','IB-VIN-333333333333') returning id`)).rows[0].id as string;

  await seedClient.query(`select set_config('app.agency_id', '${agencyA}', false)`);
  const customerId = (await seedClient.query(`insert into customers (agency_id, first_name, last_name, phone) values ('${agencyA}','Test','Customer-${suffix}','+2126${suffix.slice(-8).padStart(8, '0')}') returning id`)).rows[0].id as string;

  return { id: agencyA, ownerCookie: await login(email), branchId, categoryId, category2Id, customerId, vehicleId, vehicle2Id, foreignVehicleId };
}

const period = (daysFromNow: number, lengthDays: number) => ({
  pickupAt: new Date(Date.now() + daysFromNow * 86_400_000).toISOString(),
  returnAt: new Date(Date.now() + (daysFromNow + lengthDays) * 86_400_000).toISOString(),
});

let F: Fixture;

beforeAll(async () => {
  await seedClient.connect();
  app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  server = app.getHttpServer();
  F = await seedFixture();
});

afterAll(async () => {
  await app.close();
  await seedClient.end();
});

describe('rental integrity — vehicle assignment', () => {
  it('rejects a foreign-agency vehicle', async () => {
    const p = period(3, 2);
    const reservation = await api().post('/api/reservations').set('cookie', F.ownerCookie).send({
      customerId: F.customerId, categoryId: F.categoryId, vehicleId: null,
      branchOutId: F.branchId, branchInId: F.branchId, ...p, dailyRate: '300',
    });
    expect(reservation.status).toBe(201);
    const res = await api().post(`/api/reservations/${reservation.body.reservation.id}/assign-vehicle`)
      .set('cookie', F.ownerCookie).send({ vehicleId: F.foreignVehicleId });
    expect(res.status).toBe(404);
  });

  it('rejects a wrong-category vehicle', async () => {
    const p = period(6, 2);
    const reservation = await api().post('/api/reservations').set('cookie', F.ownerCookie).send({
      customerId: F.customerId, categoryId: F.categoryId, vehicleId: null,
      branchOutId: F.branchId, branchInId: F.branchId, ...p, dailyRate: '300',
    });
    expect(reservation.status).toBe(201);
    const suvModel = (await seedClient.query(`select id from vehicle_models where agency_id='${F.id}' limit 1`)).rows[0].id as string;
    const wrongVehicle = (await seedClient.query(`insert into vehicles (agency_id, category_id, model_id, plate, vin, current_branch_id) values ('${F.id}','${F.category2Id}','${suvModel}','IA-SUV-1','IA-VIN-SUV-11111111','${F.branchId}') returning id`)).rows[0].id as string;
    const res = await api().post(`/api/reservations/${reservation.body.reservation.id}/assign-vehicle`)
      .set('cookie', F.ownerCookie).send({ vehicleId: wrongVehicle });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('VEHICLE_CATEGORY_MISMATCH');
  });

  it('rejects a vehicle in maintenance', async () => {
    const p = period(9, 2);
    const reservation = await api().post('/api/reservations').set('cookie', F.ownerCookie).send({
      customerId: F.customerId, categoryId: F.categoryId, vehicleId: null,
      branchOutId: F.branchId, branchInId: F.branchId, ...p, dailyRate: '300',
    });
    expect(reservation.status).toBe(201);
    await seedClient.query(`update vehicles set operational_status='MAINTENANCE' where id='${F.vehicle2Id}'`);
    const res = await api().post(`/api/reservations/${reservation.body.reservation.id}/assign-vehicle`)
      .set('cookie', F.ownerCookie).send({ vehicleId: F.vehicle2Id });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('VEHICLE_NOT_ASSIGNABLE');
  });

  it('rejects a vehicle already committed to an overlapping reservation', async () => {
    await seedClient.query(`update vehicles set operational_status='AVAILABLE' where id='${F.vehicle2Id}'`);
    const p = period(12, 3);
    const first = await api().post('/api/reservations').set('cookie', F.ownerCookie).send({
      customerId: F.customerId, categoryId: F.categoryId, vehicleId: F.vehicle2Id,
      branchOutId: F.branchId, branchInId: F.branchId, ...p, dailyRate: '300',
    });
    expect(first.status).toBe(201);
    const second = await api().post('/api/reservations').set('cookie', F.ownerCookie).send({
      customerId: F.customerId, categoryId: F.categoryId, vehicleId: null,
      branchOutId: F.branchId, branchInId: F.branchId,
      pickupAt: new Date(Date.now() + 13 * 86_400_000).toISOString(),
      returnAt: new Date(Date.now() + 14 * 86_400_000).toISOString(), dailyRate: '300',
    });
    expect(second.status).toBe(201);
    const res = await api().post(`/api/reservations/${second.body.reservation.id}/assign-vehicle`)
      .set('cookie', F.ownerCookie).send({ vehicleId: F.vehicle2Id });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('VEHICLE_RESERVATION_CONFLICT');
  });
});

describe('rental integrity — contract activation', () => {
  it('rejects activation when contract vehicle no longer matches reservation vehicle', async () => {
    const p = period(30, 2);
    const reservation = await api().post('/api/reservations').set('cookie', F.ownerCookie).send({
      customerId: F.customerId, categoryId: F.categoryId, vehicleId: F.vehicleId,
      branchOutId: F.branchId, branchInId: F.branchId, ...p, dailyRate: '300',
    });
    expect(reservation.status).toBe(201);
    const generated = await api().post('/api/contracts/from-reservation').set('cookie', F.ownerCookie)
      .send({ reservationId: reservation.body.reservation.id, language: 'fr' });
    expect(generated.status).toBe(201);
    const contractId = generated.body.contract.id as string;
    const signed = await api().post(`/api/contracts/${contractId}/sign`).set('cookie', F.ownerCookie)
      .send({ customerName: 'Test Customer', gpsConsent: true });
    expect(signed.status).toBe(201);

    await seedClient.query(`update reservations set status='READY' where id='${reservation.body.reservation.id}'`);
    const wrongVehicle = (await seedClient.query(`select id from vehicles where id <> '${F.vehicleId}' and agency_id='${F.id}' limit 1`)).rows[0].id as string;
    await seedClient.query(`update contracts set vehicle_id='${wrongVehicle}' where id='${contractId}'`);
    await seedClient.query(`insert into inspections (agency_id, client_uuid, kind, contract_id, reservation_id, vehicle_id, customer_id, customer_ack)
      values ('${F.id}','${crypto.randomUUID()}','DEPARTURE','${contractId}','${reservation.body.reservation.id}','${F.vehicleId}','${F.customerId}',true)`);
    await seedClient.query(`insert into deposits (agency_id, contract_id, amount, method, status, held_by)
      values ('${F.id}','${contractId}',400000,'CASH_HELD','HELD',(select id from users where email like 'owner-%@integrity-a.test' limit 1))`);

    const res = await api().post(`/api/contracts/${contractId}/activate`).set('cookie', F.ownerCookie);
    expect(res.status).toBe(403);
    expect(String(res.body.message)).toContain('véhicule du contrat');
  });
});

describe('rental integrity — inspection linkage', () => {
  it('auto-links reservation inspection to its current contract', async () => {
    const p = period(40, 2);
    const freshVehicle = (await seedClient.query(`insert into vehicles (agency_id, category_id, model_id, plate, vin, current_branch_id) values ('${F.id}','${F.categoryId}',(select id from vehicle_models where agency_id='${F.id}' limit 1),'IA-INSPECT-${Date.now().toString(36).slice(-6)}','IA-VIN-INSPECT-${Date.now().toString(36)}','${F.branchId}') returning id`)).rows[0].id as string;
    const reservation = await api().post('/api/reservations').set('cookie', F.ownerCookie).send({
      customerId: F.customerId, categoryId: F.categoryId, vehicleId: freshVehicle,
      branchOutId: F.branchId, branchInId: F.branchId, ...p, dailyRate: '300',
    });
    expect(reservation.status).toBe(201);
    const generated = await api().post('/api/contracts/from-reservation').set('cookie', F.ownerCookie)
      .send({ reservationId: reservation.body.reservation.id, language: 'fr' });
    expect(generated.status).toBe(201);

    const inspection = await api().post('/api/inspections').set('cookie', F.ownerCookie).send({
      clientUuid: crypto.randomUUID(), kind: 'DEPARTURE', reservationId: reservation.body.reservation.id,
      vehicleId: freshVehicle, mileageKm: 10000, fuelLevelPct: 90, checklist: { tires: true }, customerAck: true,
      customerAckName: 'Test Customer',
    });
    expect(inspection.status).toBe(201);
    expect(inspection.body.inspection.contractId).toBe(generated.body.contract.id);

    const detail = await api().get(`/api/contracts/${generated.body.contract.id}`).set('cookie', F.ownerCookie);
    expect(detail.status).toBe(200);
    expect(detail.body.inspections.some((x: { id: string }) => x.id === inspection.body.inspection.id)).toBe(true);
  });
});

describe('rental integrity — deposit idempotency', () => {
  it('rejects a second live deposit for the same contract', async () => {
    const p = period(50, 2);
    const reservation = await api().post('/api/reservations').set('cookie', F.ownerCookie).send({
      customerId: F.customerId, categoryId: F.categoryId, vehicleId: F.vehicleId,
      branchOutId: F.branchId, branchInId: F.branchId, ...p, dailyRate: '300',
    });
    expect(reservation.status).toBe(201);
    const generated = await api().post('/api/contracts/from-reservation').set('cookie', F.ownerCookie)
      .send({ reservationId: reservation.body.reservation.id, language: 'fr' });
    expect(generated.status).toBe(201);

    const first = await api().post('/api/finance/deposits').set('cookie', F.ownerCookie)
      .send({ contractId: generated.body.contract.id, amount: '4000', method: 'CASH_HELD' });
    expect(first.status).toBe(201);

    const second = await api().post('/api/finance/deposits').set('cookie', F.ownerCookie)
      .send({ contractId: generated.body.contract.id, amount: '4000', method: 'CASH_HELD' });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('DEPOSIT_ALREADY_SECURED');

    const count = await seedClient.query(`select count(*)::int as n from deposits where contract_id='${generated.body.contract.id}' and status in ('PLANNED','HELD','PRE_AUTHORIZED','PARTIALLY_CHARGED')`);
    expect(count.rows[0].n).toBe(1);
  });
});