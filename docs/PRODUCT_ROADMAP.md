# locaOS — Master Product Roadmap

**Status:** Active roadmap / product execution source of truth  
**Branch:** `arena/01a031b1-locaos`  
**Product:** Morocco-first B2B car-rental operating system

This roadmap turns the master product specification, the current implementation, the recent UX/contract/finance work, and the Moroccan rental-software market gaps into an execution plan.

## 1. Rules for execution

1. Do not build features merely because competitors advertise them. Build them when they improve the real agency workflow.
2. Preserve one source of truth: reservation → vehicle → contract → inspection → finance → reporting.
3. Never silently rewrite historical financial or contract data.
4. External integrations must report their real state (connected, unavailable, mock, failed).
5. High-impact financial, legal, security and customer-impacting actions remain human-approved.
6. Mobile/tablet is a first-class operating surface, especially for field agents.
7. French, Arabic/RTL and English are first-class product languages.
8. Exports and data portability are product requirements, not optional extras.
9. Every new subsystem needs domain rules + API behavior + UI behavior + tests + handoff notes.
10. Do not create competing business rules in page components.

## 2. Current status snapshot

### Green / already strong

- Multi-tenant agency model + PostgreSQL RLS
- Authentication + roles/permissions
- Fleet and vehicle state machine
- Reservation availability/conflict protection
- Customer records and customer 360 foundation
- Contracts + immutable versions + amendments foundation
- Contextual contract generation from reservation/vehicle
- Contract PDF generation in FR/AR/EN
- Digital inspection foundation
- Payments, deposits, refunds/reversals and cash reconciliation
- Maintenance subsystem + alerts
- Telemetry/operational-intelligence foundation
- Branch transfers
- Documents + compliance registry foundation
- Command Center + alerts + prioritized actions
- Shared UX primitives
- Windows embedded PostgreSQL workflow
- One-click START/STOP scripts + DEV_MENU
- Centralized rental time engine foundation
- FX/foreign-settlement domain foundation
- Persistent AI handoff documentation

### Yellow / implemented but needs completion or polishing

- Responsive desktop/tablet/mobile behavior
- Arabic RTL persistence and full-page consistency
- Shared filtering/sorting/list UX
- Contract inspection serialization
- Contract amendment pricing/period correctness
- Contract UI ↔ PDF exact consistency
- Fleet legal/compliance lifecycle
- FX rate fetching + operator-confirmed transaction rates
- Foreign-currency payment UI
- Reporting and management analytics
- Export framework
- Finance beyond payment ledger (invoicing/expenses)
- Real field inspection UX
- Loading/error/empty states consistency
- Accessibility/focus/dialog behavior
- User onboarding and configuration

### Red / missing or only conceptual

- Public booking engine / website widget
- Customer portal
- E-signature provider integration
- Document OCR/scanning
- Real GPS provider integrations
- WhatsApp messaging integration in production
- WhatsApp booking automation
- Dynamic/seasonal pricing
- Data import/migration from Excel/legacy systems
- Full invoicing/tax workflow
- Expense management and profitability engine
- Advanced custom reports/exports
- Advanced analytics/demand forecasting
- Predictive maintenance
- AI assistant / reasoning layer
- Subscription/entitlements/billing control plane

## 3. Phase A — Stability and pilot foundation

**Goal:** make the existing product trustworthy enough for the first real agencies.

### A1 — Contract integrity

- Complete inspection IDs + mileage/fuel/condition references in contract snapshots.
- Make amendments produce complete new immutable versions.
- Enforce rental-period/quote-day consistency.
- Ensure contract UI and PDF render from the same version.
- Support populated + partial + true blank contracts.
- Add contract audit trail and printable history.
- Verify FR/AR/EN contract rendering and RTL.

**Gate:** no contract can display contradictory dates, days, price, deposit or vehicle data.

### A2 — Money, FX and finance integrity

- Complete FX rate source/provider interface.
- Show reference rate separately from agency-confirmed transaction rate.
- Freeze FX rate, source, timestamp and confirmer on each transaction.
- Support EUR/GBP/USD plus the supported currency list without weakening MAD accounting.
- Handle mixed-currency payment + remaining balance.
- Apply same rules to deposits, refunds and cash reconciliation.
- Add invoice/receipt numbering foundation.
- Introduce expense ledger foundation.

**Gate:** every MAD equivalent is reproducible from the recorded transaction rate.

### A3 — Rental time engine everywhere

- Route quoting through one time policy.
- Centralize grace periods and billable-day calculation.
- Extensions.
- Early returns.
- Late returns.
- Overdue state and alerts.
- Agency timezone rendering.
- Audit the use of dates in contracts, reports, alerts and finance.

**Gate:** every screen and calculation agrees on rental duration.

### A4 — Fleet legal/compliance engine

Turn vehicle legal paperwork into an operational lifecycle:

- Insurance
- Vignette / road-tax obligations
- Technical inspection
- Registration/documents
- Other agency-configured permits/obligations
- Expiry dates
- Payment due dates
- Renewal proof/receipt
- Document scans
- Responsible person
- Renewal history
- Reminder windows
- BLOCK/WARN policy per obligation

