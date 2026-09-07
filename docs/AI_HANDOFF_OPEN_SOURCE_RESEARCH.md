# locaOS / NAVI — Open-Source & Online Research Handoff
## Research Workspace Checkpoint — 2026-09-07

> Dedicated handoff for a future chat/session that continuously researches, verifies, compares, and extracts useful ideas from GitHub, Reddit, technical communities, papers, product docs, and anything the founder discovers online.
>
> This is a research workspace, not a commitment to adopt any repository.

## Project

locaOS is a Morocco-first B2B SaaS operating system for car-rental agencies. It is the authoritative operational system for customers/identity, reservations, fleet, contracts, pickup/return, inspections, damage, deposits/settlement, operations, maintenance, documents, communications, payments, reporting and integrations.

NAVI is the intelligence/context/memory/reasoning/orchestration layer on top of locaOS. It should understand relationships and history across the operational lifecycle, but it is **not** the source of truth. AI may retrieve, summarize, reason, recommend, prepare and orchestrate; domain services authorize and mutate authoritative state.

## Architecture invariants

1. One authoritative domain truth.
2. Tenant isolation and server-side auth/permissions.
3. Financial and contract history must be explainable and appropriately immutable/snapshot-able.
4. External providers live behind adapters.
5. Physical inventory lifecycle is authoritative.
6. AI cannot bypass domain authority.
7. Telemetry is evidence, not automatic judgment.
8. Human confirmation is required for high-impact identity, financial, contractual and compliance operations.

### Event-sourcing-lite

Do not interpret research advice as “never UPDATE or DELETE.” Keep practical PostgreSQL current state plus immutable/auditable domain events:

```text
PostgreSQL current operational state
        +
immutable/auditable domain events
        ↓
NAVI context projection
        ↓
future temporal knowledge graph
```

## Research rules

For every discovered project:

1. Verify the actual repository/project.
2. Check current activity/maintenance.
3. Check license and commercial-use implications.
4. Inspect README, architecture, releases and important issues/discussions.
5. Identify dependencies/infrastructure requirements.
6. Check compatibility with the existing architecture.
7. Check security/privacy implications.
8. Decide what should be learned, adapted, integrated, benchmarked or rejected.
9. Never recommend something solely because of GitHub stars.
10. Never let an external project become authoritative over locaOS domain truth.
11. Benchmark important components against real Moroccan rental workflows before production adoption.

For AI/agent projects also inspect tool permissions, memory, execution, human approval, auditability, sandboxing, persistence/context handling, prompt/tool injection risk and ability to bypass authorization.

## Classification

- **A — Candidate dependency:** potential runtime component.
- **B — Architecture/reference:** study ideas/implementation; don't depend on it.
- **C — Dev/AI tooling:** useful for engineering agents, planning, testing, docs, etc.
- **D — Future capability:** interesting but not current MVP.
- **E — Reject:** unacceptable license, security, reliability, operational, legal or architectural risk.

## Existing research

### PaddleOCR
First OCR provider candidate. Already behind an OCR provider boundary and external worker. Benchmark bilingual/orientation performance with real Moroccan documents.

### Traccar
Future GPS/telematics candidate. Study/future integration. No custom telematics hardware now.

### MapLibre GL JS / OSRM / BullMQ / react-pdf
Future candidates for maps, routing, background jobs and PDF generation when justified.

### CMI Node
Candidate Morocco payment adapter; audit package/provider requirements before production.

### ERPNext / Dolibarr / CASL
Integration/architecture references only unless a concrete need justifies adoption.

### BookCars
Car-rental reference for pricing, locations, scheduling and UX. Reference only; do not fork into the core.

### Fleetbase
Logistics/fleet reference; AGPL-3.0 noted in prior research. Reference only; license matters before code reuse.

### TryCompAI CRM
Agentic CRM reference for work queues, context, memory and follow-ups. Do not turn locaOS into a generic CRM.

### Unlimited-OCR
Potential second OCR provider. Benchmark against PaddleOCR; difficult-document/repetition risks mean OCR remains evidence, never truth.

## NAVI memory research

### Graphiti / Zep
Temporal knowledge graph. Potential pipeline:

```text
Operational events
       ↓
NAVI context projection
       ↓
Temporal knowledge graph
       ↓
context-aware retrieval/reasoning
```

Decision: **INVESTIGATE / BENCHMARK**, not authoritative. Test historical questions such as why a vehicle was unavailable, what happened across rentals, what changed between pickup/return, and why a deposit remains unresolved.

### Mem0
Potential conversational/preference memory. Investigate later; do not confuse preference memory with authoritative operational memory.

