# NAVI Product Model

## Status

Experimental design for `experiment/navi-operating-system`.

The existing CRM-oriented experience remains the fallback. NAVI must not replace or invalidate the authoritative rental domain.

## Product thesis

locaOS should be able to present the same operational truth in two experiences:

- **CRM mode:** structured, familiar, object-oriented workflows.
- **NAVI mode:** contextual, operational, proactive, relationship-aware.

NAVI is not a chatbot pasted onto a CRM. It is an operating layer that turns the agency's existing events, entities, history, policies, and pending work into a living operational picture.

## Pieces-derived principles

Pieces is useful as a reference for the *behavior* of contextual memory, not as a dependency or UI clone.

Current Pieces documentation describes three cooperating layers: a desktop experience, PiecesOS as the local engine, and integrations. Its Long-Term Memory continuously captures workflow context, makes it searchable, and supports natural-language recall. The current MCP tooling exposes both broad question answering and lower-level retrieval primitives, including full-text search, vector search, temporal filtering, material identifiers, batch snapshots, and explicit memory creation. The documented retrieval pattern is commonly search/filter first, then retrieve the relevant context. citehttps://docs.pieces.app/https://github.com/pieces-app/pro_tips/blob/main/guides/MCP/README.md

Pieces also treats time, source/application, gestures/activity, topic, and people as useful retrieval dimensions, and supports generated summaries such as morning briefs, day recaps, standups, and custom summaries. Recent releases add agentic multi-turn LTM, reflection, calendar context, meeting preparation, granular memory management, and proactive controls. citehttps://github.com/pieces-app/pro_tipshttps://github.com/pieces-app/pro_tips/blob/main/CHANGELOG.md

### What we take

1. **Capture context continuously** from meaningful operational events rather than asking users to manually maintain a knowledge base.
2. **Make memory temporal.** "What happened?" and "what is happening now?" require different retrieval windows.
3. **Make memory relational.** People, vehicles, reservations, contracts, branches, staff, suppliers, and tasks should connect.
4. **Use multiple retrieval strategies.** Exact identifiers and terms need lexical search; concepts and patterns need semantic retrieval; structured filters should narrow both.
5. **Summarize without destroying evidence.** A summary is a derived view; source events and records remain authoritative.
6. **Support explicit memory writes.** Operators should be able to save a decision, note, preference, or important context deliberately.
7. **Make recall actionable.** Retrieval should lead to a relevant object, task, workflow, or decision—not just a paragraph of AI text.
8. **Keep permissions first-class.** Memory visibility must follow agency, branch, role, customer, and document permissions.
9. **Give users control.** Memory should be inspectable, correctable, and deletable according to retention policy.
10. **Do not depend on passive surveillance.** locaOS should start from first-party business events and explicit operational inputs; broader capture such as communications or audio is an optional, consented integration later.

## locaOS operational memory

NAVI's memory is not one giant vector database. It should have distinct layers.

### 1. Authoritative operational state

The actual domain records:

- customers
- reservations
- vehicles
- contracts
- inspections
- payments and deposits
- settlement
- maintenance
- tasks
- staff
- branches
- suppliers/partners
- documents

These are the source of truth.

### 2. Operational event stream

Append-only or auditable events describing meaningful changes and actions:

- reservation created/changed/cancelled
- vehicle assigned
- customer contacted
- contract signed
- vehicle handed over
- inspection completed
- payment received
- deposit changed
- extension requested/approved
- return delayed
- damage recorded
- maintenance opened/completed
- task assigned/completed/failed
- document uploaded/verified/expired
- staff action taken

Events carry timestamps, actor, agency/branch scope, related entity IDs, event type, and structured metadata.

### 3. Derived memories

NAVI can derive durable contextual memories from events and operator input:

- customer preferences
- recurring operational patterns
- supplier reliability observations
- unresolved issues
- decisions and rationale
- relationship context
- agency operating habits
- important exceptions
- historical explanations

A derived memory must reference the evidence that produced it.

### 4. Retrieval index

The retrieval layer can later combine:

- exact/full-text search
- structured filters
- temporal filtering
- semantic/vector retrieval
- entity/relationship expansion
- relevance/recency/importance ranking

This mirrors the useful Pieces pattern without copying its implementation.

### 5. AI context assembly

NAVI should not dump the entire database into an LLM. It should assemble a bounded context packet containing:

- current operational state
- relevant recent events
- relevant historical memories
- related entities
- applicable policies
- unresolved tasks
- confidence/evidence references

Then the model reasons over that packet.

## The NAVI home experience

The first screen should answer five questions before the operator asks anything:

1. **What is happening?**
2. **What needs attention?**
3. **What changed?**
4. **What is likely to happen next?**
5. **What can I do right now?**

The screen is therefore not a grid of CRM modules. It is a live operational briefing with drill-down into the underlying CRM records.

Example:

> **3 rentals need attention today**
>
> Youssef's vehicle is due back in 45 min. Customer requested an extension yesterday but it has not been approved. The vehicle is reserved again at 18:00.
>
> **Suggested action:** contact customer + verify next reservation.
>
> [Open rental] [Contact customer] [Review reservation]

The important part is that NAVI explains *why* something surfaced and exposes the underlying records.

## Memory cards / context surfaces

When an operator opens a customer, vehicle, reservation, or contract, NAVI should add a contextual layer around the normal CRM record:

- **Now** — current state
- **Recent** — important recent events
- **History** — relevant past context
- **Relationships** — connected people/entities
- **Open loops** — unresolved work
- **Patterns** — repeated behavior where evidence is sufficient
- **Suggested actions** — concrete next steps
- **Evidence** — links to the underlying records/events

This is the core "give life to your CRM" concept.

## Briefing model

NAVI should support generated operational briefings inspired by Pieces' summary model:

- Morning brief
- Shift handoff
- Branch brief
- Vehicle readiness brief
- Return-day brief
- End-of-day recap
- Weekly operational review
- Customer relationship recap
- Maintenance/fleet health recap

These are views over authoritative events and records, not independent truth stores.

## Agent behavior

NAVI should behave more like an operations copilot than a generic assistant.

### It can

- explain what changed
- retrieve historical context
- connect related records
- summarize a workstream
- identify unresolved loops
- suggest next actions
- draft communications
- prepare a task
- open the relevant workflow
- ask for confirmation before consequential actions

### It must not

- silently change financial truth
- invent customer/vehicle facts
- override permissions
- close contracts without domain validation
- make unsupported legal/compliance claims
- treat an AI summary as the source of truth

## Action architecture

NAVI responses should have an explicit distinction between:

**Insight** → what the system believes/observes.

**Evidence** → why it believes it.

**Recommendation** → what could be done.

**Action** → an executable workflow, requiring confirmation when consequential.

This keeps the system explainable and prevents the "AI says something, therefore it is true" failure mode.

## First implementation slice

Do not build the full memory system yet.

The first NAVI vertical slice should use existing operational data and demonstrate:

1. a live operational briefing
2. recent event timeline
3. entity relationship/context panel
4. one natural-language retrieval flow
5. evidence-backed explanation
6. one safe executable action

No new autonomous financial or contract mutation should be introduced in this slice.

## Future CRM/NAVI toggle

The long-term UX can expose a mode switch:

**CRM** ↔ **NAVI**

Both modes operate on the same domain and permissions.

CRM optimizes for direct record management.
NAVI optimizes for awareness, context, and action.

The mode switch is a future product option, not a requirement for the first experiment.