**Gate:** an expired mandatory obligation can visibly block dispatch/assignment when configured, with a clear reason.

### A5 — Operational UX / responsive / i18n

- Desktop command center density polish.
- Tablet navigation strategy.
- Mobile field workflow.
- Shared responsive breakpoints.
- Accessible keyboard focus.
- Dialog focus/scroll/background isolation.
- Shared loading/error/empty states.
- Controlled FilterBar.
- DataTable mobile strategy.
- Single density preference source.
- Complete FR/AR/EN catalog coverage.
- Arabic RTL on reload/navigation/deep links.

**Gate:** critical flows work at phone, tablet and desktop sizes in FR/AR/EN.

### A6 — Functional action audit

Audit every visible action across:

- Command Center
- Today/Brief
- Reservations
- Customers
- Contracts
- Fleet
- Finance
- Calendar
- Alerts
- Reports
- Field
- Focus
- Map

For every action: working, permissioned, feedback, failure state, audit effect, i18n and responsive behavior.

## 4. Phase B — Agency MVP completeness

**Goal:** cover the practical software expectations of a Moroccan rental agency.

### B1 — Customer CRM 360

- Full rental history
- Spend / revenue contribution
- Outstanding balance
- Deposits and refunds
- Document expiry
- Driver/identity details
- Communication history
- Notes
- Flags/risk controls
- Frequent-customer indicators
- Customer-level reporting

### B2 — Digital inspection / handover

- Mobile-first departure/return inspection
- Photos and evidence
- Car damage diagram / zones
- Before/after damage state
- Mileage/fuel capture
- Customer acknowledgement/signature
- Offline queue design for field work
- Attach inspection to contract version
- Damage → deposit charge → payment linkage

### B3 — Document capture

- CIN/passport/licence scanning
- OCR with human confirmation
- Automatic field suggestions
- Document expiry extraction
- Secure encrypted storage
- Audit trail of who verified data

### B4 — Invoicing and accounting workflow

- Quote → reservation → contract → invoice
- Invoice numbering
- Credit/refund/correction flow
- Customer balance
- VAT/tax configuration where applicable
- Accountant export
- Payment reconciliation
- Cash reconciliation
- Expense categories
- Vehicle/branch profitability inputs

**Legal/tax rules must remain configurable and source-labelled until formally verified.**

### B5 — Exports and portability

First-class export support for:

- Customers
- Vehicles
- Reservations
- Contracts
- Payments
- Deposits
- Invoices
- Expenses
- Maintenance
- Compliance
- Revenue/statistics

Formats: CSV first, XLSX/PDF where appropriate.

Later: custom export builder with date/range/filter selection.

**Product principle:** never trap an agency's data.

### B6 — Import / migration

- CSV/XLSX import
- Column mapping
- Preview and validation
- Duplicate detection
- Safe rollback
- Import report
- Existing-software migration templates
- Guided onboarding migration service

## 5. Phase C — Sales, booking and customer experience

**Goal:** turn locaOS from internal back-office software into an agency sales engine.

### C1 — Public booking engine

- Website booking page/widget
- Live availability from the same reservation engine
- Category/vehicle selection
- Quote calculation
- Extras
- Customer details
- Deposit/payment
- Confirmation
- Booking reference
- Agency-configurable rules

### C2 — Customer portal

- Reservation
- Contract
- Invoice/payment status
- Deposit
- Pickup/return instructions
- Document upload
- Contract signing
- Extension request
- Support/contact

### C3 — E-signature

- Provider port
- Signature requests
- OTP/email/link workflow as provider allows
- Signed timestamp/evidence
- Signed PDF archival
- Signature state in contract version
- Explicit provider status (never fake success)

### C4 — WhatsApp communications

- Booking confirmation
- Quote sharing
- Contract delivery
- Payment reminders
- Pickup reminders
- Return reminders
- Document requests
- Post-rental feedback

## 6. Phase D — WhatsApp booking automation

**Goal:** make WhatsApp a sales and operations channel rather than a disconnected chat app.

Target flow:

`Message → understand request → availability → quote → collect missing data → human confirmation where needed → reservation → contract → deposit → reminders`

Requirements:

- Human handoff
- Conversation history
- Explicit confidence/uncertainty
- No autonomous financial/legal decisions
- Duplicate booking protection
- Rate-limit / anti-spam controls
- Audit trail for automation actions
- FR/AR/EN language handling
- Darija support as an experimental layer

## 7. Phase E — Pricing and revenue intelligence

### E1 — Dynamic / seasonal pricing

Configurable rules for:

- Season
- Weekday/weekend
- Rental duration
- Lead time
- Vehicle category
- Branch
- Airport pickup
- Demand/occupancy
- Events/holidays
- Long-stay discount
- Customer segment

Every generated price must remain explainable.

### E2 — Profitability