### QMD
Local/on-device document and knowledge retrieval. Strong candidate for NAVI knowledge retrieval; compare with our own retrieval architecture.

## Agent / engineering tooling

### shadcn/improve
Codebase auditing/planning workflow with durable plans and inspect-before-modify patterns. **HIGH-VALUE DEV TOOL TO TEST.** Project docs remain authoritative.

### OpenWiki
Derived agent/human documentation layer. Evaluate without replacing explicit `docs/` decisions.

### Ponytail / awesome-agent-skills
Agent skills/rules collections. Curate selectively; avoid uncontrolled context or permission sprawl.

### Archify
Architecture/data-flow diagram generation. Documentation only; generated diagrams never override explicit architecture decisions.

## New leads from supplied Instagram screenshots

Revenue claims in social posts are **not verified evidence**. Repositories are research leads.

### PipeCat — `pipecat-ai/pipecat`
Realtime voice/multimodal agent framework. Potential future voice NAVI for rental enquiries, availability, pickup coordination and human handoff. High-impact actions still require domain authorization/human approval. **FUTURE / INVESTIGATE.**

### Postiz — `gitroomhq/postiz-app`
Agentic social-media scheduling. Possible future Agency Growth/Marketing layer, not rental core. **FUTURE / REFERENCE ONLY.**

### AnythingLLM — `Mintplex-Labs/anything-llm`
Local-first AI/agent/document knowledge platform. Potential private agency knowledge assistant. Compare with QMD/our own retrieval. Never authoritative over operational DB. **INVESTIGATE.**

### CrewAI — `crewAIInc/crewAI`
Multi-agent orchestration. Potential future specialized NAVI capabilities, but do not create multiple autonomous agents without evidence of benefit. Research permissions, auditing, context sharing, loops/failures and human approval. **REFERENCE / INVESTIGATE.**

### OpenHuman — `tinyhumansai/openhuman`
Local-first personal AI/memory system. Highly relevant to NAVI persistent-memory philosophy. Research persistence, temporal reasoning, contradiction resolution, local storage, multi-agent context, permissions and execution. **HIGH-VALUE RESEARCH LEAD.**

### Maka — `apache/maka`
Agent workspace emphasizing messages, tool calls and permission decisions. Potential NAVI audit model:

```text
agent session → context → tool call → permission → result → approval → domain mutation → audit event
```

Could let NAVI explain what it saw, recommended, called, was allowed to do, who approved it and what changed. **HIGH-VALUE RESEARCH LEAD.**

### browser-use — `browser-use/browser-use`
AI browser automation. Potentially valuable for Moroccan/external portals lacking APIs. Treat browser output as external evidence, not authoritative truth. Research prompt injection, credentials, destructive actions, anti-bot restrictions and terms of service. **HIGH-VALUE FUTURE TOOL / SECURITY STUDY.**

### Startup credits
Research legitimate current Google Cloud/AWS/Azure/GitHub/AI/startup programs and eligibility. Never architect around vendor credits. **Architecture first. Credits second.**

## Newly recorded leads from 2026-09-07 screenshots

These were supplied as additional discovery leads. **Do not treat social-post claims, stars, revenue figures or “free” claims as verified evidence. Verify each underlying project during deep research.**

### Balsa UI — `balsa-ui/balsa-ui`
Design-system and UI component registry positioned as a contract between a design system and AI coding agents. Potentially relevant to making NAVI/Codex-generated frontend changes conform to locaOS design-system rules. **HIGH-PRIORITY INVESTIGATE / ARCHITECTURE REFERENCE.**

Research questions: registry format, component generation/distribution, framework support, agent integration, versioning, accessibility, licensing, whether it can coexist with our existing frontend/component architecture, and whether it reduces agent UI drift enough to justify adoption.

### OmniRoute — `diegosouzagw/OmniRoute`
AI model/provider routing layer shown as connecting coding tools to many model providers and switching when quotas are exhausted. Potential founder/developer infrastructure for reducing provider lock-in and handling usage limits. **HIGH-PRIORITY INVESTIGATE / DEV TOOL.**

Research questions: actual provider support, routing policy, context preservation, failure semantics, credentials/security, logging/privacy, model compatibility, cost, licensing, and whether it works cleanly with our GitHub/Codex workflow without adding fragile complexity. Do not make locaOS runtime depend on it.

### HyperFrames — HeyGen
Code-driven video generation using HTML/CSS/JS, aimed at landing pages, product demos, ads and social videos. Potentially useful for rapid locaOS product demos, launch assets and marketing automation. **MARKETING / FOUNDER TOOL — INVESTIGATE.**

