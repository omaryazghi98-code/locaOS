# Research Material

## Source document

[`moroccan-rental-platform-research.md`](moroccan-rental-platform-research.md) —
"Next-Generation Car Rental Management Platform for Morocco: 2026 Product Architecture",
with 40 cited sources. Supplied 2026-08-24 (was missing during initial Phase 0 — see
[reconciliation](../architecture/research-reconciliation.md)).

## How to treat this document

1. **Product research with citations, not verified truth.** Every legal, regulatory,
   financial, API, or technical claim is classified in the
   [verification register](../verification/register.md). Research citations count as
   *secondary sources* — a claim is never promoted past PARTIALLY VERIFIED on research
   citation alone.
2. **Preserve terminology and intent.** Research terms map to locaOS terms in the
   reconciliation §1.3 crosswalk (caution → Deposit, Blank Slate → blank contract, ghost
   state → VehicleSignal GHOST_STATE, franchise → deductible, visite technique → VT document
   type, PLBS → card preauth, MRE, Admission Temporaire, Constat Amiable…). Never "fix" the
   research silently; divergences are stated with reasons in the reconciliation document.
3. **Safety over vision.** Research "system actions" that auto-bill, auto-deduct, auto-tag,
   or auto-contact are converted to human-confirmed actions (project brief §14); some
   concepts are rejected outright with reasons (reconciliation §3).
4. **Nothing is integrated by naming it.** CMI, Fatourati, DGI, NARSA, Damanesign,
   Barid eSign, WhatsApp, Teltonika, flight APIs… all ship behind ports with honest status
   labels until real implementations exist (brief §26).

## Companion analyses

- [Research reconciliation](../architecture/research-reconciliation.md) — the full
  Phase 0 ⇄ research comparison, MVP recommendation, killer-feature ranking, open decisions.
- [Verification register](../verification/register.md) — claim-by-claim status with sources.

## Rules for this directory

- Never edit the research document; add supplementary notes as `notes/<topic>.md` with
  source links.