- Revenue per vehicle
- Revenue per branch
- Cost per vehicle
- Maintenance cost
- Insurance/legal cost
- Rental utilization
- Contribution margin
- Customer profitability
- Fleet replacement signals

### E3 — Advanced analytics

- Utilization trend
- Revenue trend
- Fleet performance
- Booking funnel
- Cancellation/no-show
- Lead source
- Average rental value
- Repeat customer rate
- Outstanding balances
- Forecasts

## 8. Phase F — Fleet intelligence

### F1 — Real GPS integrations

- Provider ports
- Position ingestion
- Device health
- Geofences
- Mileage/odometer reconciliation
- Unauthorized movement alerts
- Cross-border/risk signals
- Evidence-driven alerts

### F2 — Maintenance intelligence

- Predictive maintenance
- Repeated fault detection
- Cost forecasting
- Downtime prediction
- Parts/vendor history
- Maintenance scheduling around reservations

### F3 — Fleet compliance intelligence

- Obligation calendar
- Fleet-wide risk view
- Renewal workload
- Compliance blocking rules
- Document expiry forecasting

## 9. Phase G — Operational intelligence / AI

Use the existing philosophy:

`RECORD → DETECT → EXPLAIN → RECOMMEND → HUMAN APPROVAL → ACTION`

Possible capabilities:

- Command Center recommendations
- Demand warnings
- Maintenance recommendations
- Pricing suggestions
- Staffing/load warnings
- Contract contradiction detection
- Customer-risk context
- Natural-language search over agency data
- Owner/manager AI assistant

AI must remain explainable and must never silently alter legal/financial/security state.

## 10. Phase H — Platform / SaaS control plane

This is for the company operating locaOS, not individual agencies.

- Agency onboarding
- Subscription plans
- Entitlements / feature flags
- Trial periods
- Founding-agency pricing
- Billing
- Support tools
- Platform audit
- Break-glass support sessions
- Health monitoring
- Release/rollout controls
- Usage analytics
- Remote configuration
- Secure agency-level provisioning

Tenant security must remain separate from platform administration.

## 11. Pilot and monetization path

### Phase 0 — Free experimental pilot

Target: 5–10 carefully chosen agencies.

- 0 cost
- No profit goal
- Free access
- Onboarding + training
- Weekly feedback
- Real operational use
- Measure time saved, errors avoided, adoption and retention

In exchange, participating agencies provide feedback, real workflow observations and permission to use anonymized outcomes as product evidence.

### Phase 1 — Founding agencies

The first successful pilots become founding partners.

Potential benefits:

- Permanent preferential price
- Early access to new features
- Priority support
- Direct product feedback channel
- Optional public case study / logo with permission

### Phase 2 — Public SaaS

Pricing model should likely combine:

- Base subscription by agency/fleet size
- Optional add-ons (WhatsApp automation, advanced analytics, integrations, etc.)
- Optional onboarding/migration package
- Optional premium support

Do not monetize before the product has repeatable value and operational stability.

## 12. Weekly execution rule

Every implementation week should produce:

1. One primary business outcome.
2. The smallest coherent code change that achieves it.
3. Tests covering the invariant.
4. Manual smoke verification when UI/workflow is involved.
5. Updated handoff / roadmap status.

Avoid opening five unfinished feature tracks simultaneously.

## 13. Next execution order

### Immediate next sequence

1. Contract snapshot repair + inspection serialization + amendment correctness.
2. FX provider/rate workflow + foreign-currency payment UX.
3. Fleet legal/compliance lifecycle.
4. Export foundation + accounting/report exports.
5. Expense + invoice foundation.
6. Functional action audit.
7. Responsive/mobile/tablet + complete RTL polish.
8. Customer 360 expansion + document scanning.
9. Digital inspection/photo/signature workflow.
10. Public booking engine.
11. E-signature.
12. WhatsApp communications.
13. WhatsApp booking automation.
14. Dynamic pricing.
15. Import/migration.
16. Real GPS.
17. Profitability/analytics.
18. AI/advanced intelligence.
19. SaaS/platform control plane.

## 14. Definition of pilot-ready

locaOS is ready for the first real agency pilots when all of these are true:

- No known critical data-integrity issue.
- Contract UI and PDF agree exactly.
- Pricing/time rules are deterministic and explained.
- Payments/deposits/reconciliation are trustworthy.
- Vehicle legal obligations are visible and actionable.
- Core workflows work on desktop/tablet/phone.
- Arabic/FR/EN work across navigation and deep links.
- Exports work.
- Critical actions have success/failure feedback.
- Role permissions are enforced server-side.
- RLS/tenant isolation tests remain green.
- Demo data is internally consistent.
- A new agency can be onboarded without developer intervention for routine tasks.

## 15. What not to build yet

Do not build these before the pilot foundation is stable:

- Full B2C marketplace
- Autonomous financial decisions
- Autonomous legal/compliance decisions
- Autonomous vehicle/security actions
- Complex AI agents without reliable operational data
- Provider-specific integrations without stable provider ports
- Feature-heavy dashboards with no operational decision attached