### OpenMotion — `openmotion.design`
Motion-design workspace positioned as an AI-assisted alternative to hiring a motion designer. Potentially useful for product demos, launch videos and marketing assets. **MARKETING / FOUNDER TOOL — INVESTIGATE.**

### CanvasUI — `canvasui.dev`
Open-source library of HTML-in-canvas/WebGL creative components, framework-agnostic. Potentially useful for high-impact marketing/landing visuals or selected product experiences, but not automatically appropriate for the operational console. **DESIGN / MARKETING REFERENCE — INVESTIGATE.**

### Tegaki — `gkurt.com/tegaki`
Animated handwriting/stroke-data generation from fonts, with web framework integrations. Potentially useful for small product/marketing storytelling effects. **LOW-PRIORITY DESIGN TOOL / FUTURE.**

### Fincept Terminal
AI-powered financial/market intelligence terminal. Potential founder/company-finance utility, but little direct relevance to the rental operating system or NAVI architecture. **LOW PRIORITY / FOUNDER UTILITY.**

## Strategic ideas

1. Voice NAVI.
2. Persistent operational memory.
3. Agent audit trail.
4. Secure browser agent for external evidence.
5. Specialized NAVI capabilities only when benchmarks justify them.
6. Private/local agency AI as a possible future selling point.
7. AI-native design-system contracts so coding agents can modify the UI without uncontrolled visual drift.
8. Model/provider routing as optional founder/developer infrastructure, not a product dependency.
9. Programmatic product-demo and motion-content generation to reduce founder marketing bottlenecks.

## Priority matrix

| Project / idea | Priority | Action |
|---|---:|---|
| Graphiti | 🔴 High | Deep research + benchmark |
| OpenHuman | 🔴 High | Deep research |
| Maka | 🔴 High | Deep research |
| QMD | 🔴 High | Evaluate |
| browser-use | 🟠 High | Security/architecture study |
| shadcn/improve | 🟠 High | Test |
| **Balsa UI** | 🔴 High | Deep research / design-system-agent study |
| **OmniRoute** | 🔴 High | Deep research / dev-tool experiment |
| PipeCat | 🟠 Medium | Study |
| AnythingLLM | 🟠 Medium | Compare |
| CrewAI | 🟠 Medium | Study |
| OpenWiki | 🟡 Medium | Evaluate |
| awesome-agent-skills | 🟡 Medium | Curate |
| Archify | 🟡 Medium | Experiment |
| Ponytail | 🟡 Medium | Selective experiment |
| **HyperFrames** | 🟠 Medium | Marketing workflow test |
| **OpenMotion** | 🟠 Medium | Marketing/motion workflow test |
| **CanvasUI** | 🟡 Medium | Design/marketing experiment |
| Postiz | 🟢 Later | Reference |
| Fleetbase | 🟢 Later | Study models |
| Unlimited-OCR | 🟠 Medium | Benchmark |
| Mem0 | 🟡 Later | Compare |
| Tegaki | 🟢 Later | Optional design/marketing utility |
| Fincept Terminal | 🟢 Later | Founder/company-finance utility |
| DocuSeal | 🟡 Later | Future integration |
| Traccar | 🟡 Later | Future |
| Temporal | 🟢 Deferred | Do not implement now |

## Research tracks

### 1 — NAVI Memory
Deep research Graphiti, OpenHuman, Mem0, QMD and Pieces-style context. Determine what belongs in PostgreSQL, temporal graph and semantic retrieval; how contradictions/validity are handled; whether derived memory can be rebuilt; and how to prevent temporal hallucination.

### 2 — Agent Safety
Research Maka, MCP, agent permissions, tool authorization, audit logs and sandboxing. Determine whether NAVI needs its own identity, what permissions it gets, which actions require confirmation, and how tool calls are audited.

### 3 — Browser Automation
Research browser-use and Playwright agent patterns, especially Moroccan portals. Determine legal/technical automation boundaries, safe authentication, evidence capture and prompt-injection defenses.

### 4 — Voice
Research PipeCat, realtime voice, telephony and Arabic/French/Darija support. Measure real cost per call, authentication, safe actions and human handoff.

### 5 — Local/Private AI
Research AnythingLLM, OpenHuman, QMD and local inference infrastructure.

### 6 — AI Engineering Workforce
Research improve, awesome-agent-skills, Ponytail, Archify, OpenWiki and similar tools for persistence across sessions, inspect-before-modify, architecture preservation, safe parallelization and verification.

