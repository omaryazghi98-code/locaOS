# Mem — R&D Lead for locaOS / NAVI

**Classification:** ADAPT + REFERENCE + BENCHMARK

**Source:** https://canivibecodeit.com/mem-ai

## Core loop studied

`capture linked notes → persistent Markdown source of truth → rebuildable SQLite index → semantic/full-text retrieval → related memories → backlinks → export`

## High-value patterns for NAVI

- **Authoritative source vs disposable index:** keep the durable source authoritative and make search/index projections rebuildable.
- **Rebuildable memory:** if an index becomes stale, corrupted, or replaced, reconstruct it from authoritative data rather than treating the memory database as truth.
- **Relationship-aware retrieval:** backlinks, links, tags, and related memories provide context beyond keyword search.
- **Fast command/keyboard interaction:** command palette and keyboard-first operations are useful references for NAVIOS operator workflows.
- **External-change awareness:** detect stale/external changes and reconcile explicitly instead of silently overwriting.
- **Import/export:** users should not be trapped in the product or lose durable knowledge because an index/runtime changes.
- **Local-first/degraded operation:** preserve useful local behavior when hosted/external services are unavailable.

## NAVI mapping

For NAVI, the equivalent authority boundary is:

`locaOS PostgreSQL current state + immutable/auditable domain events → rebuildable NAVI context/index/projections → retrieval/reasoning`

NAVI memory/context must never become a second operational source of truth.

Domain relationships should come from authoritative locaOS entities/events rather than requiring operators to manually maintain wiki-style links.

## What the standalone Mem replacement deliberately does not reproduce

The Can I Vibe Code It page identifies the harder product advantages as hosted AI memory, sync, ingestion integrations, continuously tuned retrieval, frictionless mobile capture, real-time collaboration, hosted publishing, and proprietary AI memory. citehttps://canivibecodeit.com/mem-ai

For NAVI, these should be treated as research boundaries rather than reasons to copy Mem's Tauri/React/SQLite/Markdown implementation.

## Decision

**ADAPT** the rebuildable-index, relationship-aware retrieval, external-change reconciliation, keyboard-first interaction, and import/export principles.

**REFERENCE** Mem for persistent knowledge UX.

**BENCHMARK** future NAVI memory/retrieval quality against these primitives.

**Do not import** the Tauri/React/SQLite/Markdown stack into locaOS merely because the reference implementation uses it.

No Mem runtime dependency approved.
