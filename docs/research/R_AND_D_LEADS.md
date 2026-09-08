# locaOS / NAVI — R&D Leads

Canonical working list of external projects, standards, and ideas worth investigating for architectural leverage.

## Mandate

For every lead, ask:

> Could this make locaOS/NAVI meaningfully better, cheaper, safer, faster, or harder to compete with?

Research workflow:

**DISCOVER → VERIFY → UNDERSTAND → CLASSIFY → MAP → COMPARE → BENCHMARK → DECIDE → DOCUMENT → ONLY THEN ADOPT**

Do not adopt a project merely because it is popular or technically interesting. Prefer architectural leverage, security, operational reliability, and product differentiation.

## Classification

- **BUILD** — use/build internally as part of locaOS/NAVI.
- **EMBED** — integrate as a runtime dependency/provider.
- **ADAPT** — implement the useful pattern ourselves.
- **REFERENCE** — architectural/product/UX inspiration or interoperability reference.
- **BENCHMARK** — useful for comparison or evaluation.
- **FUTURE** — promising but not appropriate to adopt now.
- **REJECT** — investigated and intentionally not adopted.

---

## High-value leads

### Comp AI CRM (`trycompai/crm`) — ADAPT + REFERENCE

Open-source, agentic-first CRM architecture with a persistent research agent, durable work queue, evidence-oriented tools/skills, and explicit data-boundary/sandbox patterns. The repository's release documentation describes an agent that runs independently of the browser, leases due work with database locking, and treats evidence and observed facts as distinct from model confidence. urlGitHub repositoryhttps://github.com/trycompai/crm

**High-value patterns for locaOS/NAVI:**

- **Evidence-first intelligence:** never let the model invent an operational fact; tools report observations/evidence and unresolved evidence becomes a suggestion for human settlement.
- **Persistent agent work:** durable jobs, leases, retries, scheduled rechecks, and work that continues without an open browser.
- **Versioned skills:** operational knowledge/policies can live as versioned, inspectable skill documents instead of one giant prompt.
- **Authoritative internal context first:** read the system's own authoritative history before consulting external providers.
- **Optional external capabilities:** external research/vendor integrations are additive; the agent remains useful when capabilities are unavailable.
- **Sandbox/data boundaries:** agent shell/tooling should not automatically receive database credentials or unrestricted egress.
- **Explainable rechecks:** scheduled future work should carry a reason that can be shown to the operator.

**Architectural mapping:**

```text
locaOS operational truth
        ↓
current state + immutable/auditable history
        ↓
NAVI durable task / work queue
        ↓
authoritative context retrieval
        ↓
external evidence only when justified/available
        ↓
evidence + provenance
        ↓
NAVI reasoning
        ↓
suggestion / prepared action
        ↓
human approval where required
        ↓
locaOS domain-authorized mutation
```

**Important boundary:**

- Do **not** copy the CRM architecture wholesale.
- Do **not** make NAVI the operational source of truth.
- locaOS remains authoritative for tenancy, fleet, reservations, contracts, inspections, finance, permissions, and domain state transitions.
- Do **not** copy its deliberate single-tenant model; locaOS requires structural tenant isolation.
- Do **not** introduce its stack (Bun/Turborepo/Prisma/Vercel/eve) merely for similarity; extract the architectural patterns only where they fit our accepted architecture.

**Decision:** ADAPT the evidence-first agent discipline, durable work-queue/recheck pattern, versioned-skill approach, and strict data-boundary ideas. REFERENCE the project for persistent-agent UX and implementation patterns. Consider selected pieces FUTURE as NAVI becomes an autonomous/long-running operational intelligence layer.

**Research status:** studied; high-value architectural/product reference. No runtime dependency approved.

---

### Let's Seal / SEAL — ADAPT + REFERENCE

**Core idea:** evidence should travel with the artifact and be independently verifiable.

Potential value for locaOS/NAVI:

- Artifact-centric evidence and provenance.
- Contract and contract-version provenance.
- Inspection and damage evidence packages.
- Dispute-resolution evidence bundles.
- Financial reports and cash-closing artifacts.
- Identity-document integrity/provenance, without treating SEAL as identity verification.
- NAVI evidence/explanation UX: **“Why does NAVI believe this?”**
- Trust indicators that point to the underlying artifact, provenance, and verification state.

Architectural mapping:

```text
locaOS operational truth
        ↓
immutable/auditable events + current state
        ↓
Evidence Artifact
        ↓
provenance + verification
        ↓
NAVI context/retrieval/reasoning
        ↓
evidence-backed explanation
        ↓
human approval where required
```

Important boundary:

- Do **not** make Let's Seal the operational source of truth.
- Do **not** assume blockchain is required for the locaOS design.
- Keep locaOS authoritative for operational state, audit history, financial records, and permissions.
- Treat SEAL as a reference/interoperability option for selected high-value artifacts, with possible future selective sealing.

**Decision:** ADAPT the artifact-centric evidence/provenance philosophy; REFERENCE the SEAL standard for interoperability and independent verification. Consider FUTURE selective sealing of high-value external artifacts.

**Research status:** studied; architecture/product pattern is high-value. Implementation is not approved yet.

---

### Pieces — REFERENCE / NAVI philosophy

Persistent context, memory, local-first intelligence, and human/AI workspace patterns relevant to the NAVI layer. Use primarily as inspiration for NAVI UX and context architecture rather than as operational truth.

**Decision:** REFERENCE. Preserve the NAVI boundary: locaOS remains authoritative and NAVI reasons over retrieved context.

---

