# locaOS — External Operations & Service Partner Roadmap

This document covers the **physical-world service network** around a rental agency: car wash/detailing, repair garages, tyres, bodywork, mechanics, mobile technicians, roadside assistance and task-marketplace style providers.

This is intentionally separate from payment/communication APIs. These partners perform real work on vehicles and therefore need scheduling, dispatch, evidence, approval, cost capture and vehicle-state coordination.

## Core model

```text
Vehicle / Maintenance / Incident
        ↓
Service request / work order
        ↓
Internal team OR external partner
        ↓
Assignment / dispatch
        ↓
Arrival / work started
        ↓
Work + parts + photos + odometer
        ↓
QC / manager approval
        ↓
Cost / invoice / partner reconciliation
        ↓
Vehicle state updated
        ↓
Audit + NAVI timeline
```

External providers **never directly decide authoritative vehicle state**.

---

## Partner categories

### 1. Lavage / detailing / cleaning

Planned partner network:

- car washes
- mobile car-wash operators
- detailing shops
- interior cleaning
- upholstery cleaning
- steam cleaning
- polishing
- ceramic/coating providers
- odor treatment
- post-rental deep-clean specialists

Use cases:

- routine turnaround cleaning
- deep clean after return
- stain/odor remediation
- pre-sale preparation
- VIP/premium preparation
- damage-adjacent cosmetic work

### 2. Repair garages / mechanics

Partner types:

- independent garages
- brand/dealer workshops
- multi-brand repair shops
- mobile mechanics
- electrical specialists
- diagnostics specialists
- AC specialists
- transmission specialists
- engine specialists

Capabilities:

- service request
- diagnosis
- quotation
- approval
- appointment
- work order
- parts
- labor
- photos/evidence
- completion report
- invoice

### 3. Tyres / wheels

- tyre shops
- mobile tyre services
- wheel alignment
- balancing
- puncture repair
- tyre storage
- seasonal tyre programs where relevant

Track:

- tyre position
- brand/model
- size
- DOT/age where available
- tread measurement
- replacement reason
- cost
- invoice/evidence

### 4. Bodywork / cosmetic repair

- body shops
- dent repair
- paint shops
- windshield/glass providers
- bumper/headlight specialists
- SMART repair

Tie work to inspection evidence and damage cases.

### 5. Roadside / emergency

- towing
- dépannage
- battery jump/replacement
- flat tyre
- fuel delivery
- lockout assistance
- accident response
- mobile mechanic

Incident → assistance case → dispatch → status → evidence → invoice.

### 6. Parts / suppliers

- OEM parts
- aftermarket parts
- batteries
- tyres
- consumables
- lubricants
- accessories

Eventually support supplier catalogues and purchase-order flows.

---

# Task-marketplace / dispatch model

locaOS should support a **Task Rabbit-style operational model** without depending on TaskRabbit itself.

A task is a first-class object:

```text
Task
- agency
- vehicle
- category
- service type
- priority
- requested by
- assigned worker/provider
- location
- requested time window
- status
- estimated cost
- approved budget
- actual cost
- evidence
- invoice
- completion notes
- QA result
```

### Example

```text
RETURNED VEHICLE
    ↓
Inspection finds dirty interior + low fuel
    ↓
NAVI creates preparation tasks
    ├── Lavage: interior/exterior
    └── Fuel: refuel
    ↓
Agency can assign internal employee
OR
external partner
    ↓
Partner accepts
    ↓
Performs work
    ↓
Uploads proof
    ↓
Manager/QA verifies
    ↓
Cost recorded
    ↓
Vehicle becomes RENTABLE
```

This is the bridge between **rental operations and a service marketplace**.

---

# Partner interface

The long-term product should expose a dedicated **Partner Portal / Service Provider Interface**.

## Partner dashboard

Partner sees only their assigned agency work:

- new requests
- accepted jobs
- scheduled jobs
- jobs in progress
- awaiting evidence
- awaiting approval
- completed jobs
- rejected/rework jobs
- invoices/payment status

## Job detail

```text
Vehicle: 45103-B-1
Service: Full detailing
Location: Agency branch
Requested: 10:30–12:00
Priority: Normal

Instructions
Photos / evidence
Parts/materials
Estimated cost
Actual cost
Completion proof
Invoice
```

Sensitive customer information should be minimized. A lavage provider normally does **not** need the customer's CIN, phone number, contract financials, etc.

---

# Partner assignment

Agency users can choose:

- internal employee
- preferred partner
- available partner
- cheapest qualified partner
- fastest available partner
- specialist partner

