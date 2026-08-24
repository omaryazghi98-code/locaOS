# Copilot Instructions — locaOS

locaOS: operating system for Moroccan car-rental agencies. The authoritative contributor
guide is [`AGENTS.md`](../AGENTS.md) — read it. Quick rules:

- **Current state:** Phase 0 architecture reconciled with the research document
  (2026-08-24); awaiting MVP-scope approval. No app code yet. Don't scaffold code
  unilaterally; follow [`docs/architecture/roadmap.md`](../docs/architecture/roadmap.md).
- **Read first:** [`docs/architecture/`](../docs/architecture/) — especially
  [`research-reconciliation.md`](../docs/architecture/research-reconciliation.md) — + ADRs in
  [`docs/decisions/`](../docs/decisions/README.md). The research document is product research,
  not verified truth; claims are classified in
  [`docs/verification/register.md`](../docs/verification/register.md).
- **Tenancy:** every query agency-scoped; RLS is the second wall; write cross-tenant tests.
- **Vehicles:** status changes only via the domain state machine; every transition audited.
- **Money:** integer centimes, append-only records, corrections via reversals, always audited.
- **Safety:** no auto-charging/blacklisting/immobilizing/contacting — those require an
  Approval (human confirmation) first. Telemetry never mutates vehicle status (ADR-0010
  signals). Permanently rejected: automated starter-kill, silent customer profiling,
  employee fatigue profiling.
- **External facts** (legal/regulatory/API): must be backed by
  [`docs/verification/register.md`](../docs/verification/register.md); otherwise make them
  configuration, never hard-coded truth.
- **Integrations:** ports + adapters only; label status MOCK/SIMULATED/UNAVAILABLE/CONNECTED;
  never fake live data.
- **i18n:** fr default, ar (RTL), en — catalogs only, no inline copy. UTC in, Africa/Casablanca out.
- **No secrets in code**, ever. Env vars only.
- **Done means:** schema + logic + UI + validation + error handling + tests, not a rendered page.
