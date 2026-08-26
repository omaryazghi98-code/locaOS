#!/usr/bin/env node
/**
 * Destructive demo-only rental journey audit.
 *
 * Runs against a locally running locaOS API (default http://127.0.0.1:3001)
 * using the seeded Atlas Rent owner account. It creates a fresh customer and
 * reservation, then walks the full rental lifecycle while checking both
 * allowed and forbidden transitions.
 *
 * Usage:
 *   node scripts/rental-journey-audit.mjs
 *   API_BASE_URL=http://127.0.0.1:3001 node scripts/rental-journey-audit.mjs
 *
 * This script intentionally creates demo data. Reseed afterwards if desired.
 */

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';
const EMAIL = process.env.LOCAOS_DEMO_EMAIL ?? 'owner@atlasrent.ma';
const PASSWORD = process.env.LOCAOS_DEMO_PASSWORD ?? 'locaos-demo-2026';

const results = [];
let cookie = '';

function pass(step, detail = '') {
  results.push({ ok: true, step, detail });
  console.log(`✅ ${step}${detail ? ` — ${detail}` : ''}`);
}
function fail(step, detail = '') {
  results.push({ ok: false, step, detail });
  console.error(`❌ ${step}${detail ? ` — ${detail}` : ''}`);
}
function need(ok, step, detail = '') {
  if (!ok) fail(step, detail);
  else pass(step, detail);
  return ok;
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
      ...(options.headers ?? {}),
    },
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { res, body };
}