### Graphiti — FUTURE / ADAPT candidate

Temporal knowledge-graph patterns for representing changing entities, relationships, and history. Relevant to future NAVI context and temporal reasoning.

**Decision:** study/adapt selectively; do not make a graph database operational truth.

---

### QMD — FUTURE / EMBED candidate

Local retrieval/search patterns relevant to NAVI knowledge retrieval and project context.

**Decision:** benchmark against the existing retrieval architecture before adoption.

---

### Mem0 — BENCHMARK / FUTURE

Memory-management patterns for persistent AI context.

**Decision:** benchmark against the intended NAVI memory model; do not outsource operational truth or authorization to a memory product.

---

### OpenHuman — REFERENCE / FUTURE

Persistent local AI memory and agent-context research relevant to NAVI's long-lived context model.

**Decision:** REFERENCE/FUTURE; extract useful memory patterns without importing unnecessary runtime complexity.

---

### Maka — REFERENCE / ADAPT

Agent auditability, permissions, and controlled action patterns relevant to NAVI's safety model.

**Decision:** ADAPT useful permission/audit patterns; domain authority stays in locaOS.

---

### browser-use — FUTURE / BENCHMARK

Browser automation patterns for future controlled external workflows.

**Decision:** research security, isolation, permissions, and confirmation boundaries before any production use.

---

### Pipecat — BENCHMARK / FUTURE

Multimodal/voice agent infrastructure potentially relevant to future NAVI interaction surfaces.

**Decision:** benchmark when voice/multimodal workflows become a concrete product requirement.

---

### PaddleOCR / document intelligence — BUILD / EMBED

OCR and document-understanding infrastructure for rental contracts, identity documents, inspections, and operational paperwork.

**Current direction:** PaddleOCR worker/provider already exists in the project; maintain it behind explicit provider boundaries.

---

### Traccar — REFERENCE / EMBED candidate

Vehicle telematics and fleet tracking patterns.

**Decision:** use as a reference and potential adapter target where verified provider/device contracts justify it; telemetry remains evidence, not automatic judgment.

---

### MapLibre — REFERENCE / EMBED candidate

Map rendering and geospatial UI foundation for fleet/operations views.

**Decision:** evaluate as a standards-friendly map layer where geospatial UX becomes necessary.

---

### OSRM — REFERENCE / EMBED candidate

Routing infrastructure relevant to ETA, pickup/return logistics, and operations planning.

**Decision:** benchmark against alternatives when routing becomes a concrete requirement.

---

### DocuSeal — REFERENCE / EMBED candidate

Document signing and workflow patterns relevant to contracts and execution.

**Decision:** evaluate alongside existing signature infrastructure; do not duplicate capabilities without a concrete product gap.

---

### CMI Node — FUTURE / EMBED candidate

Potential Morocco-specific payment integration direction.

**Decision:** only adopt behind a provider adapter after real API/contract/credential verification.

---

### ERPNext — REFERENCE / BENCHMARK

Broad operational/ERP patterns useful for benchmarking accounting, inventory, workflow, and reporting coverage.

**Decision:** reference/benchmark; do not import ERP scope into the focused rental OS unless a concrete need emerges.

---

### Dolibarr — REFERENCE / BENCHMARK

Morocco-relevant small-business ERP/CRM patterns useful for feature-gap and workflow benchmarking.

**Decision:** benchmark/reference, not a platform dependency.

---

### BookCars — REFERENCE / BENCHMARK

Car-rental-specific product/workflow reference for reservation, fleet, and rental operations.

**Decision:** benchmark UX/domain coverage and identify gaps/differentiators; do not copy its architecture blindly.

---

### Fleetbase — REFERENCE / BENCHMARK

Fleet/logistics architecture and workflow reference.

**Decision:** benchmark relevant operational patterns; keep the rental domain model authoritative in locaOS.

---

## Agent / development workflow research

### Agency Agents — BUILD / INTERNAL TOOLING

Curated role prompts for architecture, product strategy, UX, implementation, and finish/review work.

**Decision:** use a small internal council rather than the full catalog. Current intended roster:

1. Product Strategist
2. Evidence & UX Researcher
3. UI Designer
4. Software Architect
5. UI Finish-Gate Reviewer

This is development-process tooling, not the NAVI runtime.

### OmniRoute — FUTURE / BUILD candidate

Potential model-routing/orchestration leverage to manage heterogeneous AI models and control cost/availability.

**Decision:** research before adding infrastructure; no new runtime dependency solely for experimentation.

### Balsa UI — REFERENCE

UI/component and interaction inspiration where it materially improves operator workflows.

### shadcn / improve — REFERENCE / BUILD

Component-system patterns useful for the web console. Adapt to locaOS accessibility, density, and operator needs rather than copying marketing-oriented defaults.

### Archify — REFERENCE / BENCHMARK

Architecture visualization/documentation patterns for making system structure easier to inspect and communicate.

### Unlimited-OCR — BENCHMARK / FUTURE

OCR benchmarking/reference candidate to compare against the current PaddleOCR direction.

---

## Product/UX research principles carried across leads

- Operational density and accessibility take priority over decorative interaction.
- High-impact actions require explicit human confirmation where appropriate.
- Evidence must be traceable to artifacts and authoritative records.
- AI explanations should distinguish facts, evidence, inference, and recommendation.
- External providers must sit behind honest adapters and verified contracts.
- No AI framework, vector database, graph database, browser agent, OCR engine, or SaaS becomes operational truth.
- Avoid microservices or infrastructure expansion merely to match aspirational architecture documents.
