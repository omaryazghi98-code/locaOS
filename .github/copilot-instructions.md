# Copilot Instructions — locaOS

locaOS: operating system for Moroccan car-rental agencies. The authoritative contributor
guide is [`AGENTS.md`](../AGENTS.md) — read it. Quick rules:

- **Current state:** Phase 0 (architecture docs only, in review). No app code yet. Don't
  scaffold code unilaterally; follow [`docs/architecture/roadmap.md`](../docs/architecture/roadmap.md).
- **Read first:** [`docs/architecture/`](../docs/architecture/) + ADRs in
  [`docs/decisions/`](../docs/decisions/README.md). The research document referenced by the
  brief is missing — do not cite or invent it.
- **Tenancy:** every query agency-scoped; RLS is the second wall; write cross-tenant tests.
- **Vehicles:** status changes only via the domain state machine; every transition audited.
- **Money:** integer centimes, append-only records, corrections via reversals, always audited.
- **Safety:** no auto-charging/blacklisting/immobilizing/contacting — those require an
  Approval (human confirmation) first.
- **External facts** (legal/regulatory/API): must be backed by
  [`docs/verification/register.md`](../docs/verification/register.md); otherwise make them
  configuration, never hard-coded truth.
- **Integrations:** ports + adapters only; label status MOCK/SIMULATED/UNAVAILABLE/CONNECTED;
  never fake live data.
- **i18n:** fr default, ar (RTL), en — catalogs only, no inline copy. UTC in, Africa/Casablanca out.
- **No secrets in code**, ever. Env vars only.
- **Done means:** schema + logic + UI + validation + error handling + tests, not a rendered page.
