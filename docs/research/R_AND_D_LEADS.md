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

Open-source, agentic-first CRM architecture with a persistent research agent, durable work queue, evidence-oriented tools/skills, and explicit data-boundary/sandbox patterns.

**High-value patterns for locaOS/NAVI:**

- Evidence-first intelligence: never let the model invent an operational fact; tools report observations/evidence and unresolved evidence becomes a suggestion for human settlement.
- Persistent agent work: durable jobs, leases, retries, scheduled rechecks, and work that continues without an open browser.
- Versioned skills: operational knowledge/policies can live as versioned, inspectable skill documents instead of one giant prompt.
- Authoritative internal context first: read the system's own authoritative history before consulting external providers.
- Optional external capabilities: external research/vendor integrations are additive; the agent remains useful when capabilities are unavailable.
- Sandbox/data boundaries: agent shell/tooling should not automatically receive database credentials or unrestricted egress.
- Explainable rechecks: scheduled future work should carry a reason that can be shown to the operator.

**Decision:** ADAPT the evidence-first agent discipline, durable work-queue/recheck pattern, versioned-skill approach, and strict data-boundary ideas. REFERENCE the project for persistent-agent UX and implementation patterns. No runtime dependency approved.

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

**Decision:** ADAPT the artifact-centric evidence/provenance philosophy; REFERENCE the SEAL standard for interoperability and independent verification. No blockchain dependency is implied or required.

---

### Pieces — ADAPT + REFERENCE / NAVI philosophy

Persistent context, memory, local-first intelligence, and human/AI workspace patterns relevant to the NAVI layer.

**Core loop to study:**

`repository/context → persistent memory → AI assistance → proposed change/action → verification → recorded history`

**High-value patterns:**

- repository-local persistent context
- context retrieval before reasoning
- AI proposal → execution → verification → recorded history
- local/private-first operation
- import/export and degraded operation when external AI is unavailable
- explicit loading, validation, success, and failure states

**Boundary:** do not attempt to reproduce large-context infrastructure, IDE-wide polish/latency, enterprise policy/telemetry/support, or proprietary model-quality advantages. locaOS remains authoritative operational truth.

**Decision:** ADAPT useful core-loop patterns; REFERENCE the product for NAVI UX/context architecture. No runtime dependency approved.

---

### Greptile — ADAPT + REFERENCE + BENCHMARK

**Reference:** self-hosted, single-repository AI pull-request reviewer design.

**Core loop observed:**

`repository → incremental index → structural chunks → embeddings/vector search → relevant context → AI reasoning → strict structured output → deterministic validation → dedupe → action → recorded findings`

**High-value patterns for NAVI:**

- **Incremental Git-aware indexing:** use file/blob identity to reprocess only changed content instead of rebuilding all context.
- **Structural chunking:** prefer function/class-level chunks where language parsing supports it; use deterministic sliding-window fallback otherwise.
- **Hybrid retrieval:** retrieve semantically related chunks and, when practical, include the complete current version of a small relevant file.
- **Strict structured AI output:** require typed/validated results instead of free-form model output.
- **Authoritative boundary validation:** reject model results that fall outside the relevant diff/context boundary.
- **Persistent deduplication/history:** normalize and hash findings so repeated model output is not treated as new work across revisions.
- **Local dry-run:** allow prompt/model tuning without external mutation.
- **Explicit scope limits:** a small self-hosted approximation does not claim large-context infrastructure, multi-repo scale, proprietary data, or model quality.

**NAVI mapping:** informs repository/context intelligence and the broader NAVI loop of retrieval → reasoning → structured proposal → deterministic validation → human/domain-authorized action → memory.

**Important boundary:** do **not** copy the Python/FastAPI/SQLite stack into locaOS. NAVI must use the existing locaOS architecture and preserve the rule that NAVI is not operational source of truth.

**Decision:** ADAPT the incremental indexing, structural chunking, hybrid retrieval, validation, deduplication, and dry-run patterns. REFERENCE/benchmark Greptile's workflow. No Greptile runtime dependency approved.

---

### Augment Code — REFERENCE + BENCHMARK

**Research angle:** large-repository context assembly, repository-aware AI coding, and context selection.

