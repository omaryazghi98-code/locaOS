# locaOS — Feature Capability Matrix

Legend:

- **DONE** — implemented and verified enough to use.
- **PARTIAL** — foundation exists, workflow incomplete or needs polish.
- **NEXT** — scheduled in roadmap; not yet implemented.
- **RESEARCH** — needs provider/legal/commercial verification before implementation.
- **DEFERRED** — intentionally postponed.

## Core operations

| Capability | Status | Notes |
|---|---|---|
| Agency/branch management | DONE | Tenant-aware foundation |
| Users/roles/permissions | DONE | API authorization remains authoritative |
| Fleet inventory | DONE | Vehicle/category/model foundation |
| Vehicle state machine | DONE | Conflict-aware transitions |
| Availability | DONE | Reservation + DB conflict protection |
| Reservations | DONE | Quote-linked |
| Reservation conflict protection | DONE | Integration-tested |
| Customer records | DONE | Basic CRM foundation |
| Customer 360 | PARTIAL | Expand history/value/communications |
| Contract generation | DONE | Contextual from rental/reservation |
| Contract versioning | PARTIAL | Snapshot architecture in place; finish inspection/amendment workflow |
| Contract PDF | DONE | FR/AR/EN renderer; verify full snapshot parity |
| Blank contracts | DONE | Traceable blank flow |
| Contract printing | PARTIAL | PDF flow works; complete audit + edge cases |
| Contract e-signature | NEXT | Provider integration required |
| Digital inspections | PARTIAL | Domain/API foundation; richer field UX needed |
| Inspection photos | PARTIAL | Storage foundation; field UX/offline work remains |
| Damage tracking | PARTIAL | Backend foundation; full workflow needed |
| Deposit management | DONE | Append-only / auditable foundation |
| Payments | DONE | MAD + foreign-currency fields |
| Refunds/reversals | DONE | Financial boundaries tested |
| Cash sessions/reconciliation | DONE | Tested |
| Invoicing | NEXT | Must connect quote → contract → invoice → payment |
| Expenses | NEXT | Needed for real profitability |
| Accounting export | NEXT | Required for agency adoption |
| Reporting | PARTIAL | Foundation exists; expand business reports |
| Data exports | NEXT | CSV first, XLSX/PDF where useful |
| Data import/migration | NEXT | CSV/XLSX mapping + legacy migration |

## Money and time

| Capability | Status | Notes |
|---|---|---|
| MAD base accounting | DONE | Integer centimes / BigInt model |
| EUR/USD support | PARTIAL | Existing payment fields + domain support |
| GBP and broader currency set | PARTIAL | Domain foundation; payment UX/provider still needed |
| FX reference rate | NEXT | Provider interface + rate retrieval |
| Agency-confirmed FX rate | PARTIAL | Domain snapshot foundation |
| Frozen transaction FX | NEXT | Must record source/time/user and rate used |
| Mixed-currency payments | NEXT | Payment + remaining-balance UX |
| Rental time engine | PARTIAL | Centralized domain engine created |
| Grace-period policy | PARTIAL | Engine foundation; agency configuration needed |
| Extensions | NEXT | Must use same time/pricing rules |
| Late-return handling | NEXT | Alerts + billing + contract amendment |
| Early-return handling | NEXT | Define refund/charge rules |
| Agency timezone | DONE | Africa/Casablanca foundation |

## Fleet compliance and maintenance

| Capability | Status | Notes |
|---|---|---|
| Vehicle documents | DONE | VT / insurance / vignette foundation |
| Document expiry alerts | PARTIAL | Existing alert/compliance foundation |
| Vignette/road-tax obligations | PARTIAL | Need obligation lifecycle + renewal proof |
| Insurance obligations | PARTIAL | Need full lifecycle + blocking policy |
| Technical inspection obligations | PARTIAL | Need lifecycle + blocking policy |
| Registration/other obligations | NEXT | Configurable obligation types |
| Compliance dashboard | NEXT | Fleet-wide due/expired view |
| Compliance blocking | NEXT | Configurable per obligation |
| Maintenance plans | DONE | V1 foundation |
| Maintenance records/costs | DONE | V1 foundation |
| Predictive maintenance | NEXT | V3/advanced intelligence |
| Vendor management | DONE | Foundation exists |
| Vehicle profitability | NEXT | Requires revenue + expense linkage |

