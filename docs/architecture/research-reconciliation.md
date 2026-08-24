# Research Reconciliation — Phase 0 ⇄ Research Document

- Date: 2026-08-24
- Inputs: `docs/research/moroccan-rental-platform-research.md` (read in full, 589 lines,
  40 cited sources) × all Phase 0 artifacts.
- Method: claim-by-claim and feature-by-feature comparison; external verification for facts
  the architecture depends on ([verification register](../verification/register.md));
  research terminology preserved throughout (crosswalk in §1.3).
- Result: Phase 0 artifacts amended (list in §A); **no application code exists yet**;
  nothing in this step is irreversible.

**Reading note:** the research is treated as *product research with citations*, not as
verified technical/legal truth (per the project brief). Where research and the architecture
diverge, the divergence is stated explicitly with reasoning — the research is never
"silently fixed."

---

# Part I — Re-evaluations requested

## 1. Vehicle state model re-evaluation

### 1.1 What the research actually describes

The mandated 14-state lifecycle **plus named exception flows that are not states**:
"GHOST STATE" (GPS movement while AVAILABLE), "MAINTENANCE CONFLICT" (reserved + predictive
maintenance trigger), "phantom booking" (RENTED but stationary at agency), "UNAUTHORIZED USE"
(contract expired but moving), "Fourrière" seizure (a *reason* for IMMOBILIZED).

### 1.2 Options considered

| Option | Description | Assessment |
|---|---|---|
| A. Single 14-state machine | One enum; exceptions are interrupting states with recorded return path (Phase 0 stance) | Matches mandated vocabulary; loses concurrent-exception nuance |
| B. Two axes (physical state × rental pipeline) | e.g. `MAINTENANCE` on axis 1 while pipeline says `RESERVED` | No information loss, but doubles UI, permissions, queries, and every alert condition for marginal gain at current maturity; agencies speak in **one** status |
| C. State machine + derived condition layer | One authoritative machine (the 14 states) + continuously evaluated *signals* (ghost state, phantom booking, unauthorized use, maintenance conflict) that never mutate state themselves | Contradictions are **observations**, not statuses; telemetry is testimony, not verdict |

### 1.3 Decision (ADR-0010): Option C

- **One authoritative operational state machine** with exactly the 14 mandated states.
  Exceptional states (MAINTENANCE, IMMOBILIZED incl. Fourrière, ACCIDENT, UNAVAILABLE) are
  *interrupting* states that record the interrupted pipeline position and require an explicit
  exit target — no silent return to AVAILABLE.
- **OVERDUE** is a *system-owned materialized derived state*: entered/cleared only by the
  scheduled evaluator (deterministic temporal predicate).
- **Derived condition layer (`VehicleSignal`)**: continuously evaluated predicates over
  status × telemetry × contracts (GHOST_STATE, PHANTOM_BOOKING, UNAUTHORIZED_USE,
  MAINTENANCE_CONFLICT, PREAUTH_EXPIRING, FLEET_BELOW_MINIMUM, …). A signal raises alerts
  and can **request** a transition through an Approval — it never mutates authoritative
  state. Rationale: GPS noise must not corrupt operational truth; §14 forbids
  detect-and-act.
- **Fleet lifecycle axis unchanged** (`fleetStatus` IN_FLEET/FOR_SALE/SOLD/RETIRED —
  disposal/acquisition is a different tempo).
- Revisit trigger (documented, not laziness): if production shows ≥3 genuinely concurrent
  exception dimensions on single vehicles, split into Option B. Not chosen for coding ease —
  chosen because a single asserted status matches the operational speech of agency staff and
  keeps noisy telemetry out of the source of truth.

**Terminology crosswalk (research ↔ locaOS)** — preserved in code comments and UI labels:

| Research term | locaOS term |
|---|---|
| Caution (deposit) | Deposit (`deposits`) |
| Blank Slate print | Blank contract (`Contract.status = BLANK_ISSUED`) |
| Ghost state / ghost movement | Signal `GHOST_STATE` |
| Maintenance conflict | Signal `MAINTENANCE_CONFLICT` |
| Fourrière (seizure) | IMMOBILIZED with reason `AUTHORITY_SEIZURE` |
| Franchise / Super CDW | Deductible / deductible waiver (insurance block) |
| Visite technique (VT), vignette (TSAV) | Vehicle document types |
| Admission Temporaire (AT) | Cross-border authorization flag (contract + geofence) |
| MRE (Marocains Résidant à l'Étranger) | Customer segment `MRE` |
| PLBS (CMI pre-authorization) | Deposit method `CARD_PREAUTH` (provider `CMI_PLBS`) |
| Constat Amiable | Accident form (damage/accident evidence) |

## 2. Contract architecture re-evaluation

| Research requirement | Phase 0 stance | Reconciliation |
|---|---|---|
| Configurable, localized engine; FR/AR/EN | Structured JSON + versioned templates + Chromium PDF | **Confirmed.** Template set: FR + AR in MVP, EN in V1 (template maintenance is the real cost) |
| Customer-populated contracts | Agent-populated + blank paper only | **Added:** pre-arrival **intake link** (tokenized public URL) writing into structured DRAFT fields — V1/V2 (needs WhatsApp/links); MVP keeps agent-populated + paper |
| Blank printable contracts ("Blank Slate") | BLANK_ISSUED stub + numbering authority + reconcile/void | **Confirmed unchanged** — research independently validates; add scanned-sheet photo (`scanned_object_key`) as reconciliation evidence |
| Contract numbering | Per-agency DB sequence, gap-audited | **Confirmed** ("mathematically sound" = deterministic, gap-visible) |
| Amendments / vehicle replacement | Structured amendments (VEHICLE_REPLACEMENT) | **Strengthened:** replacement carries **insurance + deposit liability continuity** without terminating the original financial arrangement; requires fresh departure inspection linked to the new version |
| Inspection references | Inspection ↔ contract links | **Strengthened:** contract version references departure inspection; return inspection diffs against it; damage billing links to both |
| Insurance in contract | Insurance policy entity existed | **Strengthened:** contract content gains an **insurance block** (franchise amount, CDW/Super CDW, exclusions: tires/glass/undercarriage) that feeds inspection checklist zones — exclusions become checkable damage zones |
| Geographic restrictions (Ceuta/Melilla, Tanger Med, AT) | Geofence kinds existed (BORDER) | **Strengthened:** structured **cross-border authorization block** in contract content (flag + AT reference); geofence enforcement only when telemetry is live (V2) |
| CNDP consent in contract | Not modeled | **Added:** `ConsentRecord` + consent block in contract content; auditable, per-purpose (GPS tracking, marketing) |
| Driver eligibility (age 21/23 per category, license held ≥2 yrs, expiry during rental) | Not modeled | **Added:** configurable eligibility rule pack — classified **industry practice** (agency CGVs), not law; blocks are warnings by default, hard blocks per agency config |
| Loi 43-20 qualified signatures | Image signature + hash; e-sign port | **Kept with flag:** research claim "exact legal weight as wet-ink" is an **overstatement** (qualified signature carries a presumption of validity under the Loi 43-20/53-05 framework; courts assess). Port + pilot in V1; hybrid paper remains core |
| "Blockchain-style immutable timestamps" | Append-only audit + version hashes | **Divergence kept:** append-only DB with hashes achieves the goal; no blockchain introduced (research intent = tamper-evidence, preserved) |

## 3. Alert architecture re-evaluation (100+ concepts → 6 buckets)

The rule-engine design (ADR-0009) holds; the research's matrix is the first rule-pack input.
Taxonomy for all ~120 alert concepts (100-rule matrix + 20 hidden problems):

| Bucket | ~Count | Definition & examples |
|---|---|---|
| **Domain events** | ~20 | Already normalized telematics events (VehicleMoved, IgnitionOff, GpsDisconnected, CrashDetected, GeofenceExited…) + business events (ReservationCreated, ContractSigned, PaymentRecorded, InspectionSubmitted, CashSessionClosed, DataExported, FineReceived) |
| **Rules** (reactive evaluation on events) | ~55 | e.g. #2 GPS lost >30 min RENTED, #7 high-G crash, #21 departure in 2h vehicle not at branch, #35 caution not captured, #72 invoice missing ICE/IF, #91 unrecognized login |
| **Derived conditions** (signals — continuous predicates) | ~15 | GHOST_STATE, PHANTOM_BOOKING, UNAUTHORIZED_USE, MAINTENANCE_CONFLICT, OVERDUE base, FLEET_BELOW_MINIMUM (#100), PREAUTH_EXPIRING (#36), utilization >95% (#56), retention-approaching (#98) |
| **Scheduled jobs** | ~12 | Document expiry sweeps (VT #42, RC #43, vignette/TSAV January list #44, battery age #59), seasonal prep (wipers #53, AC #54), retention/anonymization *queue*, briefs, recall VIN cross-ref (#57) |
| **Notification templates** | shared layer | Channel-agnostic content (WhatsApp/SMS/in-app); MVP = in-app only |
| **AI insights** (V2/V3) | ~8 | Revenue-drop analysis (#76), B2B churn, tire-wear prediction, battery drain, pricing suggestions, ROI flags, damage triage, rebalancing |

### §14 conversions (research "system action" → locaOS action kind)

The research auto-executes many actions. Per §10/§14 of the brief these become
`REQUIRE_APPROVAL` or `SUGGESTION` (a draft the human accepts):

- **Auto-bill/auto-deduct** (#49 fuel surcharge, #51 spare tire, #52 missing triangle, #62
  EV cable 3,500 MAD, #86 extra mileage invoice, #87 late-return penalty, #38 fines added to
  invoice) → **draft charge requiring human confirmation**. Amounts always human-confirmed.
- **Auto-tag/risk-profile** (#5 speeding tag, #19 score penalty, #16 regional warning) →
  evidence recorded on the rental; risk score consumes **objective events only**, computed
  transparently; no automatic customer messaging with legal claims.
- **Auto-contact with legal content** (#3 insurance-void SMS at border) → alert + human
  sends (message text itself needs legal review; V2).
- **Auto-dispatch** (#7 tow truck) → detect + suggest options.
- **Auto-block** (#11 MIL blocks next reservation — kept as hard block since physical
  safety, config-on; #25 block unpaid extension — kept, financial control; #29/30 expired
  license/passport — kept as hard block, eligibility pack) — the *kept* blocks are
  preventive constraints, not punitive actions.
- **Refund revert (#74)** → refunds already require approval in ADR-0008.

### Rejected or deferred alert concepts (explicit, with reasons)

| Concept | Verdict | Reason |
|---|---|---|
| #15 silent 02:00–05:00 movement logging for "risk profiling" | **Rejected** | Covert profiling of customers; CNDP exposure (Loi 09-08); no consent path |
| Fatigue Dispatcher (hidden #11, Ramadan-shift scheduling of *employees*) | **Rejected (revisit only with employee consent + labor-law review)** | Employee behavioral profiling |
| Starter-kill relay at ferry boarding (hidden #3) | **Deferred → default-rejected** (open decision G.5) | Remote immobilization = safety + liability hazard; §14 |
| #93 block full customer DB export | **Kept, strengthened** | Permission + rate limit + audit + alert (security baseline) |
| #98 auto-anonymize at hard-coded 1 year | **Converted** | No universal 1-year rule found in Loi 09-08 → retention per data category, configurable, human-triggered anonymization with audit |

## 4. AI architecture re-evaluation

Research intent: contextual copilot reasoning over reservations, vehicles, contracts,
payments, inspections, GPS, maintenance, customers, finance, alerts. Research mechanism:
"LLM **fine-tuned exclusively** on the agency's proprietary database." Divergence (kept, reasoned):

- **Provider-agnostic `AiProvider` port** added to `packages/integrations` — the core never
  couples to one vendor (OpenAI/Anthropic/local model are adapters).
- **Grounding via RAG + tool calls over tenancy-scoped application services**, not
  fine-tuning: operational Q&A is tabular/numerical, must reflect *current* state, must stay
  per-tenant isolated, and fine-tining would bake customer data into weights (CNDP exposure).
  The research intent — "reason exclusively over this agency's data" — is preserved by
  **per-tenant grounding scope**.
- Typed answers (FACT/INFERENCE/RECOMMENDATION/UNCERTAINTY), every FACT cites record IDs,
  explicit confidence — unchanged, now also matches the research's example output shape.
- **No write path** (ADR-0009): the research's example ("adjust tomorrow's pricing, draft
  email to supplier") becomes *AI drafts an Approval request; human decides*. Multi-domain
  reasoning (revenue ↓ → downtime + pricing + utilization + competitor data) is supported by
  the same read model that powers reporting; no new coupling.

## 5. Morocco-specific integrations & assumptions (honest status)

| Integration | Research claim | Verified status | Architecture slot | Ships |
|---|---|---|---|---|
| **CNDP** (Loi 09-08) | Native compliance; F211/F112 automation; geolocation OK for assets, no covert employee monitoring | Regime VERIFIED (register #3); transfer rules VERIFIED (#4); asset-protection geolocation PARTIALLY VERIFIED; **F211/F112 form numbers UNVERIFIED** | Consent records, retention config per data category, GPS-purpose consent in contract; **no auto-generated CNDP forms until numbers verified** | MVP (concepts), V1+ (aids) |
| **NARSA** | Fine PDF OCR + radar matching + "NARSA API clears vehicle" | Infractions platform exists (register); **API existence UNVERIFIED; PDF formats unverified** | `FinesPort` (upload + manual match first); OCR adapter MOCK until real samples | V2 (manual-assist), OCR later |
| **DGI / SIMPL e-invoicing** | Art. 145 CGI + UBL 2.1 + 2026 mandate | **Mandate + calendar VERIFIED** (LF 2024/Art. 145 IX; clearance model; PME wave Jan 2027 — agencies are PME); **UBL vs CII: sources say "UBL or CII" → keep format configurable; DGI platform specs need primary source** | Invoice mandatory-mentions validation (config) in MVP; `EInvoicingPort` (UBL/CII export, clearance) | V1 (validation + export), clearance when DGI portal specs are stable |
| **CMI** | PLBS pre-auth deposits; online payments | Gateway VERIFIED (register #1) | `PaymentGateway` adapter | V1 |
| **Fatourati** | Payment links for extensions/balances | **Service VERIFIED** (CMI/Maroc Telecommerce bill-payment; Fatourati QR 2026); **creditor onboarding path for rental agencies UNVERIFIED** | `PaymentGateway` capability `PAYMENT_LINK` | V1 (pending onboarding facts) |
| **Damanesign** | Qualified e-signature API | TSP VERIFIED (register #6); developer portal cited by research | `SignatureProvider` adapter (pilot) | V1 pilot (open decision G.3) |
| **Barid eSign** | Alternative TSP | Provider VERIFIED (register #7); API docs UNVERIFIED | `SignatureProvider` adapter (secondary) | V1/V2 |
| **WhatsApp Business** | Primary channel; contracting, reminders, payment links | Platform real; **costs/template policy unverified** (register #12); opt-in/consent required | `MessagingChannel` adapter; notification templates channel-agnostic | V1 (open decision G.4) |
| **GPS/Teltonika** | FMB003/FMB130, CAN-bus, OBD PIDs | Devices VERIFIED; CAN data availability across mixed fleet **technically uncertain** | `TelematicsProvider` port + mock; EV PIDs in event schema | V2 live (MOCK earlier) |
| **Airport/flight data** | Flight Tracker API for dispatch timing | Provider TBD; feasibility fine | `FlightInfoPort` (reservation already has flight fields) | V2 |
| Jawaz (Autoroutes du Maroc) tolls | Auto-bill tolls | **UNVERIFIED API** | parking lot | — |
| OEM digital key | Unlock/start via phone | Speculative | rejected for roadmap (third-party OEM dependency) | — |
| Broker renewal API (#43) | Auto-insurance renewal initiation | **UNVERIFIED** | task + manual step instead | — |
| Charging-station API (#67) | Reroute EVs | **UNVERIFIED** | parking lot (V3 EV pack) | — |
| Moteur.ma scraping (liquidation) | Auto valuation | ToS-sensitive | replaced by manual valuation entry in liquidation advisor | V3 (manual) |

Nothing above is "integrated." All adapters ship **UNAVAILABLE/MOCK** until real credentials
and verified interfaces exist (§26 labeling, enforced in AGENTS.md).

## 6. "Features nobody asked for" — classified

| Class | Features (research numbering) |
|---|---|
| **Realistic near-term differentiators** (V1–V2, no external deps) | #1 Profit-padding detector (damage charges vs repair tickets *report*), #2 B2B churn report, #3 Ghost-fleet rebalancing *calculator*, #8 battery-drain rule (needs telemetry → V2), MAP floor price (hidden #16), cleaning triage by next departure (hidden #6), SLA mechanic tracker (hidden #18) |
| **Technically difficult but viable** (V2–V3) | #4 tire-wear via driving style, #5 dynamic caution sizing (suggestion-only), #6 liquidation advisor (manual valuation), #10 subrogation dossier compiler, #9 MRE segmentation (consent-based only) |
| **Dependent on third-party data/hardware** | #7 weather-driven pricing (weather API commodity — V3), Jawaz, digital key, charging-station API, flight APIs |
| **Speculative** | "Smart contracts" (research V3 row), fine-tuned LLM, sentiment analysis of WhatsApp, SEO automation, "remaining 80 edge cases" and "subsequent 40 features" (the research itself does not enumerate them — cannot be architected) |
| **Inappropriate / high-risk** (rejected or consent-gated) | Starter-kill at border, silent night profiling (#15), employee fatigue profiling, auto deposit deduction (#62), unreviewed FX "auto-correction" (#85 — FX conversion always human-confirmed at entry), hard-coded 1-year anonymization (#98) |

## 7. The five "killer features" — ranked, not accepted

Scores 1–5 (5 best). "Pain" = agency pain, "Freq" = frequency of the pain, "WTP" =
willingness to pay, "Cmplx⁻¹" = inverse implementation complexity (5 = easy), "Defens" =
defensibility, "MA-specific" = Moroccan specificity, "Deps" = external dependency (5 = none).

| # | Feature | Pain | Freq | WTP | Cmplx⁻¹ | Defens | MA-specific | Deps | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Blind-Spot cash reconciliation** | 5 | daily | 4 | 4 | 3 (process+audit moat) | 5 | 5 | **MVP** — unique daily-pain killer, zero external deps |
| 2 | **Loi 43-20 signatures at the vehicle** | 4 | per rental | 4 | 2 (TSP onboarding, customer enrollment friction) | 3 | 5 | 2 (Damanesign/Barid) | **V1 pilot** — high value; friction risk; paper must stay |
| 3 | **NARSA Fine Matcher + OCR** | 5 | batched | 5 | 2 | 5 | 5 | 1 (fine PDF/API formats unverified) | **V2 manual-assist first**, OCR bet after samples exist |
| 4 | **Hardware-agnostic telematics intelligence** | 4 | continuous | 3 | 1 | 3 | 5 (Ceuta/Melilla) | 1 (hardware per vehicle = adoption cost barrier) | **V2 geofences → V3 CAN intelligence** |
| 5 | **AI damage triage (CV)** | 4 | per return | 2 (diffuse benefit) | 1 | 2 (commoditizing fast) | 3 | 4 | **V3** — brief §9: not before inspection workflow is reliable; photo evidence + diff (MVP) already removes most disputes |

Research MVP matrix divergences (kept, reasoned): research puts "basic GPS mapping" in MVP —
we ship GPS-**ready** schema + MOCK adapter only (no agency will have trackers integrated at
launch); research puts "Engine block/unlock" at V1 — we default-reject automation and gate
the capability behind open decision G.5; research "Smart Contracts" V3 — rejected outright.

---

# Part II — Required reconciliation sections

## A. What changed (every meaningful amendment)

| # | Change | Driven by | Files amended |
|---|---|---|---|
| 1 | Vehicle model formalized as **state machine + derived condition layer (VehicleSignal)**; OVERDUE system-owned | research exception flows (GHOST STATE, MAINTENANCE CONFLICT, phantom booking) | domain-model, database-model, ADR-0010 (new), architecture §5 |
| 2 | **Multi-currency money**: payments/cash sessions accept EUR/USD cash with rate + MAD equivalent; FX always human-confirmed at entry; BAM-reference rate provider V1 | MRE/tourist EUR reality (hidden #4, alert #85) | ADR-0008 (amended), domain-model, database-model |
| 3 | **Compliance pack (cahier des charges)**: configurable monitors — fleet ≥7, vehicle age caps (ICE 5 / hybrid 6 / EV 7), corporate-entity status — with CRITICAL alerts; **all configurable, flagged "secondary-source pending primary verification"** | cahier des charges (Apr 2024) | domain-model (ComplianceRuleSet), database-model, architecture §5, register #15 |
| 4 | **CNDP layer**: ConsentRecord entity, per-category retention config, human-triggered anonymization queue, GPS-purpose consent block | Loi 09-08 sections | domain-model, database-model, AGENTS.md |
| 5 | Contract content schema gains **insurance block** (franchise/CDW/Super CDW/exclusions → inspection zones), **cross-border authorization block** (Ceuta/Melilla/Tanger Med/AT), consent block; replacement amendments carry deposit/insurance continuity; blank-contract reconciliation gains scanned-sheet evidence | CGV research, AT/douane, amendment rules | domain-model, database-model, ADR-0007 (amended) |
| 6 | **Driver eligibility rule pack** (age per category, license held ≥2y, expiry-during-rental) — configurable, industry-practice label | CGV research | domain-model, database-model |
| 7 | **Deposit pre-authorization expiry tracking** (PLBS preauth expires before rental end) | alert #36 | domain-model, database-model |
| 8 | **Alert taxonomy** formalized (6 buckets) + §14 conversion list + rejected-concepts list with reasons | 100-rule matrix | ADR-0009 (amended), architecture §5, roadmap |
| 9 | **Integration portfolio** updated: Fatourati, DGI/SIMPL, NARSA, Damanesign/Barid, WhatsApp, flight, Jawaz… each with honest status; new ports `EInvoicingPort`, `FinesPort`(+OCR), `FlightInfoPort`, `AiProvider`, FX rate provider | integrations section | architecture §2/§6, tech-stack, register |
| 10 | **AI**: provider port + RAG-over-tools instead of fine-tuning (research intent preserved via per-tenant grounding); AI drafts Approvals | copilot section | ADR-0009 (amended), tech-stack |
| 11 | **Roadmap re-cut into MVP → V1 → V2 → V3** aligned to research priority matrix with documented divergences | priority matrix | roadmap (rewritten) |
| 12 | **Security additions**: export controls (#93), 2FA step-up on unrecognized login (#91) design hook, business-hours login alert (#92) | security rules | architecture §7, database-model (sessions meta), roadmap V1 |
| 13 | Ops additions (cheap, high value): **cleaning triage by next departure**, garage SLA fields, MAP floor-price warning | hidden problems #6, #18, #16 | domain-model, roadmap |
| 14 | Briefs include **expected CMI blocks (cautions)** alongside expected cash; EOD brief = reconciliation posture | morning/EOD briefing section | domain-model (snapshot), roadmap |
| 15 | Verification register +13 entries / 3 status upgrades (DGI e-invoicing; Fatourati; PLBS) | all of the above | register |
| 16 | AGENTS.md / copilot-instructions / README updated: research present; safety-classified actions; CNDP-sensitive feature rules | — | AGENTS.md, .github, README, docs/research/README.md |

## B. What was confirmed (research ⇄ Phase 0 agreement)

- **Hybrid paper/digital + "Blank Slate" contracts** — independently matches ADR-0007 (numbering authority, stub, reconciliation).
- **Offline PWA for inspections/handover** — matches ADR-0005; research adds a concrete budget: **full handover in <60 seconds** (adopted as performance requirement).
- **The 14-state vocabulary** and exception handling — matches Phase 0 (now formalized, §1).
- **Daily cash reconciliation as the competitive moat** — matches ADR-0008; research elevates it to killer-feature status (rank #1).
- **WhatsApp-first communication, email secondary** — matches assumption A4/register #12 direction (still a V1/V2 channel decision, G.4).
- **RBAC roles** (Owner/Manager/Agent/Driver/Accountant/Mechanic) — matches ADR-0006 role seed.
- **Morning/EOD briefs** shape (departures/returns/utilization/expected cash/critical items) — matches Phase 0 snapshot design.
- **Fraud patterns** (backdated contracts, ghost movement, off-books rentals) — fit the derived-signal + audit design without new mechanisms.
- **Amendment semantics** (liability continuity on swap) — matches and sharpens Phase 0 amendments.
- **Telematics as interpretation layer, not map dots** — matches the port/normalized-events stance (ADR-0009).
- **Cash-heavy, card-optional reality; CMI/Fatourati for online** — matches payment-method set.
- **Seasonality (MRE summer peak)** — consistent with pricing/forecast roadmap placement (V2/V3).

## C. What remains uncertain

| Area | Uncertainty | Handling until resolved |
|---|---|---|
| Legal | **Cahier des charges specifics** (500k MAD capital, ≥7 fleet, age caps 5/6/7, entity mandate, deadlines) — multiple consistent secondary sources; primary arrêté not consulted | configurable monitors OFF-by-default per agency; UI label "regulatory check — verify with your accountant"; register #15 |
| Legal | F211/F112 CNDP form numbers; any *retention duration* rules specific to rental | no form automation; retention per category configurable |
| Legal | Qualified-signature probative weight in rental disputes; enforceability of e-contract vs paper for vehicle handover | pilot V1 behind open decision G.3; paper never removed |
| Legal | Rental-specific NARSA fine liability transfer process | V2 manual-assist; documents stored as evidence; no auto-accusation |
| Regulatory/API | DGI SIMPL: exact technical spec (UBL 2.1 vs CII, clearance API, PME timeline confirmations from primary source) | export-ready config in V1; submission only when specs stable (register #8 updated) |
| API | Fatourati creditor onboarding for agencies; CMI PLBS integration details per bank | ports + UNAVAILABLE adapters (V1) |
| API | NARSA/ANSR fine data access; radar PDF formats; Jawaz API; charging-station APIs; broker APIs | parking lot / MOCK only |
| Technical | CAN-bus/OBD data quality across mixed fleets; EV PID coverage; MRZ read quality on Moroccan CIN; OCR accuracy on fines; CV damage reliability | staged: telemetry normalization V2, OCR/V3 after sample data |
| Market | WTP/pricing for SaaS among agencies post-cahier-des-charges consolidation; EV share (17% claim, single source); competitor responses | business validation outside architecture scope; noted |

## D. Requirements currently missing (now added; or parked)

**Added to architecture now:** multi-currency cash; cahier-des-charges compliance pack;
CNDP consent/retention layer; insurance & cross-border & consent contract blocks; driver
eligibility pack; deposit preauth expiry; intake links (V1/V2); fines upload+match model
(V2); export controls & 2FA-step-up hooks; cleaning triage; garage SLA; floor-price warning;
expected-cautions in briefs; EV fields (SoC events, charging-time calendar block — V2);
AiProvider port; EInvoicingPort; FlightInfoPort.

**Parked (not in architecture yet, deliberately):** LLD / corporate long-duration contracts
(different commercial object — separate ADR if pursued); branch-transfer cost engine (V2
report); Jawaz/broker/charging/digital-key integrations (unverified); sentiment analysis;
dynamic pricing engine (advisor first); predictive maintenance models; "remaining 80/40"
unenumerated research features (cannot be architected until named).

## E. MVP recommendation

**Principle:** small enough to ship, strong enough to sell: *run the desk, the paper, and
the drawer.* Everything else waits.

**MVP scope (single product milestone = Phases 1–6 + slices):**

1. **Foundations** — agency/branch/users/roles/permissions/sessions, tenant isolation
   (app + RLS), append-only audit log, web shell (FR default, AR RTL; EN UI V1).
2. **Fleet & customers** — vehicles (state machine + transitions), categories, models,
   documents (VT/insurance/vignette expiries → alerts), customers + encrypted identity
   documents + flags (human-confirmed).
3. **Reservations** — calendar, exclusion-constraint conflict detection, category→vehicle
   assignment, quotes with floor-price warning, employee assignment conflicts.
4. **Contracts** — structured engine, **FR + AR templates** (EN V1), versions, amendments
   (incl. vehicle replacement w/ liability continuity), image signatures + content hash,
   **Blank Slate issue/reconcile/void + gap report**, PDF pipeline, insurance block,
   cross-border block, driver eligibility checks.
5. **Inspections (PWA offline)** — departure/return, standardized photo slots, damage
   departure/return diff, acknowledgements, **<60 s handover budget**, idempotent sync.
6. **Finance** — payments (cash incl. **EUR/USD at manual rate**, card, transfer),
   append-only + reversals, deposits (cash, manual preauth record, expiry tracking),
   invoices (Art. 145 mentions validation), **cash sessions + variance + daily
   reconciliation (killer feature #1)**, outstanding balances.
7. **Brief & alerts (thin)** — in-app morning/EOD brief (departures/returns/utilization/
   expected cash + expected cautions, critical items) from daily snapshot; rule-engine core
   + seed rule pack (~25 rules: document expiries, readiness, missing caution/contract,
   overdue, cash variance, fleet-size/age-cap compliance monitors OFF-by-default).

**Explicitly NOT in MVP:** GPS hardware ingestion (MOCK adapter only), WhatsApp API,
qualified e-signature, CMI/Fatourati, DGI clearance, OCR/CV, AI copilot, dynamic pricing,
predictive maintenance, risk score, fines module, multi-branch transfer optimization.

## F. Post-MVP roadmap

| Version | Theme | Contents (research matrix mapping) |
|---|---|---|
| **V1 — Money & channels** (≈ research SHOULD-HAVE) | Payments that close the loop | CMI online + **Fatourati links** (pending onboarding facts), card **PLBS preauth** deposits, **WhatsApp Business** notifications (confirmations, reminders, doc requests, payment links — G.4), **Damanesign/Barid qualified-signature pilot** (G.3), invoice UBL/CII export config + Art. 145 hard validation, customer **intake links**, 2FA step-up, garage SLA, EN templates, reconciliation polish, briefs via WhatsApp push |
| **V2 — Fleet intelligence & Moroccan moat** (≈ DIFFERENTIATOR) | Live telematics + fines + P&L | Teltonika adapter + geofences (**Ceuta/Melilla/Tanger Med**), signals live (ghost/phantom/unauthorized/maintenance-conflict), EV pack (SoC, charging calendar block), **NARSA fine matcher (manual-assist, then OCR bet — G.7)**, transparent **customer risk score** (G.6), true **vehicle P&L** (maintenance, insurance, GPS subs, depreciation), rebalancing advisor, churn report, profit-padding report, flight tracking, subrogation dossier compiler |
| **V3 — Prediction & copilot** (≈ ADVANCED AI, minus rejected items) | Reasoning at scale | **AI copilot** (grounded, typed, per-tenant, no-write), predictive maintenance, dynamic pricing *advisor* (owner-approved rules), CV damage triage, liquidation advisor (manual valuations), weather pricing signals — **excluding**: smart contracts, fine-tuned LLM, covert profiling, automated immobilization |

Phase numbering (1–9 internal) from Phase 0 maps inside MVP/V1/V2; roadmap file rewritten
accordingly with acceptance criteria preserved.

## G. Open decisions (require product-owner approval)

**G.1 MVP scope.** Options: (a) recommended MVP above; (b) research matrix MVP (adds basic
GPS map live-view); (c) leaner MVP (drop blank contracts / AR templates).
*Recommendation: (a).* Reasoning: GPS without real trackers is a demo, not a feature;
blank contracts + AR are core Morocco-first value. Consequences: (a) ships a sellable
product with zero external dependencies; (b) adds scope + implies early hardware partnerships
before product-market fit; (c) ships faster but drops two Morocco-specific moats (paper
reconciliation, Arabic contracts) — weaker commercial story.

**G.2 Compliance-pack depth.** Options: (a) OFF-by-default monitors in MVP (fleet ≥7, age
caps, entity status) with "verify with your accountant" labeling; (b) full enforcement
workflow V1; (c) omit until primary source verified.
*Recommendation: (a).* Reasoning: secondary sources agree but primary arrêté unread; alerting
is safe, blocking is not. Consequences: (a) early differentiation with no legal exposure;
(b) risks encoding wrong numbers as hard rules (violates §19); (c) wastes a real research
insight agencies will ask about.

**G.3 Qualified e-signature pilot.** Options: (a) V1 pilot with Damanesign (API portal
exists); (b) V1 pilot with Barid eSign; (c) defer to V2; (d) never (paper + image signature
only).
*Recommendation: (a).* Reasoning: modern developer-facing API; pilot keeps paper fallback.
Consequences: (a) early moat but TSP onboarding/enrollment friction and per-signature costs
to validate; (b) same with less certain API ergonomics; (c) cedes killer-feature #2 timing to
no one (local competitors are weak here) but safer; (d) leaves the research's strongest
legal-differentiation claim unaddressed.

**G.4 WhatsApp Business API timing.** Options: (a) V1 automated notifications; (b) V2 after
pricing/policy diligence; (c) manual share-links only (no API).
*Recommendation: (b), with (c) as the V1 interim.* Reasoning: Meta pricing/template policies
and opt-in flows are unverified (register #12); deep automation is the research's channel bet
but carries recurring costs. Consequences: (a) fastest to research vision, cost risk;
(b) sober adoption with manual value first; (c) permanent under-delivery vs research intent
(WhatsApp is the channel Moroccan customers live in).

**G.5 Telematics immobilization (starter-kill/engine block).** Options: (a) permanent
rejection; (b) opt-in capability, human-triggered only, after legal review + device support;
(c) research stance (V1 feature, automated at border).
*Recommendation: (b) with default-off and no automation ever.* Reasoning: §14 + safety —
immobilizing a moving vehicle endangers life; insurance voidance is a legal conclusion, not
a sensor reading. Consequences: (a) simplest, forfeits anti-theft selling point; (b) keeps
the option with liability fences (audit, approval, legal sign-off); (c) unacceptable risk —
rejected by the brief's safety rules.

**G.6 Customer risk score principles.** Options: (a) V2 score from objective contractual
events only (late returns, unpaid fines, damage), transparent + explainable, used for
*suggestions* (deposit sizing, upsells) never auto-decisions; (b) research-style aggressive
scoring (auto high-risk tags, auto deposit changes); (c) no scoring.
*Recommendation: (a).* Reasoning: CNDP transparency requirement cited by the research itself;
§14 forbids auto-blacklisting. Consequences: (a) compliant differentiation; (b) regulatory
exposure + discrimination risk; (c) forfeits fraud/fraud-adjacent value.

**G.7 NARSA fine-matcher bet.** Options: (a) build V2 manual-assist (upload PDFs + match UI
using contract/GPS timestamps staff confirm) before any OCR; (b) wait for verified API/data
formats; (c) skip.
*Recommendation: (a).* Reasoning: the pain is real and document-driven today; manual-assist
captures value with zero dependency risk; OCR only after real samples accumulate.
Consequences: (a) early moat, honest scope; (b) loses 6–12 months of differentiation window;
(c) abandons killer feature #3.

**G.8 Hosting & CNDP formalities (carried from Phase 0).** Options: (a) EU region + operator
handles CNDP declaration (documented duty in deployment docs); (b) Morocco-hosted infra from
day one; (c) US/global default.
*Recommendation: (a).* Reasoning: Law 09-08 transfer rules treat EU as adequate (register
#4); Moroccan hosting adds cost/ops burden pre-revenue. Consequences: (a) pragmatic +
compliant posture, re-revaluate at scale; (b) strongest data-sovereignty story, higher ops
cost; (c) transfer-authorization exposure.

---

**Repository readiness for Phase 1:** blocked only on G.1 (and ideally G.2/G.3 direction).
All other open decisions can be taken later without rework because every affected system is
behind a port, a config, or a rule record.
