/**
 * locaOS — MVP schema (Phase 1), Drizzle ORM (see ADR-0002 amendment).
 * Handwritten SQL migrations live in drizzle/ (0000_init generated, 0001+ hand-reviewed).
 * Tenant tables carry agency_id; RLS + FORCE ROW LEVEL SECURITY applied in migration 0001.
 * Amounts are BigInt centimes; timestamps UTC.
 */
import {
  pgEnum, pgTable, uuid, text, varchar, integer, boolean, timestamp, bigint, numeric, jsonb, date,
  uniqueIndex, index,
} from 'drizzle-orm/pg-core';

// ── Enums ────────────────────────────────────────────────────────────────────────
export const vehicleStatus = pgEnum('vehicle_status', [
  'AVAILABLE', 'RESERVED', 'PREPARING', 'CONTRACT_READY', 'IN_TRANSIT', 'RENTED', 'OVERDUE',
  'AWAITING_INSPECTION', 'INSPECTED', 'CLEANING', 'MAINTENANCE', 'IMMOBILIZED', 'ACCIDENT', 'UNAVAILABLE',
]);
export const fleetStatus = pgEnum('fleet_status', ['IN_FLEET', 'FOR_SALE', 'SOLD', 'RETIRED']);
export const reservation_status = pgEnum('reservation_status', [
  'DRAFT', 'CONFIRMED', 'VEHICLE_ASSIGNED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW',
]);
export const contract_status = pgEnum('contract_status', ['BLANK_ISSUED', 'DRAFT', 'GENERATED', 'SIGNATURE_REQUESTED', 'SIGNED', 'ACTIVE', 'CLOSED', 'AMENDED', 'VOIDED']);
export const payment_method = pgEnum('payment_method', ['CASH', 'CARD', 'TRANSFER', 'DEPOSIT_CASH', 'REFUND']);
export const payment_direction = pgEnum('payment_direction', ['IN', 'OUT']);
export const payment_purpose = pgEnum('payment_purpose', ['RENTAL', 'DEPOSIT', 'DAMAGE', 'FUEL', 'FINE', 'OTHER']);
export const deposit_status = pgEnum('deposit_status', ['PLANNED', 'HELD', 'PRE_AUTHORIZED', 'RELEASED', 'PARTIALLY_CHARGED', 'SETTLED']);
export const deposit_method = pgEnum('deposit_method', ['CASH_HELD', 'CARD_PREAUTH', 'BANK']);
export const inspection_kind = pgEnum('inspection_kind', ['DEPARTURE', 'RETURN']);
export const alert_severity = pgEnum('alert_severity', ['INFO', 'ATTENTION', 'HIGH', 'CRITICAL']);
export const alert_status = pgEnum('alert_status', ['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED']);
export const action_kind = pgEnum('action_kind', ['NOTIFY', 'CREATE_TASK', 'REQUIRE_APPROVAL', 'SUGGESTION']);
export const alert_channel = pgEnum('alert_channel', ['EVENT', 'SCHEDULE', 'SIGNAL']);
export const vehicle_doc_type = pgEnum('vehicle_doc_type', ['REGISTRATION', 'VT', 'INSURANCE', 'VIGNETTE']);
export const identity_doc_type = pgEnum('identity_doc_type', ['CIN', 'PASSPORT', 'RESIDENCE_PERMIT', 'DRIVER_LICENSE']);

const ts = (n: string) => timestamp(n, { withTimezone: true });