## Customer, sales and communication

| Capability | Status | Notes |
|---|---|---|
| Customer profile | DONE | Basic |
| Rental history | PARTIAL | API/data foundation; richer UI needed |
| Customer spend/value | NEXT | CRM enhancement |
| Customer risk/flags | PARTIAL | Foundation exists; policies need productization |
| Document scanning/OCR | NEXT | Human verification required |
| Public booking page | NEXT | Same availability/pricing engine as internal app |
| Website booking widget | NEXT | Agency-configurable |
| Customer portal | NEXT | Reservation/contract/payment/documents |
| E-signature | NEXT | Provider port |
| WhatsApp notifications | NEXT | Provider integration |
| WhatsApp booking automation | NEXT | Human handoff + explicit uncertainty |
| Darija conversational layer | RESEARCH | Validate UX/privacy/provider approach |
| Review/referral automation | NEXT | Post-rental workflow |
| Loyalty / repeat-renter program | NEXT | Points, tiers, benefits or agency-defined rewards; must remain explainable and auditable |
| Customer compensation / service recovery | NEXT | Credits, discounts, vouchers or benefits granted after incidents; approval and reason required |
| Promotional gifts / partner perks | NEXT | Free gifts or partner benefits attached to a reservation/customer; inventory/eligibility/expiry tracking |
| Partner benefit catalog | NEXT | Agency-managed partner offers, e.g. restaurant, activity, wash, SIM, fuel, toll or other local services |
| Partner voucher issuance/redemption | NEXT | Track who issued, recipient, value/benefit, expiry, redemption and reconciliation |

## Commercial engine

| Capability | Status | Notes |
|---|---|---|
| Basic deterministic quoting | DONE | Shared pricing engine |
| Explainable quote lines | DONE | Rental/extras/discount lines |
| Seasonal pricing | NEXT | Agency-configurable |
| Dynamic pricing | NEXT | Demand/occupancy/lead-time rules |
| Long-stay pricing | NEXT | Productize discounts |
| Event/holiday pricing | NEXT | Morocco-specific calendar/configuration |
| Promotions/coupons | NEXT | After pricing core is stable |
| Loyalty-linked pricing/benefits | NEXT | Benefits may reduce price or add included services; must be explicit and snapshot-able |
| Compensation credits | NEXT | Non-cash credit/discount instrument with reason, approval and expiry policy |
| Partner-funded promotions | NEXT | Track whether a benefit is agency-funded, partner-funded or co-funded |
| Utilization analytics | PARTIAL | Command Center foundation |
| Revenue analytics | PARTIAL | Expand reports |
| Profitability analytics | NEXT | Revenue - expense - downtime |
| Demand forecasting | NEXT | Advanced intelligence |

## Customer benefits, partner offers and mobility credits

| Capability | Status | Notes |
|---|---|---|
| Benefit / reward ledger | NEXT | Append-only grants, adjustments, redemptions and expirations; separate from payment ledger |
| Benefit types | NEXT | Discount, free extra, voucher, gift, service, fuel credit, toll credit and partner offer |
| Eligibility rules | NEXT | Reservation/customer/vehicle/date/channel conditions; no hidden automatic entitlement |
| Manager approval for exceptional compensation | NEXT | Configurable threshold/role approval; reason mandatory |
| Partner funding attribution | NEXT | Record partner contribution versus agency cost for profitability |
| Fuel-card / fuel-credit benefit | NEXT | Track prepaid fuel value/card/voucher without treating it as rental payment unless actually used to settle a receivable |
| Toll / Jawaz prepaid credit | NEXT | Record a prepaid Jawaz recharge or toll credit attached to a rental/customer/vehicle; track Pass identifier, amount, issuer/provider, evidence and redemption/consumption where available |
| Afriquia prepaid fuel benefit | NEXT | Support Afriquia prepaid/rechargeable cards or vouchers for gasoline/diesel as a customer perk, compensation or promotion; provider/product terms must be verified before integration |
| Other mobility partner credits | NEXT | Extensible provider-agnostic model for tolls, fuel, charging, parking or transport partners |
| Benefit redemption / reconciliation | NEXT | Match issued value to redeemed/expired/refunded value and partner invoice/evidence |
| Benefit reporting | NEXT | Cost to agency, partner-funded value, redemption rate, customer retention and campaign ROI |

