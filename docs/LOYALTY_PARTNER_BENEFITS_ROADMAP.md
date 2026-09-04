# Loyalty, Partner Benefits & Mobility Credits — Roadmap

## Product direction

locaOS should support more than price discounts. A rental agency may reward a repeat customer, compensate a service failure, give a promotional gift, or include a benefit funded by a commercial partner.

These benefits must be represented separately from the financial payment ledger while remaining auditable and reconcilable.

## Benefit families

1. **Loyalty rewards**
   - repeat-renter points
   - tiers/status
   - free days or upgrades
   - free extras
   - agency-defined rewards

2. **Service recovery / compensation**
   - goodwill discount
   - account credit
   - free extra
   - voucher
   - partner benefit
   - fuel/toll credit
   - manager-approved exceptional compensation

3. **Promotional gifts**
   - free partner gift
   - activity/restaurant/wash/SIM/etc. voucher
   - campaign-specific benefit
   - reservation-channel promotion

4. **Mobility credits / prepaid products**
   - fuel credit or prepaid fuel card
   - toll credit / Jawaz recharge
   - EV charging credit
   - parking or transport credit
   - other partner mobility products

## Jawaz

The roadmap should support a prepaid/rechargeable Jawaz benefit attached to a reservation, customer, vehicle or campaign. ADM describes Jawaz as a rechargeable electronic toll-payment pass identified by a Pass number, with recharge and transaction/history capabilities. The actual provider integration, commercial terms and available transaction data must be verified before implementation.

Do not model a Jawaz recharge as rental revenue or as a deposit. It is a benefit/mobility-credit transaction with its own funding and redemption/consumption lifecycle.

## Afriquia

The roadmap should support Afriquia prepaid/rechargeable fuel cards or vouchers as benefits for gasoline/diesel, compensation or promotions. Current Afriquia material documents prepaid products including FREE, ACCESS and EASY ONE, with product capabilities varying by offering. Provider/product terms and integration access must be verified before implementation.

Do not hard-code one Afriquia product as the universal model. Use a provider-agnostic benefit/product layer and configure the specific product, value, restrictions and evidence.

## Required ledger semantics

A future `benefit_ledger` should be append-only and separate from `payments`.

Each grant/redemption/adjustment/expiration should preserve:

- agency/tenant
- customer
- reservation/contract when applicable
- vehicle when applicable
- benefit type
- provider/partner
- product or campaign
- face value and currency
- agency cost
- partner-funded amount
- issued by user
- approved by user when required
- issued timestamp
- expiry
- redemption status/reference
- evidence/reference number
- reason/note
- immutable linkage to the originating event

## Accounting boundary

A benefit's face value is not automatically a customer payment.

Examples:
- A 200 MAD goodwill fuel voucher is a benefit expense/cost, not a 200 MAD rental payment.
- A 100 MAD partner-funded voucher may have 100 MAD customer value but 0 MAD agency cost if the partner fully funds it.
- A Jawaz recharge paid by the agency should be traceable as a mobility-benefit cost and must not reduce the rental receivable unless an explicit financial settlement policy says so.
- If a customer later pays a rental balance using a true payment method, that payment remains in the payment ledger.

Exact accounting treatment should be configurable/verified with the agency's accounting policy.

## Approval and abuse controls

- Normal configured benefits can be issued under campaign/eligibility rules.
- Exceptional compensation above an agency-defined threshold requires an authorized approver.
- Every exceptional grant requires a reason.
- Benefits cannot silently change historical contract/settlement snapshots.
- Redemption and cancellation must be traceable.
- Expired/unredeemed value must remain visible.
- No automatic benefit should create a financial liability or discount without an explicit configured rule.

## UX direction

On a reservation/customer workspace, an agent should see:

> **Avantages**
> - Fidélité: 120 points
> - Cadeau partenaire: lavage offert — expire 30/09
> - Compensation: 200 MAD carburant — approuvée par Manager
> - Jawaz: recharge 100 MAD — Pass ••••1234

Issuance should be fast, but the UI must show the funding source and reason when relevant.

## Future reporting

Track:

- benefits issued
- benefits redeemed
- expired value
- agency-funded cost
- partner-funded value
- compensation cost by reason
- loyalty retention/repeat-rental impact
- campaign ROI
- benefit abuse/anomalies

## Implementation order

1. Define provider-agnostic benefit domain + immutable ledger.
2. Add eligibility and approval policy.
3. Add reservation/customer workspace issuance and history.
4. Add partner-funded attribution and reconciliation.
5. Add manual voucher/product issuance first.
6. Add Jawaz/Afriquia provider adapters only after commercial/API verification.
7. Add reporting and retention/ROI analytics.
