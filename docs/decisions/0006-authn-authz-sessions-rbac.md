# ADR-0006 — Session-cookie authentication + server-side RBAC permission matrix

- Status: Proposed
- Date: 2026-08-24

## Context

Staff authenticate from shared office machines and personal phones; sessions must be
revocable instantly (staff turnover, device loss). Authorization must be enforced in the
backend (§5) with granular, auditable capabilities (price overrides, deposit release, forced
vehicle transitions). Customers are not system users in early phases.

## Decision

- **Authentication:** email/phone + password (argon2id via `@node-rs/argon2`), opaque
  session tokens (random 256-bit, stored hashed in `sessions` table) in `HttpOnly`,
  `Secure`, `SameSite=Lax` cookies; server-side expiry + revocation; per-session active
  agency context (ADR-0003). CSRF: SameSite + origin verification on mutating routes.
- **Authorization:** roles per agency (Owner, Manager, Agent, Accountant, Field agent,
  Mechanic…) mapping to a **permission matrix** (`role_permissions`), evaluated by NestJS
  guards on every route; the UI receives permissions only to render affordances — it never
  decides. Sensitive permissions (`contract:price:override`, `deposit:release`,
  `vehicle:transition:force`, `customer:flag:add`, `cash:count`) additionally require a
  reason where §11 demands it, recorded in the audit event.
- Rate limiting at the API edge; login throttling + lockout policy per agency config.
- Password reset out-of-band initially (owner-invoked staff reset); email self-service later —
  do not assume email is primary (§18).

## Consequences

- Instant revocation, no token-expiry leakage class, audit ties every action to a session,
  device, and IP.
- Session store on Postgres adds a read per request — indexed token hash lookup; fine at
  target scale.
- No SSO/OIDC at launch; enterprise SSO is a later additive layer.

## Alternatives considered

- **Stateless JWTs** — no revocation story; overkill for single-domain API; rejected.
- **AuthaaS (Auth0/Keycloak)** — cost + external transfer of auth data (register #4) and weak
  fit for per-agency role granularity; revisit only with a concrete SSO requirement.