// ── Platform (no RLS — session resolution is cross-agency by nature) ────────────
export const agencies = pgTable('agencies', {
  id: uuid('id').defaultRandom().primaryKey(),
  legalName: text('legal_name').notNull(),
  rcNumber: text('rc_number'),
  iceNumber: text('ice_number'),
  ifNumber: text('if_number'),
  defaultLang: text('default_lang').notNull().default('fr'),
  currency: text('currency').notNull().default('MAD'),
  tz: text('tz').notNull().default('Africa/Casablanca'),
  contractPrefix: text('contract_prefix').notNull().default('L'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const branches = pgTable('branches', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull().references(() => agencies.id),
  name: text('name').notNull(),
  city: text('city').notNull(),
  address: text('address'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('branches_agency_name_uq').on(t.agencyId, t.name)]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  fullName: text('full_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  isPlatformAdmin: boolean('is_platform_admin').notNull().default(false),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull().unique(),
  agencyId: uuid('agency_id'), // active agency context
  deviceInfo: text('device_info'),
  ip: text('ip'),
  expiresAt: ts('expires_at').notNull(),
  revokedAt: ts('revoked_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('sessions_user_idx').on(t.userId)]);

export const memberships = pgTable('memberships', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  agencyId: uuid('agency_id').notNull().references(() => agencies.id),
  roleKey: text('role_key').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('memberships_user_agency_uq').on(t.userId, t.agencyId)]);

export const rolePermissions = pgTable('role_permissions', {
  agencyId: uuid('agency_id').notNull(),
  roleKey: text('role_key').notNull(),
  permissionKey: text('permission_key').notNull(),
}, (t) => [
  index('role_permissions_pk_idx').on(t.agencyId, t.roleKey, t.permissionKey),
]);

// ── Tenant tables (RLS in migration 0001) ───────────────────────────────────────
export const auditEvents = pgTable('audit_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  actorId: uuid('actor_id'),
  actorName: text('actor_name'),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  action: text('action').notNull(),
  before: jsonb('before'),
  after: jsonb('after'),
  source: text('source').notNull().default('api'),
  ip: text('ip'),
  reason: text('reason'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [
  index('audit_entity_idx').on(t.agencyId, t.entityType, t.entityId, t.createdAt),
  index('audit_actor_idx').on(t.agencyId, t.actorId),
]);

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  kind: text('kind').notNull().default('INDIVIDUAL'),
  segment: text('segment').notNull().default('DOMESTIC'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  companyName: text('company_name'),
  phone: text('phone').notNull(),
  email: text('email'),
  notes: text('notes'),
  deletedAt: ts('deleted_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('customers_agency_phone_uq').on(t.agencyId, t.phone),
  index('customers_name_idx').on(t.agencyId, t.lastName),
]);

export const identityDocuments = pgTable('identity_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  type: identity_doc_type('type').notNull(),
  numberEncrypted: text('number_encrypted').notNull(),
  numberLast4: text('number_last4').notNull(),
  issuerCountry: text('issuer_country'),
  issueDate: date('issue_date'),
  expiryDate: date('expiry_date'),
  frontObjectKey: text('front_object_key'),
  backObjectKey: text('back_object_key'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [index('identity_customer_idx').on(t.customerId), index('identity_expiry_idx').on(t.agencyId, t.expiryDate)]);

export const customerFlags = pgTable('customer_flags', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  kind: text('kind').notNull(),
  severity: text('severity').notNull().default('ATTENTION'),
  note: text('note'),
  evidence: jsonb('evidence'),
  createdBy: uuid('created_by').notNull(),
  approvedBy: uuid('approved_by'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('flags_customer_idx').on(t.customerId)]);

export const consentRecords = pgTable('consent_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  purpose: text('purpose').notNull(),
  granted: boolean('granted').notNull(),
  language: text('language').notNull().default('fr'),
  capturedBy: uuid('captured_by'),
  capturedAt: ts('captured_at').notNull().defaultNow(),
}, (t) => [index('consent_customer_idx').on(t.customerId, t.purpose)]);

export const vehicleCategories = pgTable('vehicle_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  defaultDailyRate: bigint('default_daily_rate', { mode: 'bigint' }).notNull(),
  floorDailyRate: bigint('floor_daily_rate', { mode: 'bigint' }).notNull(),
  defaultDeposit: bigint('default_deposit', { mode: 'bigint' }).notNull(),
  minDriverAge: integer('min_driver_age').notNull().default(21),
  minLicenseYears: integer('min_license_years').notNull().default(2),
}, (t) => [uniqueIndex('categories_agency_code_uq').on(t.agencyId, t.code)]);

export const vehicleModels = pgTable('vehicle_models', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  fuelType: text('fuel_type').notNull().default('PETROL'),
  batteryKwh: numeric('battery_kwh'),
}, (t) => [uniqueIndex('models_uq').on(t.agencyId, t.make, t.model, t.year)]);

export const vehicles = pgTable('vehicles', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  categoryId: uuid('category_id').notNull().references(() => vehicleCategories.id),
  modelId: uuid('model_id').notNull().references(() => vehicleModels.id),
  currentBranchId: uuid('current_branch_id'),
  plate: text('plate').notNull(),
  vin: text('vin').notNull(),
  operationalStatus: vehicleStatus('operational_status').notNull().default('AVAILABLE'),
  fleetStatus: fleetStatus('fleet_status').notNull().default('IN_FLEET'),
  currentMileageKm: integer('current_mileage_km').notNull().default(0),
  fuelLevelPct: integer('fuel_level_pct').notNull().default(100),
  estimatedValue: bigint('estimated_value', { mode: 'bigint' }),
  firstRegistrationDate: date('first_registration_date'),
  acquiredAt: ts('acquired_at'),
  deletedAt: ts('deleted_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('vehicles_plate_uq').on(t.agencyId, t.plate),
  index('vehicles_status_idx').on(t.agencyId, t.operationalStatus),
]);

export const vehicleStateTransitions = pgTable('vehicle_state_transitions', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  fromStatus: vehicleStatus('from_status').notNull(),
  toStatus: vehicleStatus('to_status').notNull(),
  interruptedStatus: vehicleStatus('interrupted_status'),
  actorId: uuid('actor_id'),
  actorName: text('actor_name'),
  actorKind: text('actor_kind').notNull().default('USER'),
  reason: text('reason'),
  sourceType: text('source_type'),
  sourceId: text('source_id'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('vst_vehicle_idx').on(t.vehicleId, t.createdAt)]);

export const vehicleDocuments = pgTable('vehicle_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  type: vehicle_doc_type('type').notNull(),
  refNumber: text('ref_number'),
  issuedAt: date('issued_at'),
  expiresAt: date('expires_at'),
  objectKey: text('object_key'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [index('vdocs_idx').on(t.vehicleId, t.type, t.expiresAt)]);

export const maintenanceWindows = pgTable('maintenance_windows', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  kind: text('kind').notNull().default('PLANNED'),
  note: text('note'),
  windowStart: ts('window_start').notNull(),
  windowEnd: ts('window_end').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('maint_vehicle_idx').on(t.vehicleId)]);

export const complianceRuleSets = pgTable('compliance_rule_sets', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  minFleetSize: integer('min_fleet_size'),
  ageCapIceYears: integer('age_cap_ice_years'),
  ageCapHybridYears: integer('age_cap_hybrid_years'),
  ageCapEvYears: integer('age_cap_ev_years'),
  enabled: boolean('enabled').notNull().default(false),
  sourceLabel: text('source_label').notNull().default('Cahier des charges (secondary sources) — verify with your accountant'),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('compliance_agency_uq').on(t.agencyId)]);

export const reservations = pgTable('reservations', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  reference: text('reference').notNull().unique(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id),
  categoryId: uuid('category_id').notNull().references(() => vehicleCategories.id),
  branchOutId: uuid('branch_out_id').notNull(),
  branchInId: uuid('branch_in_id').notNull(),
  pickupAt: ts('pickup_at').notNull(),
  returnAt: ts('return_at').notNull(),
  status: reservation_status('status').notNull().default('DRAFT'),
  flightNumber: text('flight_number'),
  deliveryKind: text('delivery_kind'),
  deliveryAddress: text('delivery_address'),
  assignedToId: uuid('assigned_to_id'),
  quoteId: uuid('quote_id'),
  notes: text('notes'),
  cancelledReason: text('cancelled_reason'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [
  index('res_pickup_idx').on(t.agencyId, t.pickupAt),
  index('res_vehicle_idx').on(t.vehicleId),
]);

export const quotes = pgTable('quotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  reservationId: uuid('reservation_id').notNull().references(() => reservations.id),
  version: integer('version').notNull().default(1),
  lines: jsonb('lines').notNull(),
  days: integer('days').notNull(),
  subtotal: bigint('subtotal', { mode: 'bigint' }).notNull(),
  discount: bigint('discount', { mode: 'bigint' }).notNull(),
  total: bigint('total', { mode: 'bigint' }).notNull(),
  depositRequired: bigint('deposit_required', { mode: 'bigint' }).notNull(),
  belowFloor: boolean('below_floor').notNull().default(false),
  inputs: jsonb('inputs').notNull(),
  createdBy: uuid('created_by'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('quotes_res_version_uq').on(t.reservationId, t.version)]);

export const contractSequences = pgTable('contract_sequences', {
  agencyId: uuid('agency_id').primaryKey(),
  nextValue: integer('next_value').notNull().default(1),
});

export const contractTemplates = pgTable('contract_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  language: text('language').notNull(),
  name: text('name').notNull(),
  schemaVersion: integer('schema_version').notNull().default(1),
  body: jsonb('body').notNull(),
  active: boolean('active').notNull().default(true),
}, (t) => [uniqueIndex('templates_uq').on(t.agencyId, t.language, t.name)]);

export const contracts = pgTable('contracts', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  number: integer('number').notNull(),
  reservationId: uuid('reservation_id').references(() => reservations.id),
  customerId: uuid('customer_id').references(() => customers.id),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id),
  branchId: uuid('branch_id'),
  language: text('language').notNull().default('fr'),
  status: contract_status('status').notNull().default('DRAFT'),
  periodStart: ts('period_start'),
  periodEnd: ts('period_end'),
  depositId: uuid('deposit_id'),
  currentVersionId: uuid('current_version_id'),
  signedObjectKey: text('signed_object_key'),
  scannedObjectKey: text('scanned_object_key'),
  voidedReason: text('voided_reason'),
  blankIssuedAt: ts('blank_issued_at'),
  reconciledAt: ts('reconciled_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('contracts_number_uq').on(t.agencyId, t.number),
  index('contracts_status_idx').on(t.agencyId, t.status),
]);

export const contractVersions = pgTable('contract_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  version: integer('version').notNull(),
  templateId: uuid('template_id'),
  content: jsonb('content').notNull(),
  contentHash: text('content_hash').notNull(),
  renderedObjectKey: text('rendered_object_key'),
  createdBy: uuid('created_by'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('cversions_uq').on(t.contractId, t.version)]);

export const contractAmendments = pgTable('contract_amendments', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  kind: text('kind').notNull(),
  payload: jsonb('payload').notNull(),
  reason: text('reason').notNull(),
  createdBy: uuid('created_by').notNull(),
  resultingVersionId: uuid('resulting_version_id'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('amendments_contract_idx').on(t.contractId)]);

export const inspections = pgTable('inspections', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  clientUuid: text('client_uuid').notNull(),
  kind: inspection_kind('kind').notNull(),
  contractId: uuid('contract_id'),
  reservationId: uuid('reservation_id'),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  customerId: uuid('customer_id'),
  performedBy: uuid('performed_by'),
  performedByName: text('performed_by_name'),
  startedAt: ts('started_at'),
  submittedAt: ts('submitted_at').notNull().defaultNow(),
  durationSeconds: integer('duration_seconds'),
  mileageKm: integer('mileage_km'),
  fuelLevelPct: integer('fuel_level_pct'),
  checklist: jsonb('checklist'),
  zones: jsonb('zones'), // [{ code:'FRONT'|'REAR'|'LEFT'|'RIGHT'|'ROOF'|'WINDSHIELD'|'WHEELS'|'TIRES'|'INTERIOR'|'DASHBOARD'|'TRUNK'|'ACCESSORIES', status:'OK'|'DAMAGE'|'MISSING', note? }]
  location: jsonb('location'),
  customerAck: boolean('customer_ack').notNull().default(false),
  customerAckName: text('customer_ack_name'),
  deviceInfo: jsonb('device_info'),
  notes: text('notes'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('inspections_client_uq').on(t.agencyId, t.clientUuid),
  index('inspections_contract_idx').on(t.contractId, t.kind),
  index('inspections_vehicle_idx').on(t.vehicleId, t.submittedAt),
]);

export const inspectionPhotos = pgTable('inspection_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  inspectionId: uuid('inspection_id').notNull().references(() => inspections.id),
  slot: text('slot').notNull(),
  objectKey: text('object_key').notNull(),
  checksum: text('checksum'),
  takenAt: ts('taken_at').notNull().defaultNow(),
}, (t) => [index('photos_inspection_idx').on(t.inspectionId)]);

export const damages = pgTable('damages', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  discoveredInspectionId: uuid('discovered_inspection_id').references(() => inspections.id),
  preexisting: boolean('preexisting').notNull().default(false),
  zoneCode: text('zone_code').notNull(),
  severity: text('severity').notNull().default('MINOR'),
  description: text('description'),
  photoObjectKeys: jsonb('photo_object_keys'),
  resolution: text('resolution').notNull().default('NONE'),
  chargePaymentId: uuid('charge_payment_id'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('damages_vehicle_idx').on(t.vehicleId)]);

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  direction: payment_direction('direction').notNull().default('IN'),
  method: payment_method('method').notNull(),
  purpose: payment_purpose('purpose'),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  currency: text('currency').notNull().default('MAD'),
  fxRate: numeric('fx_rate'),
  madEquivalent: bigint('mad_equivalent', { mode: 'bigint' }),
  contractId: uuid('contract_id'),
  reservationId: uuid('reservation_id'),
  depositId: uuid('deposit_id'),
  reversesPaymentId: uuid('reverses_payment_id'),
  providerRef: text('provider_ref'),
  receivedBy: uuid('received_by'),
  receivedAt: ts('received_at').notNull().defaultNow(),
  cashSessionId: uuid('cash_session_id'),
  note: text('note'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [
  index('payments_received_idx').on(t.agencyId, t.receivedAt),
  index('payments_session_idx').on(t.cashSessionId),
  index('payments_contract_idx').on(t.contractId),
]);

export const deposits = pgTable('deposits', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  method: deposit_method('method').notNull(),
  provider: text('provider'),
  providerRef: text('provider_ref'),
  preauthExpiresAt: ts('preauth_expires_at'),
  status: deposit_status('status').notNull().default('PLANNED'),
  heldBy: uuid('held_by'),
  releasedBy: uuid('released_by'),
  releasedAt: ts('released_at'),
  releaseReason: text('release_reason'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [index('deposits_contract_idx').on(t.contractId)]);

export const depositCharges = pgTable('deposit_charges', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  depositId: uuid('deposit_id').notNull().references(() => deposits.id),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  reason: text('reason').notNull(),
  damageId: uuid('damage_id'),
  approvedBy: uuid('approved_by').notNull(),
  paymentId: uuid('payment_id'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('deposit_charges_idx').on(t.depositId)]);

export const cashSessions = pgTable('cash_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  openedBy: uuid('opened_by').notNull(),
  closedBy: uuid('closed_by'),
  openedAt: ts('opened_at').notNull().defaultNow(),
  closedAt: ts('closed_at'),
  openingBalance: bigint('opening_balance', { mode: 'bigint' }).notNull(),
  expectedMAD: bigint('expected_mad', { mode: 'bigint' }),
  counted: jsonb('counted'),
  countedMAD: bigint('counted_mad', { mode: 'bigint' }),
  countedMadEquivalent: bigint('counted_mad_equivalent', { mode: 'bigint' }),
  varianceMAD: bigint('variance_mad', { mode: 'bigint' }),
  varianceExplanation: text('variance_explanation'),
  status: text('status').notNull().default('OPEN'),
}, (t) => [index('cash_branch_idx').on(t.branchId, t.openedAt)]);

export const cleaningTasks = pgTable('cleaning_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  assignedTo: uuid('assigned_to'),
  status: text('status').notNull().default('TODO'),
  nextPickupAt: ts('next_pickup_at'),
  completedAt: ts('completed_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [index('cleaning_agency_idx').on(t.agencyId, t.status)]);

export const alertRules = pgTable('alert_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  key: text('key').notNull(),
  name: text('name').notNull(),
  channel: alert_channel('channel').notNull(),
  eventType: text('event_type'),
  scheduleKey: text('schedule_key'),
  severity: alert_severity('severity').notNull(),
  actionKind: action_kind('action_kind').notNull().default('NOTIFY'),
  category: text('category').notNull().default('OPERATIONS'),
  dedupWindowMinutes: integer('dedup_window_minutes').notNull().default(1440),
  enabled: boolean('enabled').notNull().default(true),
  conditions: jsonb('conditions'),
  description: text('description').notNull().default(''),
}, (t) => [uniqueIndex('alert_rules_uq').on(t.agencyId, t.key)]);

export const alerts = pgTable('alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  ruleKey: text('rule_key').notNull(),
  category: text('category').notNull().default('OPERATIONS'), // OPERATIONS|FLEET|MAINTENANCE|FINANCIAL|CONTRACT|COMPLIANCE|SECURITY|TELEMATICS|CUSTOMER
  severity: alert_severity('severity').notNull(),
  sourceKind: text('source_kind').notNull().default('RULE'),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  dedupKey: text('dedup_key').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  evidence: jsonb('evidence'),
  status: alert_status('status').notNull().default('OPEN'),
  assigneeId: uuid('assignee_id'),
  acknowledgedBy: uuid('acknowledged_by'),
  acknowledgedAt: ts('acknowledged_at'),
  resolvedBy: uuid('resolved_by'),
  resolvedAt: ts('resolved_at'),
  resolutionNote: text('resolution_note'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('alerts_dedup_uq').on(t.agencyId, t.dedupKey),
  index('alerts_status_idx').on(t.agencyId, t.status, t.severity),
]);

export const approvals = pgTable('approvals', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  requestedAction: jsonb('requested_action').notNull(),
  requestedBy: uuid('requested_by').notNull(),
  decidedBy: uuid('decided_by'),
  decision: text('decision'),
  decidedAt: ts('decided_at'),
  reason: text('reason'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('approvals_pending_idx').on(t.agencyId, t.decision)]);

export const outboxEvents = pgTable('outbox_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  processedAt: ts('processed_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('outbox_unprocessed_idx').on(t.processedAt)]);

/** Tables subject to RLS (agency_id column present) — consumed by migration 0001.
 *  role_permissions is deliberately excluded: it holds permission keys only (no business
 *  data) and must be readable during session resolution, before tenant context is set. */
export const RLS_TABLES = [
  'branches', 'audit_events', 'customers', 'identity_documents', 'customer_flags',
  'consent_records', 'vehicle_categories', 'vehicle_models', 'vehicles', 'vehicle_state_transitions',
  'vehicle_documents', 'maintenance_windows', 'compliance_rule_sets', 'reservations', 'quotes',
  'contract_sequences', 'contract_templates', 'contracts', 'contract_versions', 'contract_amendments',
  'inspections', 'inspection_photos', 'damages', 'payments', 'deposits', 'deposit_charges',
  'cash_sessions', 'cleaning_tasks', 'alert_rules', 'alerts', 'approvals', 'outbox_events',
] as const;

// ═══ V1 additions ═══════════════════════════════════════════════════════════════

export const vendors = pgTable('vendors', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  name: text('name').notNull(),
  kind: text('kind').notNull().default('GARAGE'), // GARAGE | CLEANING | TOWING | OTHER
  phone: text('phone'),
  city: text('city'),
  notes: text('notes'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('vendors_agency_idx').on(t.agencyId)]);

/** Deterministic maintenance plans: mileage-based, time-based, or scheduled. */
export const maintenancePlans = pgTable('maintenance_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  taskKind: text('task_kind').notNull(), // OIL | VT | TIRES | BRAKES | GENERAL | ...
  basis: text('basis').notNull(), // MILEAGE | TIME | SCHEDULED
  intervalKm: integer('interval_km'),
  intervalDays: integer('interval_days'),
  lastDoneKm: integer('last_done_km'),
  lastDoneAt: ts('last_done_at'),
  nextDueKm: integer('next_due_km'),
  nextDueAt: ts('next_due_at'),
  estimatedCost: bigint('estimated_cost', { mode: 'bigint' }),
  active: boolean('active').notNull().default(true),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [index('plans_vehicle_idx').on(t.vehicleId)]);

/** Performed work: parts + labor + downtime + vendor (feeds profitability & SLA stats). */
export const maintenanceRecords = pgTable('maintenance_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  planId: uuid('plan_id'),
  taskKind: text('task_kind').notNull(),
  vendorId: uuid('vendor_id'),
  vendorName: text('vendor_name'),
  performedAt: ts('performed_at').notNull().defaultNow(),
  mileageKm: integer('mileage_km'),
  partsCost: bigint('parts_cost', { mode: 'bigint' }).notNull(),
  laborCost: bigint('labor_cost', { mode: 'bigint' }).notNull(),
  totalCost: bigint('total_cost', { mode: 'bigint' }).notNull(),
  downtimeHours: integer('downtime_hours').notNull(),
  windowId: uuid('window_id'),
  notes: text('notes'),
  invoiceObjectKey: text('invoice_object_key'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('records_vehicle_idx').on(t.vehicleId, t.performedAt)]);

/** Branch transfers — recommended by the system, executed by humans (V1 §6). */
export const vehicleTransfers = pgTable('vehicle_transfers', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  fromBranchId: uuid('from_branch_id').notNull(),
  toBranchId: uuid('to_branch_id').notNull(),
  reason: text('reason').notNull(),
  reservationId: uuid('reservation_id'),
  status: text('status').notNull().default('RECOMMENDED'), // RECOMMENDED|APPROVED|IN_PROGRESS|DONE|CANCELLED
  distanceKm: integer('distance_km'),
  executedBy: uuid('executed_by'),
  executedAt: ts('executed_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [index('transfers_status_idx').on(t.agencyId, t.status)]);

export const telematicsDevices = pgTable('telematics_devices', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  provider: text('provider').notNull(), // MOCK | TELTONIKA | ...
  externalId: text('external_id').notNull(),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id),
  status: text('status').notNull().default('UNAVAILABLE'), // CONNECTED | UNAVAILABLE | MOCK
  lastSeenAt: ts('last_seen_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('devices_provider_uq').on(t.provider, t.externalId)]);

export const telematicsEvents = pgTable('telematics_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  deviceId: uuid('device_id').notNull(),
  vehicleId: uuid('vehicle_id').notNull(),
  eventType: text('event_type').notNull(), // POSITION|IGNITION_ON|IGNITION_OFF|MOVEMENT|STOP|GPS_LOST|BATTERY_LOW
  payload: jsonb('payload').notNull(),     // normalized: lat,lng,speedKmh,heading,mileageKm,voltage
  occurredAt: ts('occurred_at').notNull(),
  providerMessageId: text('provider_message_id'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('telematics_idempotent_uq').on(t.providerMessageId),
  index('telematics_vehicle_time_idx').on(t.vehicleId, t.occurredAt),
]);

/** Latest known position per device — light read model for the map (rebuildable). */
export const vehiclePositions = pgTable('vehicle_positions', {
  vehicleId: uuid('vehicle_id').primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  lat: text('lat').notNull(),
  lng: text('lng').notNull(),
  speedKmh: integer('speed_kmh').notNull().default(0),
  heading: integer('heading'),
  ignitionOn: boolean('ignition_on'),
  voltage: text('voltage'),
  fixedAt: ts('fixed_at').notNull(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

/** Unified document index (V1 §12): metadata + signed-URL access + expiry. */
export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  kind: text('kind').notNull(), // IDENTITY|LICENSE|CONTRACT|AMENDMENT|INSURANCE|REGISTRATION|VT|INVOICE|RECEIPT|DAMAGE_EVIDENCE|PAYMENT_EVIDENCE|OTHER
  entityType: text('entity_type').notNull(), // customer|vehicle|contract|payment|...
  entityId: text('entity_id'),
  objectKey: text('object_key').notNull(),
  mimeType: text('mime_type').notNull(),
  bytes: integer('bytes'),
  label: text('label'),
  expiresAt: ts('expires_at'),
  metadata: jsonb('metadata'),
  uploadedBy: uuid('uploaded_by'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('documents_entity_idx').on(t.agencyId, t.entityType, t.entityId)]);

/** Outbound messaging queue — SIMULATED until a provider is LIVE (V1 §5). */
export const notificationOutbox = pgTable('notification_outbox', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  channel: text('channel').notNull().default('WHATSAPP'),
  template: text('template').notNull(), // RESERVATION_CONFIRMED|PICKUP_INSTRUCTIONS|DOC_REQUEST|CONTRACT_DELIVERED|PAYMENT_REMINDER|RETURN_REMINDER|EXTENSION_REQUEST|LATE_RETURN|LOCATION_REQUEST
  toPhone: text('to_phone').notNull(),
  payload: jsonb('payload'),
  status: text('status').notNull().default('QUEUED'), // QUEUED|SIMULATED|SENT|FAILED
  provider: text('provider'),
  providerMessageId: text('provider_message_id'),
  integrationStatus: text('integration_status').notNull().default('MOCK'),
  relatedType: text('related_type'),
  relatedId: text('related_id'),
  createdBy: uuid('created_by'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('notif_status_idx').on(t.agencyId, t.status)]);

/** Qualified-signature requests — provider abstracted, mode always labeled (V1 §4). */
export const signatureRequests = pgTable('signature_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  contractId: uuid('contract_id').notNull(),
  contractVersionId: uuid('contract_version_id'),
  provider: text('provider').notNull(), // MOCK | DAMANESIGN
  mode: text('mode').notNull(),         // MOCK | LIVE
  providerRef: text('provider_ref'),
  signerName: text('signer_name').notNull(),
  signerPhone: text('signer_phone'),
  status: text('status').notNull().default('PENDING'), // PENDING|COMPLETED|FAILED|CANCELLED
  evidenceObjectKey: text('evidence_object_key'),
  requestedBy: uuid('requested_by'),
  createdAt: ts('created_at').notNull().defaultNow(),
  completedAt: ts('completed_at'),
}, (t) => [index('sigreq_contract_idx').on(t.contractId)]);

/** Compliance rule registry — source, effective date, config, enable/disable, audited (V1 §16). */
export const complianceRules = pgTable('compliance_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  key: text('key').notNull(),            // FLEET_MINIMUM | VEHICLE_AGE_CAP | ...
  label: text('label').notNull(),
  sourceRef: text('source_ref').notNull().default(''),
  effectiveDate: date('effective_date'),
  config: jsonb('config').notNull(),     // { minimum: 7 } / { ice: 5, hybrid: 6, ev: 7 }
  enabled: boolean('enabled').notNull().default(false),
  updatedBy: uuid('updated_by'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('compliance_rules_uq').on(t.agencyId, t.key)]);

export const RLS_TABLES_V1 = [
  'vendors', 'maintenance_plans', 'maintenance_records', 'vehicle_transfers', 'telematics_devices',
  'telematics_events', 'vehicle_positions', 'documents', 'notification_outbox', 'signature_requests',
  'compliance_rules',
] as const;
