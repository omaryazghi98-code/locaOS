# ADR-0012 — V1 integration ports: signature, messaging, telematics (honest modes)

- Status: Proposed (implemented in V1)
- Date: 2026-08-24

## Context

V1 adds three external-integration domains (§4 signature, §5 WhatsApp, §7 GPS). The
product rules are absolute: no faked integrations, no faked successful signatures, honest
status labels (§26; V1 §4/§5), and no coupling of the contract domain to Damanesign.

## Decision

One provider port per domain, selected by env at boot, honest fallback to MOCK:

1. **SignatureProvider** — `MockSignatureProvider` (requests stay PENDING; completion is an
   explicit human action stamped `SIMULATED`; audit trail) and `DamanesignProvider`
   (UNAVAILABLE without credentials — refuses to emulate; call shape follows the public
   developer portal and must be validated against real credentials before LIVE use).
   Contract lifecycle gains `GENERATED`/`SIGNATURE_REQUESTED` states; the blank-paper
   workflow remains untouched — digital and physical coexist.
2. **MessagingProvider** — `MockMessagingProvider` (files every message as `SIMULATED` in
   `notification_outbox`; never claims SENT) and `WhatsAppBusinessProvider` (Cloud API;
   UNAVAILABLE without token/phone-id). Nine templates rendered server-side.
3. **TelematicsProvider** — provider-normalized ingestion (`POST /api/telematics/ingest`,
   bearer-token, idempotent by provider message id) into append-only
   `telematics_events` + a `vehicle_positions` read model; Mock devices are explicitly
   `status='MOCK'` and labeled SIMULATED in the UI. Five contradiction signals
   (GHOST_MOVE, GPS_LOST_RENTED, PHANTOM_RENTAL, UNAUTHORIZED_USE, TRANSIT_STALLED) run
   as ADR-0010 signals with hysteresis: DETECT → EXPLAIN → ALERT, never act, never accuse.

Status board: `GET /api/integrations/status` returns per-provider CONNECTED/MOCK/UNAVAILABLE
with human explanations; the UI surfaces it.

## Consequences

- Core domains never import provider SDKs; adapters only.
- The demo/seed data uses MOCK devices and messages — visibly labeled.
- Going LIVE for any provider = setting env credentials + validating the adapter against
  the real API in staging (Damanesign call shape is unverified until then).

## Alternatives considered

- Direct Damanesign/WhatsApp calls inside controllers — violates §26 and coupling rules.
- Fake success in mock mode — explicitly forbidden; PENDING + human completion instead.