Future matching can consider:

- distance
- availability
- service capability
- historical quality
- turnaround time
- price
- SLA
- vehicle/location
- partner rating

NAVI may recommend a provider, but authorization/assignment remains a controlled domain action.

---

# External provider integration levels

Every service partner can start without an API.

### Level 0 — Manual

Agency creates task and communicates externally.

### Level 1 — Partner portal

Provider logs into a restricted portal and accepts/completes tasks.

### Level 2 — Notifications

WhatsApp/SMS/email notifications for assignments and status changes.

### Level 3 — Provider API

Partner system synchronizes:

- job creation
- acceptance
- appointment
- status
- quote
- completion
- invoice

### Level 4 — Marketplace/network integration

locaOS can discover and dispatch qualified providers based on location, capability, availability and commercial terms.

The architecture must support all four levels.

---

# Financial boundary

A partner quote is **not** automatically a payable expense.

```text
Partner estimate
      ↓
Agency approval / budget
      ↓
Work performed
      ↓
Actual amount + evidence
      ↓
Invoice received
      ↓
Expense / payable
      ↓
Reconciliation
```

If a repair is customer-liable, the relationship to the rental settlement must be explicit and evidenced. Never silently turn a partner invoice into a customer charge.

---

# Vehicle-state boundary

Example:

```text
RETURNED / INSPECTED
        ↓
PREPARATION_REQUIRED
        ↓
TASKS OPEN
        ↓
WORK IN PROGRESS
        ↓
QA REQUIRED
        ↓
QA PASSED
        ↓
RENTABLE / AVAILABLE
```

A partner marking a task `COMPLETED` does **not** itself make the vehicle available for rental.

An authorized locaOS workflow evaluates all blockers before transitioning the vehicle.

---

# Evidence & audit

Every external service task should support:

- before photos
- after photos
- timestamps
- provider identity
- worker identity where available
- GPS/location evidence where appropriate
- parts/materials
- labor
- notes
- invoice
- quote
- approval
- rejection/rework reason
- completion confirmation

Audit examples:

```text
10:12 Fatima — Created detailing task
10:18 Partner ABC — Accepted task
10:46 Partner ABC — Work started
11:31 Partner ABC — Uploaded 6 completion photos
11:40 Fatima — QA passed
11:42 Fatima — Vehicle preparation completed
```

---

# Partner commercial model

Track per provider:

- service catalogue
- pricing
- negotiated agency rates
- minimum charge
- emergency surcharge
- SLA
- operating area
- opening hours
- supported vehicle types
- certifications/qualifications where relevant
- insurance information where required
- tax/invoice information
- payment terms
- performance history
- active/inactive status

Do not expose one agency's negotiated pricing to another tenant.

---

# Planned partner integrations

Research targets include:

- Moroccan car-wash/detailing networks
- independent local lavage shops
- garage networks
- dealer workshops
- tyre networks
- glass/bodywork providers
- roadside-assistance networks
- mobile mechanics
- parts suppliers
- local task/workforce marketplaces
- TaskRabbit-style marketplaces where geography/service availability makes sense
- future locaOS partner network

The provider list is intentionally not treated as a statement that each company has an API or is currently available in Morocco.

---

# Strategic product direction

The long-term opportunity is **not merely “connect to garages.”**

locaOS can become the operating layer between rental agencies and the local service economy:

```text
                    locaOS
                       │
        ┌──────────────┼──────────────┐
        │              │              │
      Fleet          Rental         Partner
        │              │              │
        └──────────────┼──────────────┘
                       │
                 Service Tasks
                       │
       ┌───────────────┼────────────────┐
       │               │                │
     Lavage          Garage           Tyres
       │               │                │
     Detail          Repair           Glass
       │               │                │
       └───────────────┼────────────────┘
                       │
                  QA / Evidence
                       │
                 Cost / Invoice
                       │
                    NAVI
```

This creates a genuine **rental operations network**, while keeping the rental agency as the authority over its fleet, money and customer relationship.

---

# Implementation order

1. Internal service/task model.
2. Task status + assignment + audit.
3. Vehicle preparation tasks generated from return/inspection.
4. Internal employee assignment.
5. Partner directory + service catalogue.
6. Partner portal.
7. WhatsApp/SMS partner notifications.
8. Quote/approval/evidence/invoice workflow.
9. Partner performance/SLA reporting.
10. Provider API adapter contract.
11. First real lavage/garage/roadside integrations.
12. Marketplace-style provider matching and dispatch.

**Do not start with external APIs. Build the internal task/work-order authority first.**