## Fleet intelligence and integrations

| Capability | Status | Notes |
|---|---|---|
| Telemetry domain | DONE | MOCK provider/foundation |
| Real GPS provider | NEXT | Provider ports + real device ingestion |
| Geofence | NEXT | Evidence-driven alerts |
| Unauthorized movement | PARTIAL | Detection foundation exists; real telemetry needed |
| Device health | NEXT | Provider capability |
| Local storage | DONE | Current dev implementation |
| Production object storage | NEXT | S3-compatible provider |
| WhatsApp provider | PARTIAL | Adapter direction exists; credentials/provider integration pending |
| Signature provider | PARTIAL | Provider port direction exists |
| Accounting integrations | NEXT | Export first, API integrations later |
| Partner benefit providers | NEXT | Provider adapters where APIs/settlement data exist; manual issuance must remain supported |

## UX, accessibility and language

| Capability | Status | Notes |
|---|---|---|
| Desktop console | DONE | Dense desk workflow foundation |
| Tablet strategy | PARTIAL | Needs explicit responsive implementation |
| Mobile field workflow | PARTIAL | Needs explicit field-first UX |
| FR | DONE | Core catalog |
| AR/RTL | PARTIAL | Root persistence fixed; full-screen audit ongoing |
| EN | PARTIAL | Catalog exists; complete screen parity required |
| Keyboard focus | NEXT | Global focus-visible system |
| Dialog accessibility | PARTIAL | ConfirmAction foundation; harden |
| Shared filter UX | PARTIAL | FilterBar needs correction |
| Shared table UX | PARTIAL | Mobile strategy + row interactions needed |
| Shared loading/error states | NEXT | Consolidate primitives |
| Accessibility validation | NEXT | Manual + token-level contrast verification |

## Intelligence and automation

| Capability | Status | Notes |
|---|---|---|
| Alerts engine | DONE | Scheduled/event/signal foundation |
| Contradiction detection | DONE | V1 operational intelligence |
| Transfer recommendations | DONE | Human execution model |
| Command Center recommendations | PARTIAL | Expand explainable operational recommendations |
| Natural-language assistant | DEFERRED | After data foundations are mature |
| AI demand forecasting | DEFERRED | After analytics foundations |
| AI pricing suggestions | DEFERRED | Explainable + human approval |
| Autonomous legal/financial actions | REJECTED | Do not implement without explicit policy decision |

## Platform / SaaS

| Capability | Status | Notes |
|---|---|---|
| Multi-tenant architecture | DONE | App wall + RLS wall |
| Platform/God Mode | NEXT | Separate security boundary |
| Agency onboarding | NEXT | Self-service or guided |
| Plans/entitlements | NEXT | SaaS control plane |
| Trial management | NEXT | Pilot/paid transition |
| Subscription billing | NEXT | Later commercial phase |
| Feature flags | NEXT | Platform control plane |
| Support/break-glass | NEXT | Audited and separate from agency roles |
| Usage analytics | NEXT | Product + billing intelligence |

## Pilot readiness

A feature marked DONE is not automatically pilot-ready. Pilot-ready means the real user flow works end-to-end, in FR/AR/EN, on the intended device, with correct authorization, audit behavior and failure handling.

Before the first free pilot:

- Contracts must be snapshot-correct.
- Time/pricing must agree across reservation, contract and finance.
- Payments/deposits/reconciliation must be trusted.
- Fleet legal obligations must be visible.
- Critical screens must work on phone/tablet/desktop.
- Exports must work.
- Role permissions and tenant isolation must remain green.
- Demo data must contain no contradictory synthetic values.