**NAVI mapping:** study how high-quality context is assembled and reduced before model reasoning. Do not assume proprietary infrastructure is reproducible in our stack.

---

### Qodo — REFERENCE + BENCHMARK

**Research angle:** AI-assisted code review, testing, verification, and repository reasoning.

**NAVI mapping:** informs the verification/finish-gate side of agent workflows and the principle that model output should be validated before it is trusted.

---

### AnythingLLM — ADAPT + REFERENCE

**Research angle:** local/self-hosted knowledge workspaces, document ingestion, retrieval, persistent context, and model abstraction.

**NAVI mapping:** study workspace/context-source organization and degraded local operation. Do not introduce a second operational database or knowledge system as authoritative state.

---

### Activepieces — ADAPT + REFERENCE

**Research angle:** workflow orchestration, connectors, durable execution, retries, execution history, and controlled automation.

**NAVI mapping:** useful reference for turning an operator request into a multi-step workflow while keeping domain authorization inside locaOS.

---

### Goose — REFERENCE

**Research angle:** open agent/tool execution architecture and permission boundaries.

**NAVI mapping:** study agent execution patterns; no need to add another coding agent alongside OpenCode unless a concrete gap is demonstrated.

---

### Cline — REFERENCE

**Research angle:** human ↔ agent ↔ tool ↔ repository interaction and approval-driven coding workflows.

**NAVI mapping:** useful reference for transparent action proposals and human confirmation.

---

### Aider — REFERENCE

**Research angle:** repository-aware editing, change workflows, and Git-oriented developer interaction.

**NAVI mapping:** reference for proposed changes and traceable modification workflows.

---

### Kilo Code — REFERENCE

**Research angle:** repository-aware coding agents across development environments.

**NAVI mapping:** study context/tool execution UX without adding another runtime agent by default.

---

## Evidence / provenance / memory

### Graphiti — FUTURE / ADAPT candidate

Temporal knowledge-graph patterns for representing changing entities, relationships, and history. Relevant to future NAVI context and temporal reasoning.

**Decision:** study/adapt selectively; do not make a graph database operational truth.

### QMD — FUTURE / EMBED candidate

Local retrieval/search patterns relevant to NAVI knowledge retrieval and project context.

**Decision:** benchmark against the existing retrieval architecture before adoption.

### Mem0 — BENCHMARK / FUTURE

Memory-management patterns for persistent AI context.

**Decision:** benchmark against the intended NAVI memory model; do not outsource operational truth or authorization to a memory product.

### OpenHuman — REFERENCE / FUTURE

Persistent local AI memory and agent-context research relevant to NAVI's long-lived context model.

**Decision:** extract useful memory patterns without importing unnecessary runtime complexity.

### Maka — REFERENCE / ADAPT

Agent auditability, permissions, and controlled action patterns relevant to NAVI's safety model.

**Decision:** ADAPT useful permission/audit patterns; domain authority stays in locaOS.

### browser-use — FUTURE / BENCHMARK

Browser automation patterns for future controlled external workflows.

**Decision:** research security, isolation, permissions, and confirmation boundaries before production use.

---

## CRM / operational workspace

### Midday — ADAPT + REFERENCE + BENCHMARK

**Research angle:** document → transaction matching, financial/document intelligence, assistant UX, background workers, operational inboxes, search/retrieval, and unified document + operational workspace patterns.

**NAVI mapping:** useful reference for finance/document intelligence and explainable operational context; do not wholesale-adopt its stack.

---

### BookCars — REFERENCE / BENCHMARK

Car-rental-specific product/workflow reference for reservation, fleet, and rental operations.

**Decision:** benchmark UX/domain coverage and identify gaps/differentiators; do not copy its architecture blindly.

### Fleetbase — REFERENCE / BENCHMARK + ADAPT

Fleetbase is a mature open-source Logistics and Supply Chain Operating System. It is useful as a platform-architecture reference for separating an operational core from independently packaged capabilities and extensibility.

**High-value patterns:**

