# AI Handoff — 2026-09-07 Agent / Knowledge / OCR Foundations Research

## Why this checkpoint exists

Context limits must not force locaOS to repeat repository research. This checkpoint records the second open-source sweep from 2026-09-07, based on repositories surfaced in user-provided screenshots plus current GitHub/Reddit/community evidence.

## Current product rule

Do not turn external projects into the authoritative rental core. Reuse commodity infrastructure and agent tooling behind explicit boundaries. locaOS remains authoritative for tenant state, rental lifecycle, contracts, money, identity, inventory, and audit.

## New repositories reviewed

### 1. `shadcn/improve` — HIGH VALUE FOR INTERNAL DEVELOPMENT

Purpose: an agent skill that audits a codebase, produces prioritized findings and self-contained implementation plans, and can dispatch cheaper executors. It is explicitly read-only for source changes; plans are the product.

Potential locaOS use:
- internal engineering/audit workflow
- generate plans for future agents from current repo state
- preserve findings as markdown instead of losing them in chat
- branch-scoped review before PRs
- reconcile completed/stale plans

Decision: **ADOPT AS DEVELOPMENT TOOLING / EVALUATE LOCALLY**. Do not make it a runtime dependency of locaOS.

Important security/ops note: the repo currently has open discussions/PRs around executor-model explicitness, security of execute-dispatched agents, and workspace-local disposable worktrees. Review the current version before enabling execute mode.

Source: https://github.com/shadcn/improve

### 2. `langchain-ai/openwiki` — HIGH VALUE FOR REPO MEMORY

Purpose: a CLI that generates and maintains a linked Markdown wiki for a codebase or personal knowledge. It is intended to be read by agents and humans and can keep documentation current.

Potential locaOS use:
- generate a navigable architecture/domain map
- maintain a secondary machine-readable knowledge layer
- help new agents understand the repo quickly
- reduce repeated repository archaeology after context resets

Decision: **EVALUATE AS OPTIONAL INTERNAL DOCUMENTATION TOOL**. We already maintain explicit handoff/architecture docs, so OpenWiki must complement them rather than replace the authoritative docs in `docs/`.

Security/privacy note: inspect telemetry settings and generated-source scope before running against private business/customer material. OpenWiki documents telemetry opt-out controls.

Source: https://github.com/langchain-ai/openwiki

### 3. `tobi/qmd` — HIGH VALUE FOR LOCAL KNOWLEDGE RETRIEVAL

Purpose: local/on-device search engine for Markdown notes, transcripts, documentation and knowledge bases. It combines BM25, vector search and LLM reranking using local GGUF models.

Potential locaOS use:
- local search across project docs and handoffs
- future NAVI internal knowledge retrieval
- agent context retrieval without sending the entire repository to a model
- searchable operational documentation

Decision: **STRONG EVALUATION CANDIDATE**. Keep this as a retrieval component, not as authoritative data storage. If introduced, index sanitized/approved knowledge rather than raw tenant PII or secrets.

Source: https://github.com/tobi/qmd

### 4. `baidu/Unlimited-OCR` — STRONG SECOND OCR CANDIDATE, NOT REPLACEMENT YET

Purpose: 3B-class long-document OCR/parser designed for multi-page documents and long output using Reference Sliding Window Attention. MIT licensed. Current project supports Transformers/vLLM paths and has active community activity.

Why it matters to locaOS:
- long rental contracts/amendments
- multi-page insurance/technical documents
- invoices and supplier documents
- table-heavy administrative paperwork
- potentially better whole-document context than page-isolated OCR

Decision: **DO NOT REPLACE PADDLEOCR NOW.** Add as a second `OCR_PROVIDER` candidate and benchmark it against our real Moroccan documents.

Critical caution: community/Hugging Face reports include cases of repetition and, more importantly, hallucinated text on difficult/low-resolution documents. That is unacceptable for authoritative identity, contract or financial extraction without human confirmation. This reinforces the existing locaOS rule: OCR output is evidence, never canonical truth.