async function login() {
  const { res } = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login failed: HTTP ${res.status}`);
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error('login returned no session cookie');
  cookie = setCookie.split(';', 1)[0];
}

function isoIn(days, hour = 10) {
  const d = new Date(Date.now() + days * 86_400_000);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

async function main() {
  console.log(`\nlocaOS rental journey audit → ${API_BASE_URL}\n`);
  await login();
  pass('Login', EMAIL);

  const [customers, categories, branches, vehicles] = await Promise.all([
    request('/api/customers'),
    request('/api/fleet/categories'),
    request('/api/ops/branches'),
    request('/api/fleet/vehicles'),
  ]);
  need(customers.res.ok, 'Load customers');
  need(categories.res.ok, 'Load categories');
  need(branches.res.ok, 'Load branches');
  need(vehicles.res.ok, 'Load fleet');

  const category = categories.body?.[0];
  const branch = branches.body?.[0];
  const available = (vehicles.body ?? []).find((v) => v.operationalStatus === 'AVAILABLE' && (!category || v.categoryId === category.id));
  need(Boolean(category), 'Find rental category');
  need(Boolean(branch), 'Find operating branch');
  need(Boolean(available), 'Find available vehicle');
  if (!category || !branch || !available) throw new Error('demo environment does not contain the minimum fleet setup');

  const unique = Date.now().toString();
  const customerCreate = await request('/api/customers', {
    method: 'POST',
    body: JSON.stringify({
      kind: 'INDIVIDUAL', segment: 'TOURIST',
      firstName: 'Journey', lastName: `Audit-${unique.slice(-6)}`,
      phone: `+2126${unique.slice(-8)}`,
      email: `journey-${unique}@example.test`,
    }),
  });
  if (!need(customerCreate.res.ok, 'Create customer', customerCreate.body?.error?.message ?? `HTTP ${customerCreate.res.status}`)) return;
  const customerId = customerCreate.body.id;

  const reservationCreate = await request('/api/reservations', {
    method: 'POST',
    body: JSON.stringify({
      customerId,
      categoryId: category.id,
      vehicleId: null,
      branchOutId: branch.id,
      branchInId: branch.id,
      pickupAt: isoIn(3, 10),
      returnAt: isoIn(6, 10),
      dailyRate: '350',
      notes: 'Automated rental journey audit',
    }),
  });
  if (!need(reservationCreate.res.ok, 'Create reservation', reservationCreate.body?.error?.message ?? `HTTP ${reservationCreate.res.status}`)) return;
  const reservationId = reservationCreate.body.reservation.id;
  need(reservationCreate.body.reservation.status === 'CONFIRMED', 'Reservation starts unassigned/confirmed');

  const assign = await request(`/api/reservations/${reservationId}/assign-vehicle`, {
    method: 'POST', body: JSON.stringify({ vehicleId: available.id }),
  });
  if (!need(assign.res.ok, 'Assign vehicle', assign.body?.error?.message ?? `HTTP ${assign.res.status}`)) return;
  need(assign.body.vehicleId === available.id, 'Assignment persists');

  const earlyContract = await request('/api/contracts/from-reservation', {
    method: 'POST', body: JSON.stringify({ reservationId, language: 'fr' }),
  });
  if (!need(earlyContract.res.ok, 'Generate contract draft', earlyContract.body?.error?.message ?? `HTTP ${earlyContract.res.status}`)) return;
  const contractId = earlyContract.body.contract.id;

  const earlyReady = await request(`/api/reservations/${reservationId}/status`, {
    method: 'POST', body: JSON.stringify({ to: 'READY' }),
  });
  need(!earlyReady.res.ok, 'Block READY before contract/deposit/inspection', earlyReady.body?.error?.message ?? `unexpected HTTP ${earlyReady.res.status}`);

  const earlyActivate = await request(`/api/contracts/${contractId}/activate`, { method: 'POST' });
  need(!earlyActivate.res.ok, 'Block activation before signature/deposit/departure inspection', earlyActivate.body?.error?.message ?? `unexpected HTTP ${earlyActivate.res.status}`);

  const departureInspection = await request('/api/inspections', {
    method: 'POST',
    body: JSON.stringify({
      clientUuid: crypto.randomUUID(),
      kind: 'DEPARTURE',
      contractId,
      reservationId,
      vehicleId: available.id,
      customerId,
      mileageKm: 42000,
      fuelLevelPct: 90,
      checklist: { exterior: true, tires: true, lights: true, documents: true },
      customerAck: true,
      customerAckName: 'Journey Audit',
      notes: 'Departure audit',
    }),
  });
  if (!need(departureInspection.res.ok, 'Departure inspection', departureInspection.body?.error?.message ?? `HTTP ${departureInspection.res.status}`)) return;

  const sign = await request(`/api/contracts/${contractId}/sign`, {
    method: 'POST', body: JSON.stringify({ customerName: 'Journey Audit', gpsConsent: false }),
  });
  if (!need(sign.res.ok, 'Sign contract', sign.body?.error?.message ?? `HTTP ${sign.res.status}`)) return;

  const deposit = await request('/api/finance/deposits', {
    method: 'POST', body: JSON.stringify({ contractId, amount: '10000', method: 'CASH_HELD' }),
  });
  if (!need(deposit.res.ok, 'Secure deposit', deposit.body?.error?.message ?? `HTTP ${deposit.res.status}`)) return;
  const depositId = deposit.body.id;

  const ready = await request(`/api/reservations/${reservationId}/status`, {
    method: 'POST', body: JSON.stringify({ to: 'READY' }),
  });
  if (!need(ready.res.ok, 'Mark reservation READY', ready.body?.error?.message ?? `HTTP ${ready.res.status}`)) return;

  const activate = await request(`/api/contracts/${contractId}/activate`, { method: 'POST' });
  if (!need(activate.res.ok, 'Activate rental', activate.body?.error?.message ?? `HTTP ${activate.res.status}`)) return;

  const activeDetail = await request(`/api/reservations/${reservationId}`);
  need(activeDetail.res.ok && activeDetail.body?.reservation?.status === 'IN_PROGRESS', 'Reservation becomes IN_PROGRESS');

  const returnInspection = await request('/api/inspections', {
    method: 'POST',
    body: JSON.stringify({
      clientUuid: crypto.randomUUID(),
      kind: 'RETURN',
      contractId,
      reservationId,
      vehicleId: available.id,
      customerId,
      mileageKm: 42340,
      fuelLevelPct: 75,
      checklist: { exterior: true, tires: true, lights: true, documents: true },
      customerAck: true,
      customerAckName: 'Journey Audit',
      notes: 'Return audit — no new damage',
      newDamages: [],
    }),
  });
  if (!need(returnInspection.res.ok, 'Return inspection', returnInspection.body?.error?.message ?? `HTTP ${returnInspection.res.status}`)) return;
  const returnInspectionId = returnInspection.body.inspection.id;

  const completeReturn = await request(`/api/inspections/${returnInspectionId}/complete-return`, { method: 'POST' });
  need(completeReturn.res.ok, 'Complete return inspection', completeReturn.body?.error?.message ?? `HTTP ${completeReturn.res.status}`);

  const release = await request(`/api/finance/deposits/${depositId}/release`, {
    method: 'POST', body: JSON.stringify({ reason: 'Journey audit — no damage / fuel settled' }),
  });
  if (!need(release.res.ok, 'Release deposit', release.body?.error?.message ?? `HTTP ${release.res.status}`)) return;

  const close = await request(`/api/contracts/${contractId}/close`, { method: 'POST' });
  need(close.res.ok, 'Close contract', close.body?.error?.message ?? `HTTP ${close.res.status}`);

  const final = await request(`/api/contracts/${contractId}`);
  need(final.res.ok && final.body?.contract?.status === 'CLOSED', 'Final contract CLOSED');

  const failed = results.filter((r) => !r.ok);
  console.log(`\nAudit result: ${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) {
    console.error('\nFailed checks:');
    for (const item of failed) console.error(`- ${item.step}: ${item.detail}`);
    process.exitCode = 2;
  } else {
    console.log('Full rental journey passed.');
  }
}

main().catch((err) => {
  console.error('\nFATAL:', err instanceof Error ? err.message : err);
  process.exit(1);
});
