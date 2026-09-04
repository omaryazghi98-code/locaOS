# AI Handoff — 2026-09-04 — Integrations & Partner Roadmap

## Decision

locaOS will treat external integrations as a provider-neutral Integration Hub rather than direct provider calls from domain modules.

## Roadmap added

See `docs/INTEGRATIONS_PARTNER_ROADMAP.md` for the authoritative integration/partner path.

Priority ecosystem targets include:

- Moroccan cash/payment networks: Cash Plus, Tashilat, Wafacash, Chaabi Cash, Damane Cash, Barid Cash, Cashway and additional providers discovered through commercial research.
- Card/online payments: CMI, NAPS, Payzone, banks and appropriate international PSPs.
- Communications: WhatsApp Business Platform/Cloud API, SMS, transactional email and push/OTP providers.
- Fleet telemetry: Wialon, Geotab, Teltonika, Traccar, Queclink, Ruptela, local Moroccan providers and legitimate OEM APIs.
- Flight/airport: FlightAware/AeroAPI, Amadeus, Cirium, Aviationstack and airport ecosystem partners.
- Maps/routing: Google Maps Platform, Mapbox, HERE and OpenStreetMap ecosystem.
- Moroccan institutional/compliance ecosystem: NARSA, DGSSI, CNDP, DGI, OMPIC, CNSS, ONDA, ADM, ONCF and relevant trust-service/e-signature ecosystem.
- Mobility benefits: Jawaz/ADM, Afriquia and extensible fuel/toll/parking/charging/transport partners.
- Identity/signature: OCR/document verification providers and legally appropriate e-signature/trust-service providers.
- Insurance/assistance: insurers, brokers, roadside assistance, towing and claims networks.
- Fleet/OEM/maintenance: connected-car APIs, VIN/specification, OBD/telematics, garages, tyres, parts and inspection providers.
- Accounting/ERP: Sage, Odoo, QuickBooks, Xero and Moroccan/accountant-specific systems.
- Travel/partner ecosystem: hotels, activities, restaurants, airport services, SIM/connectivity, car wash/detailing and other local benefits.

## Architectural boundary

External systems are evidence/providers. locaOS remains authoritative for rental state, contract versions, settlement, deposit authority, payments and vehicle lifecycle.

Provider webhook -> adapter -> normalized domain command/event -> authoritative domain service -> audit/activity -> NAVI.

Never allow an external webhook or AI action to directly mutate authoritative tables.

## Current status

- Roadmap: DONE.
- Provider contracts/adapters: NOT YET IMPLEMENTED as a general Integration Hub.
- Individual provider access: must be researched/contracted/authorized before marking any provider integrated.
- Government targets such as NARSA are explicitly authorization-dependent; do not assume a public API or scrape them.
- DGSSI is tracked as a security/compliance relationship, not a normal SaaS API.
- Jawaz/Afriquia remain benefit/mobility integrations, separate from the rental payment ledger.

## Next engineering step

Do not start by wiring ten vendors. Finish the rental financial/operational authority and audit foundation, then implement the Integration Hub primitives and the first production-value adapter (WhatsApp or the first contracted Moroccan payment provider), followed by GPS/maps and then flight/benefit/signature/OCR integrations.

## Safety rule

Do not mass-rewrite existing controllers for integrations. Preserve current domain behavior and add narrow adapter/service boundaries with tests and explicit failure/reconciliation handling.
