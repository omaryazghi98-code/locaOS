# NAVI Home — UX Specification

## Purpose

Define the first NAVI experience before implementation so the branch does not drift into a prettier CRM.

NAVI is a mode/layer over the same authoritative locaOS domain. The existing CRM remains intact and useful. NAVI is the contextual operating view.

## Product promise

When an owner or manager opens NAVI, they should understand within seconds:

1. What is happening across the operation.
2. What needs attention now.
3. What changed since the last meaningful checkpoint.
4. What is likely to become a problem.
5. What can be done immediately.

The feeling should be: **“The system understands my operation.”**

Not: **“Here are my database modules.”**

## First-screen structure

### 1. Identity / status header

- NAVI identity
- current agency/branch scope
- current time/date
- concise operational state
- search / ask NAVI entry point
- CRM ↔ NAVI mode affordance can be reserved for later; do not force it into the first experiment if it harms clarity

### 2. The Brief

A short generated statement based only on real data:

> “Today you have 8 departures and 6 returns. Two departures need attention: one has no ready vehicle and one has an unresolved payment issue. Three returning vehicles need preparation before their next reservation.”

Every claim must link to evidence.

### 3. Attention stack

Prioritized cards, not an undifferentiated alert list.

Each card contains:

- severity
- what happened / current state
- why it matters
- deadline or expected impact
- related entities
- confidence/evidence
- one primary action
- optional secondary actions

Example:

**Vehicle 214 may miss its next rental**

Return expected 14:20. Next reservation begins 16:00. Return inspection has not completed and preparation has not started.

**Recommendation:** prioritize return inspection → preparation.

Actions:
- Open rental
- Start inspection
- Prepare task

### 4. Live operation lanes

Compact views of the operation:

**Departures**
- customer
- time
- vehicle/category
- readiness
- blockers

**Returns**
- customer
- expected time
- inspection state
- next reservation pressure
- settlement readiness

**Fleet**
- available
- rented
- overdue
- maintenance
- preparation
- transfer

These are contextual summaries. Detailed management stays in CRM workflows.

### 5. What changed

Show meaningful changes rather than every database event.

Examples:
- reservation extended
- vehicle reassigned
- payment received
- deposit changed
- contract amended
- damage recorded
- vehicle entered maintenance
- task completed

Each change has a timestamp and actor/system source where available.

### 6. Risk / prediction layer

Do not call everything “AI.”

Surface evidence-backed operational risks such as:
- tight vehicle turnaround
- unassigned future pickup
- likely overdue return
- maintenance pattern affecting availability
- unresolved customer issue
- document expiration
- branch transfer conflict

For each prediction/recommendation show:

**Signal → reason → expected consequence → suggested action**

Never present uncertain predictions as facts.

### 7. Suggested actions

A small set of executable or preparatory actions:
- assign vehicle
- start inspection
- create preparation task
- contact customer
- open contract
- review settlement
- create transfer
- assign workshop/wash job when those systems exist

Consequential financial/legal actions require existing domain validation and, where appropriate, explicit human confirmation.

## Contextual entity experience

When an operator opens any important entity from NAVI, retain the normal CRM record but add a **context rail**.

### Customer
- current rental
- current requests
- recent interactions
- rental history
- preferences
- loyalty status (future)
- unresolved items
- related vehicles/reservations/contracts
- evidence

### Vehicle
- current state
- current/next reservation
- last inspection
- maintenance history
- preparation state
- utilization
- recent incidents
- relevant telemetry (future)
- operational risk

### Reservation
- customer
- vehicle/category
- timeline
- price/terms snapshot
- contract status
- deposit/payment state
- messages
- inspection state
- next action
- related tasks

### Contract
- lifecycle timeline
- immutable commercial snapshot
- inspections
- settlement state
- payments/deposit
- amendments
- evidence
- closure blockers

### Task
- why it exists
- linked entity
- priority/deadline
- assignee/provider
- status
- evidence
- cost
- downstream effect

## Operational timeline

