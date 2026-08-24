# Research Material — Status

## Expected document

The Master Agent Instructions declare this file as the product source of truth:

```
docs/research/moroccan-rental-platform-research.md
```

**This document is not present in the repository** (verified 2026-08-24, initial commit `8782591`). The repo contains only a stub `README.md`.

## Consequences

1. Phase 0 architecture was derived from the Master Agent Instructions themselves, which
   enumerate the research document's coverage areas (§1) but not its contents or claims.
2. **Every claim that would have originated in the research document is treated as
   UNVERIFIED.** No research-derived legal, regulatory, financial, or API claim has been
   encoded as a business rule.
3. Where Morocco-specific facts were needed to make architectural decisions, independent
   verification was performed and recorded in
   [`docs/verification/register.md`](../verification/register.md).

## Requested action

The research document (or a link to it) must be supplied by the product owner. Once added:

- Re-run the Phase 0 critical analysis against the actual text
  ([`docs/architecture/critical-analysis.md`](../architecture/critical-analysis.md) §1).
- Move each verified/refuted claim into the verification register.
- Amend affected ADRs rather than silently absorbing contradictions.

## Rules for this directory

- Never fabricate research content to fill the gap.
- Never cite the missing document as evidence for a decision.
- Add supplementary research notes here as `notes/<topic>.md` with source links.