Hardware caution: the documented inference path is CUDA/GPU-oriented; CPU use appears possible only with caveats and community experimentation. Do not make it a Phase-0 requirement.

Source: https://github.com/baidu/Unlimited-OCR

### 5. `trycompai/crm` — HIGH VALUE ARCHITECTURAL REFERENCE

Purpose: open-source agentic CRM. Its README emphasizes an agent that maintains notes, work queues, follow-ups and background work rather than only request/response chat. It explicitly states that the agent must not guess facts about people.

Potential locaOS use:
- NAVI background work queues
- follow-up/task concepts
- agent memory/context patterns
- explicit research/action budgets
- human-safe CRM/operations automation

Decision: **REFERENCE ONLY / MINE PATTERNS**. Do not import CRM domain code or turn locaOS into a generic CRM. Existing customer/rental domains remain authoritative.

Especially valuable principle: no guessed person facts. This aligns with our document-intelligence and identity-confirmation rules.

Source: https://github.com/trycompai/crm

### 6. `DietrichGebert/ponytail` — USEFUL AGENT SKILL COLLECTION

Purpose: collection of agent skills/rules intended to make coding agents behave more like experienced senior engineers, including reuse-first and review-oriented behavior. The repo exposes integrations for several agent environments.

Potential locaOS use:
- reusable engineering-agent skills
- review/reuse discipline
- reduce unnecessary code generation
- standardize agent behavior across future contributors/tools

Decision: **EVALUATE AS DEVELOPMENT TOOLING ONLY**. Do not place its agent instructions inside the runtime application or blindly copy rules into `AGENTS.md`.

Community evidence is still relatively anecdotal despite very high GitHub popularity. Treat as a productivity experiment, not an engineering authority.

Source: https://github.com/DietrichGebert/ponytail

### 7. `andrewng/openworker` — UNVERIFIED FROM CURRENT ACCESS

The screenshot identifies `github.com/andrewng/openworker` as an AI desktop coworker concept. The repository could not be resolved through the available GitHub API access during this checkpoint, and web search did not provide enough reliable primary-source information to assess its implementation.

Decision: **DO NOT ADOPT / DO NOT INFER.** Revisit only if the repository becomes publicly accessible or a working primary-source link is supplied.

## Updated priority for locaOS

### Immediate
1. Finish and benchmark Document Intelligence with PaddleOCR on real Moroccan documents.
2. Keep the OCR provider boundary intact.
3. Test Unlimited-OCR as a second provider only after the existing pipeline works.
4. Continue explicit AI handoff/checkpoint documentation.

### Development tooling worth testing
1. `shadcn/improve` — highest immediate value for repo planning/auditing.
2. `tobi/qmd` — highest value for local project knowledge retrieval.
3. `langchain-ai/openwiki` — useful for generated architecture/wiki navigation.
4. `DietrichGebert/ponytail` — productivity/agent-skill experiment.

### Product/runtime architecture
- `trycompai/crm`: mine background-agent/work-queue/memory patterns; do not import CRM core.
- `Unlimited-OCR`: future OCR provider; benchmark before production use.

## Non-negotiable boundary

```text
External OSS / AI tool
        ↓
 adapter / skill / retrieval boundary
        ↓
 locaOS domain service
        ↓
 authorization + tenant isolation + validation
        ↓
 authoritative state / audit
```

No external agent, OCR model, retrieval index, CRM repository, or generated plan may become the source of truth for rental state, identity, contracts, money, deposits, vehicle availability, or compliance.

## Verification status

- GitHub repository metadata checked for `shadcn/improve`, `trycompai/crm`, `baidu/Unlimited-OCR`, `tobi/qmd`, `langchain-ai/openwiki`, and `DietrichGebert/ponytail`.
- `andrewng/openworker` could not be resolved through available GitHub access.
- Web/community evidence checked for OCR and agent-tooling usage/risks.
- No locaOS runtime dependencies were installed from this research.
- No local build/typecheck/lint claim is made by this checkpoint.