NAVI should make important history easy to scan as a story.

Example:

`09:14 Reservation created`

`10:02 Vehicle 214 assigned`

`10:05 Customer requested airport delivery`

`11:22 Contract signed`

`13:48 Departure inspection completed`

`18:16 Extension requested`

`Tomorrow 16:00 Vehicle 214 already reserved again`

The timeline is derived from authoritative records/events. It is not an independent truth source.

## Search / ask NAVI

The input should allow natural questions, but the first experiment can support a deliberately small set of high-value queries.

Examples:
- “What needs my attention?”
- “What changed today?”
- “Why is vehicle 214 unavailable?”
- “What is blocking tomorrow’s departures?”
- “Show me the history of this customer.”
- “How much is still unsettled today?”

The response format should be:

`ANSWER → EVIDENCE → RELATED OBJECTS → ACTIONS`

Never return an unsupported AI narrative without evidence links.

## Pieces-inspired behavior

Use the Pieces principles as inspiration:

- persistent context
- temporal recall
- relationship-aware retrieval
- exact search + semantic retrieval later
- summaries/briefs
- explicit memory
- context-aware assistance
- user control and permission-aware visibility

Do not clone Pieces UI and do not depend on Pieces infrastructure.

## Memory interaction

First prototype should expose only limited explicit memory functionality:

> **Save context**

Example:

> “Customer prefers automatic vehicle and airport pickup.”

The system stores the note/memory only with the appropriate entity, author, timestamp, permissions and retention rules.

A future memory layer can add richer derived memories, temporal retrieval, vector/semantic search and reflection.

## Visual/interaction principles

The interface should feel:

- premium
- calm
- information-dense without clutter
- highly legible
- fast
- contextual
- action-oriented
- unmistakably different from a table-heavy CRM

Avoid:
- dashboard tile spam
- giant KPI walls
- fake AI prose
- excessive gradients/glow
- decorative “AI” animations with no operational purpose
- burying the action beneath explanation
- making users visit five pages to understand one problem

## Demo scenario

The first strong demo should follow one connected rental story:

1. Customer booking arrives.
2. NAVI notices the vehicle/category requirement.
3. Vehicle assignment is visible.
4. Contract and deposit state are visible.
5. Departure inspection is completed.
6. Customer asks for an extension.
7. NAVI notices the vehicle is already needed for a later reservation.
8. NAVI explains the conflict and recommends options.
9. Return occurs.
10. Return inspection records mileage/fuel/damage.
11. Settlement becomes ready.
12. Payment/deposit state is resolved.
13. Vehicle enters preparation.
14. NAVI shows the vehicle's next availability.
15. The operator can follow every step back to authoritative records.

This single scenario should make the platform feel connected.

## Non-goals of the first prototype

Do not implement yet merely for demo impact:

- autonomous money movement
- autonomous contract closure
- full marketplace
- full provider network
- full customer app
- full vector memory platform
- government API integrations before verification
- passive surveillance or recording

The first prototype proves **context + relationships + evidence + action**.

## Acceptance criteria

The first NAVI home is successful if:

- it uses real existing domain data
- it clearly differs from the CRM navigation model
- every important insight has an evidence path
- the operator can act directly from the insight
- the same reservation/vehicle/contract state is visible in CRM after drilling down
- there is no second competing source of truth
- role/tenant permissions remain enforced
- the demo tells one coherent story across multiple entities
- the user can understand the operation without opening every underlying module

## Implementation order

1. Assemble existing `/api/ops/today`, `/api/ops/brief`, `/api/ops/focus`, alerts and domain relationships into one NAVI data model.
2. Build the first NAVI home view.
3. Add evidence links and context rail.
4. Add one read-only natural-language query path over structured/approved data.
5. Add one safe action that delegates to an existing domain/API workflow.
6. Test role/tenant boundaries.
7. Polish visual hierarchy and interaction.
8. Run the end-to-end demo scenario.

Only after this vertical slice works should we decide what additional memory/retrieval infrastructure is justified.
