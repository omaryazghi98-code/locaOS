/**
 * locaOS seed — realistic Moroccan demo data ("a day at Atlas Rent SARL").
 * Run: pnpm db:seed   (requires migrations applied; ENABLE_SCHEDULER off recommended)
 */
import { hash } from '@node-rs/argon2';
import { sql } from 'drizzle-orm';
import { db, withTenant } from './db/client.js';
import {
  agencies, alertRules, branches, cashSessions, complianceRuleSets, consentRecords,
  contractAmendments, contractSequences, contractTemplates, contractVersions, contracts,
  customers, customerFlags, deposits, identityDocuments, inspections, maintenanceWindows,
  payments, quotes, reservations, rolePermissions, sessions, memberships, users,
  vehicleCategories, vehicleDocuments, vehicleModels, vehicleStateTransitions, vehicles,
} from './db/schema.js';
import { ALERT_RULE_DEFS } from './modules/alerts/ruleDefs.js';
import { ROLE_MATRIX } from '@locaos/domain';
import { encryptField, last4, contentHash } from './modules/crypto/crypto.js';
import { env } from './env.js';

const PASSWORD = env.seedPassword;
const DAY = 86_400_000;
const now = Date.now();
const at = (h: number, offsetDays = 0) => new Date(now + offsetDays * DAY + h * 3_600_000);
const iso = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  console.log('seed: wiping demo agency data…');
  // Fresh demo state (platform tables preserved structure; delete rows for clean re-seed)
  for (const t of ['alerts', 'outbox_events', 'audit_events', 'approvals', 'deposit_charges', 'payments',
    'deposits', 'cash_sessions', 'damages', 'inspection_photos', 'inspections', 'contract_amendments',
    'contract_versions', 'contracts', 'contract_templates', 'quotes', 'reservations', 'maintenance_windows',
    'vehicle_documents', 'vehicle_state_transitions', 'vehicles', 'vehicle_models', 'vehicle_categories',
    'consent_records', 'customer_flags', 'identity_documents', 'customers', 'compliance_rule_sets',
    'alert_rules', 'contract_sequences', 'cleaning_tasks', 'role_permissions', 'memberships', 'sessions',
    'branches', 'agencies', 'users']) {
    await db.execute(sql.raw(`TRUNCATE TABLE "${t}" CASCADE`));
  }

  console.log('seed: agency + branches…');
  const aRows = await db.insert(agencies).values({
    legalName: 'Atlas Rent SARL', rcNumber: 'RC 45821 - Casablanca', iceNumber: '001938472000045',
    ifNumber: 'IF 40218765', contractPrefix: 'ATL',
  }).returning();
  const agency = aRows[0]!;
  const bRows = await db.insert(branches).values([
    { agencyId: agency!.id, name: 'Aéroport Mohammed V', city: 'Casablanca', address: 'Terminal 1, Arrivées — Nouaceur' },
    { agencyId: agency!.id, name: 'Casablanca Centre', city: 'Casablanca', address: 'Bd Zerktouni, Casablanca' },
  ]).returning();
  const branchAirport = bRows[0]!; const branchCentre = bRows[1]!;

  console.log('seed: users + roles…');
  const pwd = await hash(PASSWORD);
  const [owner, manager, agent, field, accountant] = await db.insert(users).values([
    { email: 'owner@atlasrent.ma', fullName: 'Fatima Zahra Benali', phone: '+212661000001', passwordHash: pwd },
    { email: 'manager@atlasrent.ma', fullName: 'Youssef El Amrani', phone: '+212661000002', passwordHash: pwd },
    { email: 'agent@atlasrent.ma', fullName: 'Salma Rguig', phone: '+212661000003', passwordHash: pwd },
    { email: 'field@atlasrent.ma', fullName: 'Hamza Berrada', phone: '+212661000004', passwordHash: pwd },
    { email: 'compta@atlasrent.ma', fullName: 'Nadia Cherkaoui', phone: '+212661000005', passwordHash: pwd },
  ]).returning();
  await db.insert(memberships).values([
    { userId: owner!.id, agencyId: agency!.id, roleKey: 'owner' },
    { userId: manager!.id, agencyId: agency!.id, roleKey: 'manager' },
    { userId: agent!.id, agencyId: agency!.id, roleKey: 'agent' },
    { userId: field!.id, agencyId: agency!.id, roleKey: 'field_agent' },
    { userId: accountant!.id, agencyId: agency!.id, roleKey: 'accountant' },
  ]);
  const permRows = Object.entries(ROLE_MATRIX).flatMap(([role, perms]) =>
    perms.map((p) => ({ agencyId: agency!.id, roleKey: role, permissionKey: p })));
  await db.insert(rolePermissions).values(permRows);

  console.log('seed: categories + models + fleet…');
  const cats = await db.insert(vehicleCategories).values([
    { agencyId: agency!.id, code: 'ECO', name: 'Économique', defaultDailyRate: 28000n, floorDailyRate: 24000n, defaultDeposit: 400000n, minDriverAge: 21, minLicenseYears: 2 },
    { agencyId: agency!.id, code: 'COMPACT', name: 'Compacte', defaultDailyRate: 35000n, floorDailyRate: 30000n, defaultDeposit: 500000n, minDriverAge: 21, minLicenseYears: 2 },
    { agencyId: agency!.id, code: 'SUV', name: 'SUV', defaultDailyRate: 55000n, floorDailyRate: 48000n, defaultDeposit: 800000n, minDriverAge: 23, minLicenseYears: 3 },
    { agencyId: agency!.id, code: 'BERLINE', name: 'Berline', defaultDailyRate: 65000n, floorDailyRate: 55000n, defaultDeposit: 1000000n, minDriverAge: 23, minLicenseYears: 3 },
    { agencyId: agency!.id, code: 'VAN7', name: '7 places', defaultDailyRate: 70000n, floorDailyRate: 60000n, defaultDeposit: 1000000n, minDriverAge: 25, minLicenseYears: 3 },
  ]).returning();
  const cat = (code: string) => cats.find((c) => c.code === code)!;

  const models = await db.insert(vehicleModels).values([
    { agencyId: agency!.id, make: 'Dacia', model: 'Sandero', year: 2024, fuelType: 'PETROL' },
    { agencyId: agency!.id, make: 'Renault', model: 'Clio 5', year: 2024, fuelType: 'PETROL' },
    { agencyId: agency!.id, make: 'Dacia', model: 'Duster', year: 2025, fuelType: 'HYBRID' },
    { agencyId: agency!.id, make: 'Chery', model: 'Tiggo 4 Pro', year: 2025, fuelType: 'PETROL' },
    { agencyId: agency!.id, make: 'Hyundai', model: 'Tucson', year: 2023, fuelType: 'DIESEL' },
    { agencyId: agency!.id, make: 'Dacia', model: 'Jogger', year: 2024, fuelType: 'DIESEL' },
    { agencyId: agency!.id, make: 'BYD', model: 'Dolphin', year: 2025, fuelType: 'EV', batteryKwh: '44.9' },
    { agencyId: agency!.id, make: 'Peugeot', model: '208', year: 2023, fuelType: 'PETROL' },
  ]).returning();
  const mod = (m: string) => models.find((x) => x.model === m)!;

  const fleetSpec = [
    { plate: '38214-A-6', vin: 'UU1HSDCEN66123456', cat: 'ECO', model: 'Sandero', km: 41200, fuel: 75, reg: '2024-03-12' },
    { plate: '38215-A-6', vin: 'UU1HSDCEN66123457', cat: 'ECO', model: 'Sandero', km: 38900, fuel: 60, reg: '2024-03-12' },
    { plate: '45102-B-1', vin: 'VF15RJL1H65432101', cat: 'COMPACT', model: 'Clio 5', km: 22400, fuel: 90, reg: '2024-09-01' },
    { plate: '45103-B-1', vin: 'VF15RJL1H65432102', cat: 'COMPACT', model: 'Clio 5', km: 25100, fuel: 45, reg: '2024-09-01' },
    { plate: '77341-C-16', vin: 'UU1HSDCEN77800121', cat: 'SUV', model: 'Duster', km: 12800, fuel: 80, reg: '2025-01-20' },
    { plate: '77342-C-16', vin: 'UU1HSDCEN77800122', cat: 'SUV', model: 'Duster', km: 9600, fuel: 95, reg: '2025-01-20' },
    { plate: '18876-A-6', vin: 'LVVDB11BPPD012345', cat: 'BERLINE', model: 'Tiggo 4 Pro', km: 7300, fuel: 70, reg: '2025-05-02' },
    { plate: '29954-B-18', vin: 'TMAJ81AH5MU012345', cat: 'SUV', model: 'Tucson', km: 88400, fuel: 50, reg: '2023-02-15' },
    { plate: '51023-A-16', vin: 'UU1HSDCEN66900123', cat: 'VAN7', model: 'Jogger', km: 33500, fuel: 65, reg: '2024-06-10' },
    { plate: '60011-A-6', vin: 'LGXCE6DC7M0123456', cat: 'COMPACT', model: 'Dolphin', km: 4100, fuel: 85, reg: '2025-04-05' },
    { plate: '47718-B-6', vin: 'VR3UHNSKXM0123456', cat: 'ECO', model: '208', km: 61200, fuel: 40, reg: '2023-07-22' },
  ];
  const fleet = await db.insert(vehicles).values(fleetSpec.map((v) => ({
    agencyId: agency!.id, categoryId: cat(v.cat).id, modelId: mod(v.model).id,
    currentBranchId: branchAirport.id, plate: v.plate, vin: v.vin,
    currentMileageKm: v.km, fuelLevelPct: v.fuel,
    firstRegistrationDate: v.reg, acquiredAt: new Date(v.reg),
  }))).returning();
  const veh = (plate: string) => fleet.find((v) => v.plate === plate)!;

  // Vehicle documents — one VT expiring soon (alert), one insurance fresh, vignettes for January
  await db.insert(vehicleDocuments).values(fleet.flatMap((v) => [
    { agencyId: agency!.id, vehicleId: v.id, type: 'VT' as const, refNumber: `VT-${v.plate}`, issuedAt: iso(at(0, -340)), expiresAt: v.plate === '47718-B-6' ? iso(at(0, 12)) : iso(at(0, 320)) },
    { agencyId: agency!.id, vehicleId: v.id, type: 'INSURANCE' as const, refNumber: `RC-${v.plate}`, issuedAt: iso(at(0, -30)), expiresAt: iso(at(0, 335)) },
    { agencyId: agency!.id, vehicleId: v.id, type: 'VIGNETTE' as const, refNumber: `TSAV-2026-${v.plate}`, issuedAt: iso(at(0, -200)), expiresAt: iso(at(0, 130)) },
  ]));

  console.log('seed: customers…');
  const custs = await db.insert(customers).values([
    { agencyId: agency!.id, kind: 'INDIVIDUAL', segment: 'DOMESTIC', firstName: 'Mehdi', lastName: 'Alaoui', phone: '+212661234501', email: 'mehdi.alaoui@example.ma' },
    { agencyId: agency!.id, kind: 'INDIVIDUAL', segment: 'MRE', firstName: 'Karim', lastName: 'Bennis', phone: '+33612345678', email: 'karim.bennis@example.fr', notes: 'MRE Lyon — été' },
    { agencyId: agency!.id, kind: 'INDIVIDUAL', segment: 'TOURIST', firstName: 'Claire', lastName: 'Dubois', phone: '+33698765432', email: 'claire.dubois@example.fr' },
    { agencyId: agency!.id, kind: 'COMPANY', segment: 'BUSINESS', companyName: 'Maropharma SARL', phone: '+212522456789', email: 'logistique@maropharma.ma' },
    { agencyId: agency!.id, kind: 'INDIVIDUAL', segment: 'DOMESTIC', firstName: 'Soukaina', lastName: 'Idrissi', phone: '+212677889900' },
  ]).returning();
  const [mehdi, karim, claire, maropharma, soukaina] = custs;

  await db.insert(identityDocuments).values([
    { agencyId: agency!.id, customerId: mehdi!.id, type: 'CIN', numberEncrypted: encryptField('BE845632'), numberLast4: last4('BE845632'), issuerCountry: 'MA', issueDate: '2019-04-12', expiryDate: iso(at(0, 900)) },
    { agencyId: agency!.id, customerId: mehdi!.id, type: 'DRIVER_LICENSE', numberEncrypted: encryptField('AB123456'), numberLast4: last4('AB123456'), issuerCountry: 'MA', issueDate: '2020-05-01', expiryDate: iso(at(0, 1000)) },
    { agencyId: agency!.id, customerId: karim!.id, type: 'PASSPORT', numberEncrypted: encryptField('21FR88345'), numberLast4: last4('21FR88345'), issuerCountry: 'FR', issueDate: '2022-02-01', expiryDate: iso(at(0, 2000)) },
    { agencyId: agency!.id, customerId: karim!.id, type: 'DRIVER_LICENSE', numberEncrypted: encryptField('69AB1122'), numberLast4: last4('69AB1122'), issuerCountry: 'FR', issueDate: '2015-06-15', expiryDate: iso(at(0, 1500)) },
    { agencyId: agency!.id, customerId: claire!.id, type: 'PASSPORT', numberEncrypted: encryptField('22FR77451'), numberLast4: last4('22FR77451'), issuerCountry: 'FR', issueDate: '2023-01-10', expiryDate: iso(at(0, 2500)) },
    { agencyId: agency!.id, customerId: claire!.id, type: 'DRIVER_LICENSE', numberEncrypted: encryptField('FR0099881'), numberLast4: last4('FR0099881'), issuerCountry: 'FR', issueDate: '2018-03-20', expiryDate: iso(at(0, 25)) },
    { agencyId: agency!.id, customerId: soukaina!.id, type: 'CIN', numberEncrypted: encryptField('BK990011'), numberLast4: last4('BK990011'), issuerCountry: 'MA', issueDate: '2021-09-05', expiryDate: iso(at(0, 800)) },
    { agencyId: agency!.id, customerId: soukaina!.id, type: 'DRIVER_LICENSE', numberEncrypted: encryptField('CD556677'), numberLast4: last4('CD556677'), issuerCountry: 'MA', issueDate: '2021-10-01', expiryDate: iso(at(0, 1200)) },
  ]);
  await db.insert(consentRecords).values([
    { agencyId: agency!.id, customerId: mehdi!.id, purpose: 'DATA_PROCESSING', granted: true, language: 'fr', capturedBy: agent!.id },
    { agencyId: agency!.id, customerId: karim!.id, purpose: 'DATA_PROCESSING', granted: true, language: 'fr', capturedBy: agent!.id },
  ]);
  await db.insert(customerFlags).values([
    { agencyId: agency!.id, customerId: maropharma!.id, kind: 'OTHER', severity: 'INFO', note: 'Contrat entreprise — facturation 30j', createdBy: owner!.id, approvedBy: owner!.id },
  ]);

  console.log('seed: maintenance window (conflict-proof)…');
  await db.insert(maintenanceWindows).values({
    agencyId: agency!.id, vehicleId: veh('29954-B-18').id,
    windowStart: at(9, 1), windowEnd: at(17, 2), kind: 'PLANNED',
    note: 'Révision 90 000 km + plaquettes (SGS Nouaceur)',
  });

  console.log('seed: reservations + quotes…');
  const mkQuote = async (resId: string, dailyRate: bigint, days: number, extras: { code: string; label: string; unitAmount: bigint; qty: number }[], deposit: bigint) => {
    const subtotal = dailyRate * BigInt(days) + extras.reduce((a, e) => a + e.unitAmount * BigInt(e.qty), 0n);
    const q = await db.insert(quotes).values({
      agencyId: agency!.id, reservationId: resId, version: 1,
      lines: [{ code: 'RENTAL', label: `Location (${days} j)`, qty: days, unitAmount: dailyRate.toString(), total: (dailyRate * BigInt(days)).toString() },
        ...extras.map((e) => ({ code: `EXTRA_${e.code}`, label: e.label, qty: e.qty, unitAmount: e.unitAmount.toString(), total: (e.unitAmount * BigInt(e.qty)).toString() }))],
      days, subtotal, discount: 0n, total: subtotal, depositRequired: deposit,
      belowFloor: false, inputs: { dailyRate: dailyRate.toString() }, createdBy: agent!.id,
    }).returning();
    return q[0]!.id;
  };

  const resRows = await db.insert(reservations).values([
    // Today: departures
    { agencyId: agency!.id, reference: 'RES-2401', customerId: mehdi!.id, vehicleId: veh('38214-A-6').id, categoryId: cat('ECO').id, branchOutId: branchCentre.id, branchInId: branchCentre.id, pickupAt: at(9, 0), returnAt: at(9, 3), status: 'IN_PROGRESS', notes: 'Mariage à El Jadida' },
    { agencyId: agency!.id, reference: 'RES-2402', customerId: karim!.id, vehicleId: veh('77341-C-16').id, categoryId: cat('SUV').id, branchOutId: branchAirport.id, branchInId: branchAirport.id, pickupAt: at(11, 0), returnAt: at(11, 10), status: 'READY', flightNumber: 'AT765', deliveryKind: 'AIRPORT', deliveryAddress: 'Aéroport CMN Terminal 1' },
    { agencyId: agency!.id, reference: 'RES-2403', customerId: claire!.id, vehicleId: null, categoryId: cat('COMPACT').id, branchOutId: branchAirport.id, branchInId: branchAirport.id, pickupAt: at(15, 0), returnAt: at(15, 5), status: 'CONFIRMED', flightNumber: 'AF596' },
    // Today: returns
    { agencyId: agency!.id, reference: 'RES-2390', customerId: soukaina!.id, vehicleId: veh('45102-B-1').id, categoryId: cat('COMPACT').id, branchOutId: branchCentre.id, branchInId: branchCentre.id, pickupAt: at(10, -4), returnAt: at(10, 0), status: 'IN_PROGRESS' },
    { agencyId: agency!.id, reference: 'RES-2391', customerId: maropharma!.id, vehicleId: veh('51023-A-16').id, categoryId: cat('VAN7').id, branchOutId: branchCentre.id, branchInId: branchCentre.id, pickupAt: at(8, -6), returnAt: at(16, 0), status: 'IN_PROGRESS', notes: 'Tournée distributeurs' },
    // Overdue rental (yesterday due, still out)
    { agencyId: agency!.id, reference: 'RES-2380', customerId: maropharma!.id, vehicleId: veh('18876-A-6').id, categoryId: cat('BERLINE').id, branchOutId: branchAirport.id, branchInId: branchAirport.id, pickupAt: at(9, -3), returnAt: at(9, -1), status: 'IN_PROGRESS' },
    // Tomorrow
    { agencyId: agency!.id, reference: 'RES-2410', customerId: mehdi!.id, vehicleId: veh('60011-A-6').id, categoryId: cat('COMPACT').id, branchOutId: branchAirport.id, branchInId: branchAirport.id, pickupAt: at(8, 1), returnAt: at(8, 4), status: 'VEHICLE_ASSIGNED', notes: 'EV — expliquer la recharge' },
    { agencyId: agency!.id, reference: 'RES-2411', customerId: claire!.id, vehicleId: veh('38215-A-6').id, categoryId: cat('ECO').id, branchOutId: branchCentre.id, branchInId: branchCentre.id, pickupAt: at(10, 1), returnAt: at(10, 2), status: 'VEHICLE_ASSIGNED' },
  ]).returning();
  const res = (ref: string) => resRows.find((r) => r.reference === ref)!;
  if (resRows[0]) await db.update(reservations).set({ quoteId: await mkQuote(res('RES-2401').id, 28000n, 3, [], 400000n) }).where(sql`id = ${res('RES-2401').id}`);
  await db.update(reservations).set({ quoteId: await mkQuote(res('RES-2402').id, 55000n, 10, [{ code: 'GPS', label: 'GPS', unitAmount: 3000n, qty: 10 }], 800000n) }).where(sql`id = ${res('RES-2402').id}`);
  await db.update(reservations).set({ quoteId: await mkQuote(res('RES-2403').id, 35000n, 5, [{ code: 'SIEGE', label: 'Siège bébé', unitAmount: 2500n, qty: 5 }], 500000n) }).where(sql`id = ${res('RES-2403').id}`);
  await db.update(reservations).set({ quoteId: await mkQuote(res('RES-2390').id, 35000n, 4, [], 500000n) }).where(sql`id = ${res('RES-2390').id}`);

  console.log('seed: contracts (active + signed + blank + closed)…');
  await db.insert(contractSequences).values({ agencyId: agency!.id, nextValue: 100 });
  await db.insert(contractTemplates).values([
    { agencyId: agency!.id, language: 'fr', name: 'standard', body: { sections: ['parties', 'vehicle', 'period', 'pricing', 'deposit', 'insurance', 'crossBorder', 'mileageFuel', 'drivers', 'consents', 'clauses', 'signatures'] } },
    { agencyId: agency!.id, language: 'ar', name: 'standard', body: { sections: ['parties', 'vehicle', 'period', 'pricing', 'deposit', 'insurance', 'crossBorder', 'mileageFuel', 'drivers', 'consents', 'clauses', 'signatures'] } },
  ]);

  const mkContract = async (n: number, opts: { reservationId: string | null; customerId: string | null; vehicleId: string | null; status: 'BLANK_ISSUED' | 'DRAFT' | 'SIGNED' | 'ACTIVE' | 'CLOSED'; start?: Date | null; end?: Date | null; signedBy?: string }) => {
    const [c] = await db.insert(contracts).values({
      agencyId: agency!.id, number: n, reservationId: opts.reservationId, customerId: opts.customerId,
      vehicleId: opts.vehicleId, branchId: branchCentre.id, language: 'fr',
      status: opts.status, periodStart: opts.start ?? null, periodEnd: opts.end ?? null,
      blankIssuedAt: opts.status === 'BLANK_ISSUED' ? at(-20, 0) : null,
      reconciledAt: opts.status === 'BLANK_ISSUED' ? null : at(-19, 0),
    }).returning();
    const { blankContractContent } = await import('@locaos/domain');
    const content = blankContractContent({ agencyName: agency!.legalName, agencyIce: agency!.iceNumber, branchName: branchCentre.name, contractNumber: `ATL-2026-${String(n).padStart(5, '0')}`, language: 'fr' });
    if (content.customer.name !== null || opts.customerId) {
      const r = opts.reservationId ? resRows.find((x) => x.id === opts.reservationId) : null;
      content.customer.name = custs.find((c2) => c2.id === opts.customerId) ? [custs.find((c2) => c2.id === opts.customerId)!.firstName, custs.find((c2) => c2.id === opts.customerId)!.lastName].join(' ') : null;
      content.header.mode = 'FULL';
      const v = opts.vehicleId ? fleet.find((f) => f.id === opts.vehicleId) : null;
      if (v) {
        const m = models.find((m2) => m2.id === v.modelId)!;
        content.vehicle = { plate: v.plate, makeModel: `${m.make} ${m.model} (${m.year})`, category: cats.find((c2) => c2.id === v.categoryId)!.name, mileageOut: String(v.currentMileageKm), fuelOut: `${v.fuelLevelPct}%`, vin: v.vin };
      }
      if (r) {
        content.period = { pickupAt: r.pickupAt.toISOString(), returnAt: r.returnAt.toISOString(), days: '4', pickupBranch: branchCentre.name, returnBranch: branchCentre.name };
        content.pricing = { dailyRate: '350', days: '4', discount: '0', total: '1400', currency: 'MAD' };
      }
    }
    if (opts.signedBy) {
      content.signatures = {
        customer: { present: true, name: opts.signedBy, at: at(-19, 0).toISOString() },
        agent: { present: true, name: agent!.fullName, at: at(-19, 0).toISOString() },
      };
      content.consents = [{ purpose: 'DATA_PROCESSING', granted: true }, { purpose: 'GPS_TRACKING', granted: true }];
    }
    const [vRow] = await db.insert(contractVersions).values({
      agencyId: agency!.id, contractId: c!.id, version: 1, content: JSON.parse(JSON.stringify(content)),
      contentHash: contentHash(content), createdBy: agent!.id,
    }).returning();
    await db.update(contracts).set({ currentVersionId: vRow!.id }).where(sql`id = ${c!.id}`);
    return c!;
  };

  const cActive = await mkContract(95, { reservationId: res('RES-2401').id, customerId: mehdi!.id, vehicleId: veh('38214-A-6').id, status: 'ACTIVE', start: at(9, 0), end: at(9, 3), signedBy: 'Mehdi Alaoui' });
  const cSigned = await mkContract(96, { reservationId: res('RES-2402').id, customerId: karim!.id, vehicleId: veh('77341-C-16').id, status: 'SIGNED', start: at(11, 0), end: at(11, 10), signedBy: 'Karim Bennis' });
  const cClosed = await mkContract(90, { reservationId: res('RES-2390').id, customerId: soukaina!.id, vehicleId: veh('45102-B-1').id, status: 'ACTIVE', start: at(10, -4), end: at(10, 0), signedBy: 'Soukaina Idrissi' });
  const cBlankOld = await mkContract(88, { reservationId: null, customerId: null, vehicleId: null, status: 'BLANK_ISSUED' }); // aging → alert
  const cOverdue = await mkContract(91, { reservationId: res('RES-2380').id, customerId: maropharma!.id, vehicleId: veh('18876-A-6').id, status: 'ACTIVE', start: at(9, -3), end: at(9, -1), signedBy: 'Nadia Cherkaoui (Maropharma)' });

  console.log('seed: inspections (departure done for active rental; return pending)…');
  await db.insert(inspections).values([
    { agencyId: agency!.id, clientUuid: '11111111-1111-4111-8111-111111111101', kind: 'DEPARTURE', contractId: cActive.id, reservationId: res('RES-2401').id, vehicleId: veh('38214-A-6').id, customerId: mehdi!.id, performedBy: field!.id, performedByName: field!.fullName, startedAt: at(8.8, 0), durationSeconds: 74, mileageKm: 41200, fuelLevelPct: 75, checklist: { roueSecours: true, triangle: true, extincteur: true, gilets: true, cleRoue: true, autoradio: true }, customerAck: true, customerAckName: 'Mehdi Alaoui', location: { lat: 33.3675, lng: -7.5899 } },
    { agencyId: agency!.id, clientUuid: '11111111-1111-4111-8111-111111111102', kind: 'DEPARTURE', contractId: cClosed.id, reservationId: res('RES-2390').id, vehicleId: veh('45102-B-1').id, customerId: soukaina!.id, performedBy: field!.id, performedByName: field!.fullName, startedAt: at(9.8, -4), durationSeconds: 81, mileageKm: 22400, fuelLevelPct: 90, checklist: { roueSecours: true, triangle: true, extincteur: true, gilets: true }, customerAck: true, customerAckName: 'Soukaina Idrissi' },
  ]);

  console.log('seed: finance — deposits, payments, cash session…');
  const [depActive] = await db.insert(deposits).values({
    agencyId: agency!.id, contractId: cActive.id, amount: 400000n, method: 'CASH_HELD', status: 'HELD', heldBy: agent!.id,
  }).returning();
  await db.update(contracts).set({ depositId: depActive!.id }).where(sql`id = ${cActive.id}`);
  const [depSigned] = await db.insert(deposits).values({
    agencyId: agency!.id, contractId: cSigned.id, amount: 800000n, method: 'CARD_PREAUTH', provider: 'CMI_PLBS (saisie manuelle)', providerRef: 'PLBS-889912', preauthExpiresAt: at(48, 5), status: 'PRE_AUTHORIZED', heldBy: agent!.id,
  }).returning();
  await db.update(contracts).set({ depositId: depSigned!.id }).where(sql`id = ${cSigned.id}`);

  const [sessionYesterday] = await db.insert(cashSessions).values({
    agencyId: agency!.id, branchId: branchCentre.id, openedBy: agent!.id, closedBy: accountant!.id,
    openedAt: at(8, -1), closedAt: at(19, -1), openingBalance: 50000n,
    expectedMAD: 450000n, counted: { MAD: { '20': 12, '50': 4, '100': 3 } }, countedMAD: 440000n, countedMadEquivalent: 440000n,
    varianceMAD: -10000n, varianceExplanation: 'Rendu monnaie mal compté — régularisé par note', status: 'CLOSED',
  }).returning();
  const [sessionToday] = await db.insert(cashSessions).values({
    agencyId: agency!.id, branchId: branchAirport.id, openedBy: agent!.id, openingBalance: 100000n, status: 'OPEN',
  }).returning();

  await db.insert(payments).values([
    { agencyId: agency!.id, direction: 'IN', method: 'CASH', purpose: 'RENTAL', amount: 140000n, currency: 'MAD', madEquivalent: 140000n, contractId: cActive.id, receivedBy: agent!.id, receivedAt: at(9, 0), cashSessionId: sessionToday!.id, note: 'Réservation RES-2401 — 3j économie' },
    { agencyId: agency!.id, direction: 'IN', method: 'CASH', purpose: 'RENTAL', amount: 80000n, currency: 'EUR', fxRate: '10.85', madEquivalent: 868000n, contractId: cSigned.id, receivedBy: agent!.id, receivedAt: at(10.5, 0), cashSessionId: sessionToday!.id, note: 'Acompte EUR — MRE Lyon' },
    { agencyId: agency!.id, direction: 'IN', method: 'TRANSFER', purpose: 'RENTAL', amount: 280000n, currency: 'MAD', madEquivalent: 280000n, contractId: cClosed.id, receivedBy: accountant!.id, receivedAt: at(12, -1), note: 'Virement Maropharma' },
    { agencyId: agency!.id, direction: 'IN', method: 'CASH', purpose: 'DEPOSIT', amount: 500000n, currency: 'MAD', madEquivalent: 500000n, contractId: cActive.id, receivedBy: agent!.id, receivedAt: at(9, 0), cashSessionId: sessionToday!.id, note: 'Caution RES-2401' },
  ]);

  console.log('seed: vehicle states — pipeline for the demo…');
  const transition = async (vehicleId: string, from: string, to: string, reason: string, opts: { interrupted?: string; hoursAgo?: number } = {}) => {
    await db.insert(vehicleStateTransitions).values({
      agencyId: agency!.id, vehicleId, fromStatus: from as never, toStatus: to as never,
      interruptedStatus: (opts.interrupted ?? undefined) as never,
      actorId: agent!.id, actorName: agent!.fullName, actorKind: 'RESERVATION_SERVICE',
      reason, createdAt: new Date(now - (opts.hoursAgo ?? 2) * 3_600_000),
    });
    await db.update(vehicles).set({ operationalStatus: to as never }).where(sql`id = ${vehicleId}`);
  };
  await transition(veh('38214-A-6').id, 'AVAILABLE', 'RESERVED', 'Fenêtre de préparation — RES-2401', { hoursAgo: 26 });
  await transition(veh('38214-A-6').id, 'RESERVED', 'CONTRACT_READY', 'Prêt — contrat ATL-2026-00095', { hoursAgo: 3 });
  await transition(veh('38214-A-6').id, 'CONTRACT_READY', 'RENTED', 'Remise — contrat ATL-2026-00095', { hoursAgo: 1 });
  await transition(veh('77341-C-16').id, 'AVAILABLE', 'RESERVED', 'Fenêtre — RES-2402', { hoursAgo: 20 });
  await transition(veh('77341-C-16').id, 'RESERVED', 'CONTRACT_READY', 'Prêt + plein + lavage', { hoursAgo: 2 });
  await transition(veh('18876-A-6').id, 'AVAILABLE', 'RENTED', 'Remise — contrat 91', { hoursAgo: 72 });
  await transition(veh('18876-A-6').id, 'RENTED', 'OVERDUE', 'Fin de contrat dépassée (évaluateur)', { hoursAgo: 3 });
  await transition(veh('29954-B-18').id, 'AVAILABLE', 'MAINTENANCE', 'Révision 90 000 km planifiée', { hoursAgo: 5, interrupted: undefined });

  console.log('seed: V1 — maintenance, vendors, telematics MOCK, compliance registry…');
  const { vendors, maintenancePlans, maintenanceRecords, telematicsDevices, vehiclePositions, complianceRules } = await import('./db/schema.js');
  const [garageSgs, garageNori] = await db.insert(vendors).values([
    { agencyId: agency!.id, name: 'SGS Auto Nouaceur', kind: 'GARAGE', phone: '+212522330011', city: 'Nouaceur' },
    { agencyId: agency!.id, name: 'Norisko Ain Sebaa', kind: 'GARAGE', phone: '+212522660022', city: 'Casablanca' },
    { agencyId: agency!.id, name: 'Lavage Prestige CMN', kind: 'CLEANING', phone: '+212662334455', city: 'Nouaceur' },
  ]).returning() as unknown as [{ id: string }, { id: string }, { id: string }];
  // mileage-based plans on a few vehicles
  const planRows = await db.insert(maintenancePlans).values([
    { agencyId: agency!.id, vehicleId: veh('38214-A-6').id, taskKind: 'OIL', basis: 'MILEAGE', intervalKm: 10000, lastDoneKm: 32000, nextDueKm: 42000 },
    { agencyId: agency!.id, vehicleId: veh('47718-B-6').id, taskKind: 'OIL', basis: 'MILEAGE', intervalKm: 10000, lastDoneKm: 56000, nextDueKm: 66000 },
    { agencyId: agency!.id, vehicleId: veh('77341-C-16').id, taskKind: 'TIRES', basis: 'TIME', intervalDays: 365, nextDueAt: new Date(Date.now() + 5 * 86400000) },
  ]).returning();
  // historical records incl. a repeated-fault case (Duster: BRAKES ×3 in 90d) and a costly one (Tucson)
  await db.insert(maintenanceRecords).values([
    { agencyId: agency!.id, vehicleId: veh('29954-B-18').id, taskKind: 'BRAKES', vendorId: garageSgs.id, vendorName: 'SGS Auto Nouaceur', performedAt: new Date(Date.now() - 80 * 86400000), mileageKm: 84100, partsCost: 120000n, laborCost: 40000n, totalCost: 160000n, downtimeHours: 8 },
    { agencyId: agency!.id, vehicleId: veh('29954-B-18').id, taskKind: 'BRAKES', vendorId: garageSgs.id, vendorName: 'SGS Auto Nouaceur', performedAt: new Date(Date.now() - 45 * 86400000), mileageKm: 86200, partsCost: 90000n, laborCost: 35000n, totalCost: 125000n, downtimeHours: 6 },
    { agencyId: agency!.id, vehicleId: veh('29954-B-18').id, taskKind: 'BRAKES', vendorId: garageSgs.id, vendorName: 'SGS Auto Nouaceur', performedAt: new Date(Date.now() - 10 * 86400000), mileageKm: 88100, partsCost: 95000n, laborCost: 35000n, totalCost: 130000n, downtimeHours: 6 },
    { agencyId: agency!.id, vehicleId: veh('45102-B-1').id, taskKind: 'GENERAL', vendorId: garageNori.id, vendorName: 'Norisko Ain Sebaa', performedAt: new Date(Date.now() - 20 * 86400000), mileageKm: 21900, partsCost: 150000n, laborCost: 80000n, totalCost: 230000n, downtimeHours: 24 },
  ]);
  void planRows;
  // estimated acquisition values (profitability inputs)
  for (const [plate, valueMad] of [['38214-A-6', 115000], ['38215-A-6', 114000], ['45102-B-1', 158000], ['45103-B-1', 157000], ['77341-C-16', 205000], ['77342-C-16', 207000], ['18876-A-6', 185000], ['29954-B-18', 240000], ['51023-A-16', 172000], ['60011-A-6', 235000], ['47718-B-6', 98000]] as const) {
    await db.update(vehicles).set({ estimatedValue: BigInt(valueMad) * 100n }).where(sql`id = ${veh(plate).id}`);
  }
  // Mock telematics device — explicitly labeled MOCK (V1 §7; no real provider integrated)
  const [mockDev] = await db.insert(telematicsDevices).values({
    agencyId: agency!.id, provider: 'MOCK', externalId: 'MOCK-0001', vehicleId: veh('77341-C-16').id, status: 'MOCK', lastSeenAt: new Date(),
  }).returning();
  await db.insert(vehiclePositions).values({
    vehicleId: veh('77341-C-16').id, agencyId: agency!.id, lat: '33.3675', lng: '-7.5899',
    speedKmh: 0, heading: null, ignitionOn: false, voltage: '12.4', fixedAt: new Date(),
  }).onConflictDoNothing();
  void mockDev;
  // compliance registry (V1 §16) — OFF by default; source + config per rule
  await db.insert(complianceRules).values([
    { agencyId: agency!.id, key: 'FLEET_MINIMUM', label: 'Flotte minimum (7 véhicules)', sourceRef: 'Cahier des charges location sans chauffeur — sources secondaires (registre #15), à vérifier avec votre comptable', effectiveDate: '2024-04-15', config: { minimum: 7 } as never, enabled: false },
    { agencyId: agency!.id, key: 'VEHICLE_AGE_CAP', label: 'Plafond d’âge des véhicules (ICE 5 ans)', sourceRef: 'Cahier des charges — sources secondaires (registre #15), à vérifier avec votre comptable', effectiveDate: '2024-04-15', config: { ice: 5, hybrid: 6, ev: 7 } as never, enabled: false },
  ]);

  console.log('seed: alert rules (research pack) + compliance (OFF by default — G.2)…');
  await db.insert(alertRules).values(ALERT_RULE_DEFS.map((d) => ({
    agencyId: agency!.id, key: d.key, name: d.name, channel: d.channel,
    eventType: d.eventType ?? null, scheduleKey: d.scheduleKey ?? null,
    severity: d.severity, actionKind: d.actionKind,
    dedupWindowMinutes: d.dedupWindowMinutes, enabled: d.enabledByDefault,
    conditions: (d.conditions ?? null) as never, description: d.description,
  })));
  await db.insert(complianceRuleSets).values({
    agencyId: agency!.id, minFleetSize: 7, ageCapIceYears: 5, ageCapHybridYears: 6, ageCapEvYears: 7, enabled: false,
  });

  // Post-seed event: the aging blank contract + overdue alerts are raised by the scheduler on boot.
  console.log('seed: done.');
  console.log(`\nAgency: ${agency!.legalName} (ICE ${agency!.iceNumber})`);
  console.log('Logins (password: ' + PASSWORD + '):');
  console.log('  owner@atlasrent.ma   — Fatima Zahra Benali (owner)');
  console.log('  manager@atlasrent.ma — Youssef El Amrani (manager)');
  console.log('  agent@atlasrent.ma   — Salma Rguig (agent)');
  console.log('  field@atlasrent.ma   — Hamza Berrada (field agent)');
  console.log('  compta@atlasrent.ma  — Nadia Cherkaoui (accountant)');
  void cBlankOld; void cOverdue;
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