### 7 — AI-Native Product Design & Founder Content
Research Balsa UI and adjacent agent-compatible design-system registries; separately evaluate HyperFrames, OpenMotion, CanvasUI and Tegaki for rapid product demos, launch content and marketing. Do not let marketing/design tooling dictate operational-console architecture.

### 8 — AI Model/Provider Infrastructure
Research OmniRoute and similar routing/proxy layers as optional developer infrastructure. Evaluate reliability, security, privacy, cost and context preservation before using them in the founder workflow.

## Research loop

```text
DISCOVER
   ↓
VERIFY
   ↓
UNDERSTAND
   ↓
CLASSIFY
   ↓
COMPARE
   ↓
BENCHMARK
   ↓
DECIDE
   ↓
DOCUMENT
   ↓
ONLY THEN
ADOPT
```

Not:

```text
Instagram → GitHub stars → npm install
```

## Current engineering context

NAVI frontend already has the dedicated command center, exception-driven attention stack, post-return pipeline, operation lanes, fleet pulse, activity timeline, command input, structured intent routing, real data reads, global quick panel/sidebar and visual propagation across key console surfaces.

Post-return operations cover return inspection → inspected → preparation review → no work → available, with cleaning/maintenance/QA paths and tenant-scoped tasks/domain guards.

Document Intelligence meaningful branch: `codex/document-intelligence-driver-license-v2`.

Workflow:

```text
Document → Intake → Classification → PaddleOCR → driver-license extraction → confidence/validation → human review → confirmed identity document → audit
```

Real Moroccan driver's licence samples are available for local testing. **Never commit private identity-document images to GitHub.**

## Immediate engineering priority

1. Pull/test Document Intelligence branch.
2. Run migration `0012_document_intelligence.sql`.
3. Run API/web verification.
4. Test the real Moroccan driver's licence sample.
5. Fix OCR orientation/bilingual issues based on evidence.
6. Add duplicate/idempotency protection.
7. Improve document preview retrieval.
8. Generalize to CIN/passport after driver-license flow is solid.
9. Then formalize the minimum operational event layer.
10. Then benchmark temporal/context systems such as Graphiti.

## Non-negotiable boundary

**locaOS = authoritative operating system for a rental agency.**

**NAVI = intelligence/context/orchestration layer over authoritative truth.**

Open-source projects are tools and references, not the architecture.

Ultimate sequence:

```text
Reliable operational truth
        ↓
Historical operational events
        ↓
Context / memory projection
        ↓
Retrieval
        ↓
Reasoning
        ↓
Recommendations
        ↓
Human-approved actions
        ↓
Eventually controlled automation
```

The goal is not to collect cool repositories. **The goal is to discover architectural leverage that makes locaOS/NAVI dramatically better while preserving a lean, reliable, auditable, Morocco-first product.**

## Session opening prompt

> You are continuing the locaOS/NAVI open-source and AI architecture research project.
>
> Read `AI_HANDOFF_OPEN_SOURCE_RESEARCH.md` first and treat it as the current research checkpoint.
>
> Continuously research and deeply evaluate GitHub repositories, Reddit discussions, technical papers, products, agent frameworks, memory systems, browser automation tools, OCR systems, voice systems, workflow engines, developer-agent tooling, design-system tooling, content-generation tooling, model-routing infrastructure, and other technologies that could materially improve locaOS/NAVI or the founder's ability to build and validate it.
>
> Do not blindly recommend dependencies. For every discovery: verify the project, inspect its current state and license, understand its architecture, identify the problem it solves, map that problem to locaOS/NAVI, compare it with what we already have, identify security/privacy/operational risks, and classify it as integrate / adapt / reference / benchmark / future / reject.
>
> Keep locaOS as the authoritative operational core and NAVI as the context/reasoning/orchestration layer. Never let an AI framework, graph database, vector database, browser agent, OCR system, design system, model router, or external SaaS become the source of operational truth.
>
> High-priority research leads currently include Graphiti, OpenHuman, Maka, QMD, browser-use, Balsa UI, OmniRoute, PipeCat, AnythingLLM, CrewAI, shadcn/improve, and selected agent-skill/documentation projects.
>
> Also investigate anything new I send from GitHub, Reddit, Instagram, articles, videos, papers, or other sources.
>
> Be skeptical of social-media claims about revenue, GitHub stars, “game-changing” technology, and “free” infrastructure. Verify underlying facts with primary sources where possible.
>
> The objective is not to collect cool repositories. The objective is to discover architectural leverage that can make locaOS/NAVI dramatically better while preserving a lean, reliable, auditable, Morocco-first product.
