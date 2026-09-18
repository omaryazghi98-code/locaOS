# Union Alpha / OpenCode Audit — 2026-09-17

## Purpose

This document records the Union Alpha / OpenCode audit findings that were produced while evaluating an AI/R&D coding-assistant workflow for locaOS/NAVI.

The audit is a research artifact and implementation guidance. It does **not** authorize adopting Union Alpha, Greptile, or any external agent stack as part of the product runtime.

## Audit focus

The audit was treated as a single-repository, self-hosted PR-review / code-understanding system. The relevant architecture ideas identified for NAVI/R&D were:

- incremental repository indexing keyed by Git blob SHA
- structural code chunking using Tree-sitter
- hybrid retrieval
- deterministic output validation
- strict JSON/Pydantic-style schemas
- diff-line bounds for findings
- finding deduplication
- persistent findings/memory
- explicit change history
- local dry-run / verification before external mutation

## Findings relevant to locaOS/NAVI

### 1. Incremental indexing

Use content identity (for example Git blob SHA) so unchanged repository content does not need to be re-indexed.

Potential NAVI/R&D value:

- cheaper repeated repository analysis
- faster context refresh after commits
- durable understanding of repository evolution
- useful foundation for an AI R&D assistant that follows the repo over time

This should remain a derived research/context index. Git and the repository remain authoritative.

### 2. Structural code retrieval

Tree-sitter-style structural chunking is preferable to blindly splitting source files by character count.

Potential value:

- retrieve functions/classes/modules as coherent units
- preserve imports and surrounding structure where necessary
- improve agent code comprehension
- reduce irrelevant context sent to reasoning models

Benchmark against the actual TypeScript/NestJS/Next.js monorepo before adopting a specific implementation.

### 3. Hybrid retrieval

Combine lexical/structural retrieval with semantic retrieval where useful.

Potential NAVI/R&D use:

```
query
  ↓
lexical / symbol / path retrieval
  +
semantic retrieval
  ↓
ranked repository context
  ↓
reasoning model
```

Do not introduce a vector database solely because the audited system uses one. Compare the approach against QMD and a lean native retrieval layer.

### 4. Deterministic validation

AI-generated findings should be validated against a strict machine-readable contract before being persisted or presented as trusted review output.

Relevant NAVI principle:

```
model output
    ↓
schema validation
    ↓
evidence / source validation
    ↓
persisted finding
```

The model should not be allowed to invent repository paths, line ranges, entities, permissions, or operational facts.

### 5. Diff-line bounds

Review findings should be tied to actual changed lines or explicitly marked as broader contextual observations.

This is particularly relevant to agent-generated code review because it prevents vague findings from being presented as if they were directly evidenced by a patch.

### 6. Deduplication

Persistent review memory needs deterministic deduplication so repeated agent runs do not create the same finding indefinitely.

Potential identity dimensions:

- repository
- commit / diff
- file
- finding category
- normalized finding signature

Exact implementation should be benchmarked rather than copied blindly.

### 7. Persistent findings and change history

The audit highlighted a useful distinction between:

- current repository state
- historical findings
- finding lifecycle
- changes between reviews

For the R&D assistant this can become:

```
repository
   ↓
commit / diff history
   ↓
analysis
   ↓
findings
   ↓
status / resolution history
```

This is a **derived intelligence layer**, not operational truth.

### 8. Local dry-run

A local dry-run mode is valuable before an agent is allowed to create commits, open PRs, or modify external systems.

Recommended workflow:

```
inspect
  ↓
plan
  ↓
dry-run / validate
  ↓
show intended changes
  ↓
human approval
  ↓
write / commit / push
```

This aligns with the broader NAVI rule that high-impact mutations require explicit authorization.

## Classification

**Greptile-style architecture ideas: ADAPT + REFERENCE + BENCHMARK.**

The useful ideas are architectural patterns rather than a mandate to import the audited project's Python/FastAPI/SQLite stack into locaOS.

Union Alpha / OpenCode itself should similarly be treated as an external development tool. It must not become a runtime dependency of NAVI.

## What NOT to do

- Do not import the audited stack wholesale into locaOS.
- Do not replace PostgreSQL/domain truth with an AI index.
- Do not allow an agent to obtain arbitrary SQL access.
- Do not allow repository retrieval to bypass tenant authorization when operational data is involved.
- Do not treat semantic retrieval as proof of a fact.
- Do not persist model claims without source/evidence metadata.
- Do not allow automatic commits/pushes without the configured Git workflow and verification gates.
- Do not use GitHub stars or social-media claims as evidence of architectural suitability.

## Relationship to NAVI

The audit reinforces the current NAVI direction:

```
locaOS operational truth
        ↓
events / history
        ↓
NAVI context + derived repository/operational knowledge
        ↓
retrieval
        ↓
reasoning
        ↓
evidence-backed output
        ↓
human approval
        ↓
controlled execution
```

The R&D assistant can use repository indexing, structural retrieval, persistent findings, and change history to understand **how the software is evolving**.

NAVI must separately understand **what is happening in the rental operation**.

These are complementary contexts and must not be conflated.

## Source / provenance note

This document records the findings from the Union Alpha / OpenCode audit shared during the 2026-09-17 R&D session. Where a finding is a proposed architectural adaptation rather than a directly verified fact about an external project, it is intentionally labeled as such.

## R&D assistant instruction

When continuing research, read this document together with:

- `docs/AI_HANDOFF_OPEN_SOURCE_RESEARCH.md`
- `docs/NAVI_INTELLIGENCE_V0_1.md`
- `AGENTS.md`
- relevant architecture and ADR documents

Use this audit as a research input, not as an implementation mandate.
