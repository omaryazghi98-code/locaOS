# Blink NAVI Experiment

## Purpose

This branch (`blink/experiment-navi-context`) is a disposable UX laboratory for testing NAVI ideas against the real locaOS application context. It is not a replacement for production architecture and must never become operational truth.

## Important branch fact

The branch was created from `genspark_ai_developer` and retains the real locaOS monorepo/application tree. The temporary Blink work changed only the root preview/bootstrap files so Blink could attempt to start a standalone preview. Do not assume this branch is an empty React mock.

The real web application remains under `apps/web`, including the existing Next.js console, routes, components, NAVI command center, operational surfaces, and shared domain package. The real backend/domain code also remains in the repository.

## Product model

- locaOS = authoritative operating system for car-rental agencies.
- NAVI = intelligence/context layer over locaOS.
- PostgreSQL/current domain services and auditable domain events remain authoritative.
- AI may retrieve, summarize, reason, recommend, prepare, and orchestrate; domain services authorize and mutate.
- External AI, graph/vector databases, OCR, browser agents, voice frameworks, etc. must not become operational truth.

## NAVI philosophy

NAVI should make relevant context appear where the operator is already working instead of forcing the operator to reconstruct history manually.

Foundational inspiration: Pieces. The question is: **What would Pieces look like if it were purpose-built for a rental agency?**

The desired flow is:

Reliable operational truth
→ historical operational events
→ context / memory projection
→ retrieval
→ reasoning
→ recommendations
→ human-approved actions
→ eventually controlled automation

## Existing NAVI implementation to respect

The real application already has `/navi` and a `NaviCommandCenter` with:
- exception-driven attention
- post-return pipeline
- operation lanes
- fleet pulse
- activity timeline
- command input
- real data reads
- loading/error states
- localization hooks
- reduced-motion handling

Do not replace this architecture blindly. The Blink experiment should explore improved contextual UX and interaction patterns that can later be adapted into the real implementation.

## Operational context Blink may use as mock/read-only UX material

Use fictional data, but model the real relationships among:
- customer
- reservation
- vehicle
- contract
- deposit / financial state
- previous rentals
- inspections / damage
- communications
- operational events
- outstanding operations tasks
- document/identity intelligence

Relevant existing workflows include post-return operations:

RETURN INSPECTION → INSPECTED → PREPARATION REVIEW → NO WORK → AVAILABLE

or cleaning / maintenance / QA paths where applicable.

Financial/deposit logic is sensitive. Never create autonomous financial or contract mutations in this experiment.

Document Intelligence follows:

Document / Camera Capture → Intake → Classification → OCR → Field Extraction → Confidence → Validation → Human Confirmation → Canonical Record → Encrypted Storage + Audit

## Context presentation rule

Every important NAVI statement should make its epistemic status clear:

1. CONFIRMED FACT — directly supported by operational data.
2. NAVI CONTEXT — synthesis/relationship across known facts and history.
3. RECOMMENDATION — suggested next step, not a fact.
4. ACTION — human-approved prototype action; no production mutation.

Example:

CONFIRMED FACT
Vehicle returned today.

CONFIRMED FACT
Return inspection recorded minor front-bumper damage.

NAVI CONTEXT
A previous inspection also contained a front-bumper note.

RECOMMENDATION
Review the previous inspection before finalizing the assessment.

ACTION
Review inspection history.

## UX target

Do not build a generic chatbot or marketing page. Build an operational workspace where NAVI feels like a contextual intelligence layer beside the work.

The prototype should demonstrate contextual relevance rather than dumping an entire database record onto the screen.

## Safety / scope

- Mock data only.
- No production credentials.
- No real customer identity data.
- No real database mutations.
- No real financial mutations.
- No real contract changes.
- No autonomous compliance/identity decisions.
- Preserve tenant/auth/security concepts from the real architecture rather than weakening them for production code.

## Preview constraint

The Blink environment previously failed to start the original pnpm monorepo because `pnpm` was unavailable. The disposable branch therefore has temporary root Vite bootstrap files for the Blink preview. The real application tree was not intentionally removed.

When fixing preview behavior, prefer the smallest change that lets Blink render the experiment. Do not delete the real `apps/`, `packages/`, or production domain/application context merely to make a demo run.
