/** Permission registry — RBAC matrix is data (role_permissions rows), guards check these keys. */
export const PERMISSIONS = [
  // IAM
  'agency:read', 'users:manage',
  // Fleet
  'fleet:read', 'fleet:write', 'vehicle:transition', 'vehicle:transition:force',
  // Customers
  'customers:read', 'customers:write', 'customer:flag:add', 'identity:unmask',
  // Reservations
  'reservations:read', 'reservations:write', 'reservations:cancel',
  // Contracts
  'contracts:read', 'contracts:write', 'contracts:blank', 'contract:amend', 'contract:price:override',
  // Inspections
  'inspections:read', 'inspections:write',
  // Finance
  'finance:read', 'payments:write', 'payments:reversal', 'deposits:write', 'deposit:release', 'deposit:charge', 'cash:manage', 'invoice:write',
  // Ops & alerts
  'ops:read', 'alerts:read', 'alerts:resolve', 'reports:read', 'audit:read',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_KEYS = ['owner', 'manager', 'agent', 'field_agent', 'accountant', 'mechanic'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

/** Seed matrix — role → permissions. Owner gets everything by construction in seed. */
export const ROLE_MATRIX: Record<RoleKey, readonly Permission[]> = {
  owner: PERMISSIONS,
  manager: [
    'agency:read', 'fleet:read', 'fleet:write', 'vehicle:transition', 'customers:read', 'customers:write',
    'reservations:read', 'reservations:write', 'reservations:cancel', 'contracts:read', 'contracts:write',
    'contracts:blank', 'contract:amend', 'contract:price:override', 'inspections:read', 'inspections:write',
    'finance:read', 'payments:write', 'deposits:write', 'deposit:release', 'cash:manage', 'ops:read',
    'alerts:read', 'alerts:resolve', 'reports:read', 'audit:read',
  ],
  agent: [
    'agency:read', 'fleet:read', 'customers:read', 'customers:write', 'reservations:read', 'reservations:write',
    'contracts:read', 'contracts:write', 'contracts:blank', 'inspections:read', 'inspections:write',
    'finance:read', 'payments:write', 'deposits:write', 'ops:read', 'alerts:read',
  ],
  field_agent: [
    'agency:read', 'fleet:read', 'customers:read', 'reservations:read', 'contracts:read', 'inspections:read',
    'inspections:write', 'ops:read', 'alerts:read',
  ],
  accountant: [
    'agency:read', 'fleet:read', 'customers:read', 'reservations:read', 'contracts:read', 'finance:read',
    'payments:write', 'payments:reversal', 'deposits:write', 'deposit:release', 'deposit:charge', 'cash:manage',
    'invoice:write', 'ops:read', 'alerts:read', 'alerts:resolve', 'reports:read', 'audit:read',
  ],
  mechanic: [
    'agency:read', 'fleet:read', 'fleet:write', 'vehicle:transition', 'inspections:read', 'ops:read', 'alerts:read',
  ],
};