- OS + modules: keep the rental operational kernel authoritative while allowing future capabilities such as telematics, document intelligence, e-signatures, payments, and service-network integrations to behave as bounded modules.
- Capability registry: study extension/registry models for a future Navios module registry.
- Frontend + backend extension boundaries: future modules should have explicit contracts rather than scattered feature code.
- Realtime operational layer: benchmark realtime/event-driven propagation for future NAVI attention, tasks, fleet state, and command-center context.
- Platform economics: benchmark core SaaS + paid modules/integrations as a possible long-term model.

**Important boundary:** do not copy Fleetbase's framework/runtime architecture or turn Navios into generic freight/logistics software. The rental lifecycle remains authoritative and differentiating.

**Decision:** ADAPT the modular-OS/capability-registry philosophy and benchmark realtime/event-driven extension patterns. REFERENCE Fleetbase's platform model. No Fleetbase runtime dependency approved.

---

## Infrastructure / document / operations research

### PaddleOCR / document intelligence — BUILD / EMBED

OCR and document-understanding infrastructure for rental contracts, identity documents, inspections, and operational paperwork. Current project direction already has a PaddleOCR worker/provider behind explicit provider boundaries.

### Traccar — REFERENCE / EMBED candidate

Vehicle telematics and fleet tracking patterns. Telemetry remains evidence, not automatic judgment.

### MapLibre — REFERENCE / EMBED candidate

Map rendering and geospatial UI foundation for fleet/operations views.

### OSRM — REFERENCE / EMBED candidate

Routing infrastructure relevant to ETA, pickup/return logistics, and operations planning.

### DocuSeal — REFERENCE / EMBED candidate

Document signing and workflow patterns relevant to contracts and execution.

### CMI Node — FUTURE / EMBED candidate

Potential Morocco-specific payment integration direction; only adopt behind a provider adapter after real API/contract/credential verification.

### ERPNext — REFERENCE / BENCHMARK

Broad operational/ERP patterns useful for benchmarking accounting, inventory, workflow, and reporting coverage. Do not import ERP scope into the focused rental OS without a concrete need.

### Dolibarr — REFERENCE / BENCHMARK

Small-business ERP/CRM patterns useful for feature-gap and workflow benchmarking. Benchmark/reference, not a platform dependency.

### Pipecat — BENCHMARK / FUTURE

Multimodal/voice agent infrastructure potentially relevant to future NAVI interaction surfaces.

### OmniRoute — FUTURE / BUILD candidate

Potential model-routing/orchestration leverage to manage heterogeneous AI models and control cost/availability. Research before adding infrastructure.

### Unlimited-OCR — BENCHMARK / FUTURE

OCR benchmarking/reference candidate to compare against the current PaddleOCR direction.

### Archify — REFERENCE / BENCHMARK

Architecture visualization/documentation patterns for making system structure easier to inspect and communicate.

### Balsa UI — REFERENCE

UI/component and interaction inspiration where it materially improves operator workflows.

### shadcn / improve — REFERENCE / BUILD

Component-system patterns useful for the web console. Adapt to locaOS accessibility, density, and operator needs rather than copying marketing-oriented defaults.

---

## Agent / development workflow research

### Agency Agents — BUILD / INTERNAL TOOLING

Curated role prompts for architecture, product strategy, UX, implementation, and finish/review work.

**Current intended roster:**

1. Product Strategist
2. Evidence & UX Researcher
3. UI Designer
4. Software Architect
5. UI Finish-Gate Reviewer

This is development-process tooling, not the NAVI runtime.

---

## Decision rule

A project being listed here **does not mean we install it**. The preferred outcome is often to extract a small architectural pattern and implement it natively inside locaOS/NAVI.

Preserve these invariants:

1. **locaOS is operational source of truth.**
2. **NAVI retrieves, reasons, recommends, prepares, and orchestrates; it does not bypass domain authority.**
3. AI output is structured and deterministically validated where possible.
4. High-impact identity, financial, contract, and compliance operations require human confirmation.
5. Tenant isolation and server-side authorization remain mandatory.
6. External providers are adapters, not domain truth.
7. Event-sourcing-lite remains the intended history architecture: PostgreSQL current state + immutable/auditable domain events → NAVI context projection → possible future temporal knowledge graph.
