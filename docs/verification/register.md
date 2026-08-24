# Verification Register

Claim-by-claim tracking of external (legal, regulatory, financial, technical) facts that
could influence locaOS behavior. Nothing moves from **UNVERIFIED** to **VERIFIED** without a
primary or reputable secondary source recorded here.

Legend:

- **VERIFIED** — confirmed against law text, regulator, or multiple reputable sources.
- **PARTIALLY VERIFIED** — real but details conflict or need a primary source before encoding.
- **UNVERIFIED** — plausible; no source yet. Must not become a hard-coded rule.
- **REFUTED** — contradicted by sources.

> The product research document (`docs/research/moroccan-rental-platform-research.md`) is
> **absent from this repository**. All claims attributed to it remain UNVERIFIED by definition.

| # | Domain | Claim | Status | Notes & sources |
|---|--------|-------|--------|-----------------|
| 1 | Payments | CMI (Centre Monétique Interbancaire) is the dominant Moroccan online-card payment gateway; merchant account obtained via a Moroccan bank; supports Visa/Mastercard/Maestro, 3-D Secure | VERIFIED | Secondary sources consistent: webcom.ma (integration guide incl. merchant onboarding: registre de commerce, identifiant fiscal, ICE), pixmage.ma. No official CMI docs reviewed yet — needed before building an adapter. |
| 2 | Payments | Stripe is not directly available to Moroccan-established businesses | PARTIALLY VERIFIED | Claimed by pixmage.ma (2026-04). Recheck at integration time. |
| 3 | Data protection | Law 09-08 governs personal-data processing; enforced by CNDP; most processing requires prior declaration/authorization | VERIFIED | korte-law.com; rmgsolutions.ma; upsilon-consulting.com (Arts. 43–44). Penalties incl. fines and imprisonment. |
| 4 | Data protection | International transfers of personal data require CNDP authorization unless destination ensures adequate protection (EU considered adequate) | VERIFIED | korte-law.com; upsilon-consulting.com. **Architecture impact:** prefer EU (e.g., France) hosting regions; CNDP formalities are the operator's responsibility — surface this in deployment docs, do not hardcode a legal conclusion in product code. |
| 5 | Vehicle compliance | NARSA-approved periodic technical inspection ("visite technique", VT) is mandatory; rental vehicles subject to stricter periodicity | PARTIALLY VERIFIED | VT regime itself VERIFIED (NARSA-agreed centers: SGS, Dekra, Norisko…). **Periodicity conflicts across secondary sources**: demarchesmaroc.com says rental cars every 6 months from first registration; expertvoiture.ma (2026) gives private-vehicle schedules (first VT at 4–5 yrs, then 2 yrs / 1 yr) and a different rental rule. Must be checked against primary NARSA/regulatory text before encoding any date math. |
| 6 | e-Signature | Damanesign is a DGSSI-agréé Qualified Trust Service Provider (law 43-20 framework); issues qualified e-signature certificates | VERIFIED | yabiladi.com (2025-03); start-up.ma (2025-06). Legal equivalence to handwritten signature applies to qualified signatures — **whether a rental contract requires that level is a legal question, currently UNVERIFIED.** |
| 7 | e-Signature | Barid eSign (Barid Al-Maghrib) is a state-agreed certification/e-signature provider since 2011 | VERIFIED | philatelie.ma (official Barid stamp description); corroborates §26 list. |
| 8 | Tax / invoicing | DGI (Direction Générale des Impôts) has an e-invoicing mandate with defined phases obligating Moroccan businesses | UNVERIFIED | Real system (SIMPL-Tax / facturation électronique) but rollout phases/dates for SME car-rental agencies not yet confirmed against a primary DGI source. Do not build invoice numbering/compliance logic on assumed deadlines. |
| 9 | Identity | CIN (Carte Nationale d'Identité Électronique), passport, and Moroccan driving license are the practical identity/driver documents; utility of each for KYC in rental | PARTIALLY VERIFIED | Document types are real and well known. Acceptance rules (which doc combinations are required for which customer type) are agency practice, not law — keep configurable, never hardcode. |
| 10 | Localization | Morocco timezone Africa/Casablanca shifts between UTC+1 and UTC+0 (around Ramadan) | PARTIALLY VERIFIED | Well-known tz behavior; must be handled by storing UTC and using IANA tz `Africa/Casablanca` for display/scheduling. Verify current-year transitions via tzdata at implementation time. |
| 11 | Telematics | Teltonika devices are commonly used/compatible with Moroccan fleet tracking | UNVERIFIED | Hardware availability plausible; no source yet. Adapter interface must not assume Teltonika specifics. |
| 12 | Comms | WhatsApp is the dominant business communication channel for Moroccan rental customers | UNVERIFIED | Commonly asserted; no source in repo. Treat as product hypothesis for discovery, not fact. |
| 13 | Fines | Moroccan traffic fines (radar/PV) can reach rental agencies as registered owners, with transfer of liability processes | UNVERIFIED | Process details (ANSR/PV télépédé detection, owner liability transfer) must be verified with primary sources before building the Fine → Customer charge workflow. |
| 14 | Market | Moroccan agencies commonly run hybrid paper/digital contracts and cash-heavy operations | UNVERIFIED | Asserted by Master Instructions §8/§18; consistent with design constraints, but keep as product assumption pending the research document. |

## Rules

1. Any PR that introduces a business rule backed by an external fact must reference a
   register entry (or add one) in its description.
2. Register entries never cite the missing research document as source.
3. Sources are recorded with retrieval dates; legal claims get re-checked before GA features ship.
