# Verification Register

Claim-by-claim tracking of external (legal, regulatory, financial, technical) facts that
could influence locaOS behavior. Nothing moves from **UNVERIFIED** to **VERIFIED** without a
primary or reputable secondary source recorded here.

Legend:

- **VERIFIED** — confirmed against law text, regulator, or multiple reputable sources.
- **PARTIALLY VERIFIED** — real but details conflict or need a primary source before encoding.
- **UNVERIFIED** — plausible; no source yet. Must not become a hard-coded rule.
- **REFUTED** — contradicted by sources.

> The product research document (`docs/research/moroccan-rental-platform-research.md`) was
> absent when Phase 0 was written; it was supplied and reconciled on 2026-08-24
> ([reconciliation](../architecture/research-reconciliation.md)). Research citations are
> **secondary sources** — a research citation alone never upgrades a claim past
> PARTIALLY VERIFIED; primary sources remain required for VERIFIED legal/regulatory claims.

| # | Domain | Claim | Status | Notes & sources |
|---|--------|-------|--------|-----------------|
| 1 | Payments | CMI (Centre Monétique Interbancaire) is the dominant Moroccan online-card payment gateway; merchant account obtained via a Moroccan bank; supports Visa/Mastercard/Maestro, 3-D Secure | VERIFIED | Secondary sources consistent: webcom.ma (integration guide incl. merchant onboarding: registre de commerce, identifiant fiscal, ICE), pixmage.ma. No official CMI docs reviewed yet — needed before building an adapter. |
| 2 | Payments | Stripe is not directly available to Moroccan-established businesses | PARTIALLY VERIFIED | Claimed by pixmage.ma (2026-04). Recheck at integration time. |
| 3 | Data protection | Law 09-08 governs personal-data processing; enforced by CNDP; most processing requires prior declaration/authorization | VERIFIED | korte-law.com; rmgsolutions.ma; upsilon-consulting.com (Arts. 43–44). Penalties incl. fines and imprisonment. |
| 4 | Data protection | International transfers of personal data require CNDP authorization unless destination ensures adequate protection (EU considered adequate) | VERIFIED | korte-law.com; upsilon-consulting.com. **Architecture impact:** prefer EU (e.g., France) hosting regions; CNDP formalities are the operator's responsibility — surface this in deployment docs, do not hardcode a legal conclusion in product code. |
| 5 | Vehicle compliance | NARSA-approved periodic technical inspection ("visite technique", VT) is mandatory; rental vehicles subject to stricter periodicity | PARTIALLY VERIFIED | VT regime itself VERIFIED (NARSA-agreed centers: SGS, Dekra, Norisko…). **Periodicity conflicts across secondary sources**: demarchesmaroc.com says rental cars every 6 months from first registration; expertvoiture.ma (2026) gives private-vehicle schedules (first VT at 4–5 yrs, then 2 yrs / 1 yr) and a different rental rule. Must be checked against primary NARSA/regulatory text before encoding any date math. |
| 6 | e-Signature | Damanesign is a DGSSI-agréé Qualified Trust Service Provider (law 43-20 framework); issues qualified e-signature certificates | VERIFIED | yabiladi.com (2025-03); start-up.ma (2025-06). Legal equivalence to handwritten signature applies to qualified signatures — **whether a rental contract requires that level is a legal question, currently UNVERIFIED.** |
| 7 | e-Signature | Barid eSign (Barid Al-Maghrib) is a state-agreed certification/e-signature provider since 2011 | VERIFIED | philatelie.ma (official Barid stamp description); corroborates §26 list. |
| 8 | Tax / invoicing | DGI (Direction Générale des Impôts) e-invoicing mandate: Art. 145 CGI IX + Loi de Finances 2024; phased clearance model — large IS (>200M MAD) Jan 2026, mid-size Jul 2026, **PME/TPE/auto-entrepreneurs (>500k MAD) Jan 2027**; structured format required (**UBL or CII**, PDF excluded); invoices validated via DGI platform before transmission | VERIFIED (outline) | Multiple consistent secondary sources: experio.ma, amde-tanger.ma, gestisuite.com, edicomgroup.com (retrieved 2026-08-24). Rental agencies are typically PME → Jan 2027 wave. **DGI primary technical spec not yet consulted** → format stays configurable; clearance integration only when specs stable. Research's "UBL 2.1 retained" is narrower than sources ("UBL or CII"). |
| 9 | Identity | CIN (Carte Nationale d'Identité Électronique), passport, and Moroccan driving license are the practical identity/driver documents; utility of each for KYC in rental | PARTIALLY VERIFIED | Document types are real and well known. Acceptance rules (which doc combinations are required for which customer type) are agency practice, not law — keep configurable, never hardcode. |
| 10 | Localization | Morocco timezone Africa/Casablanca shifts between UTC+1 and UTC+0 (around Ramadan) | PARTIALLY VERIFIED | Well-known tz behavior; must be handled by storing UTC and using IANA tz `Africa/Casablanca` for display/scheduling. Verify current-year transitions via tzdata at implementation time. |
| 11 | Telematics | Teltonika devices are commonly used/compatible with Moroccan fleet tracking | UNVERIFIED | Hardware availability plausible; no source yet. Adapter interface must not assume Teltonika specifics. |
| 12 | Comms | WhatsApp is the dominant business communication channel for Moroccan rental customers | UNVERIFIED | Commonly asserted; no source in repo. Treat as product hypothesis for discovery, not fact. |
| 13 | Fines | Moroccan traffic fines (radar/PV) can reach rental agencies as registered owners, with transfer of liability processes | UNVERIFIED | Process details (ANSR/PV télépédé detection, owner liability transfer) must be verified with primary sources before building the Fine → Customer charge workflow. |
| 14 | Market | Moroccan agencies commonly run hybrid paper/digital contracts and cash-heavy operations | PARTIALLY VERIFIED | Corroborated post-reconciliation by the research's cited agency CGVs and FLASCAM coverage of informal practices — still industry practice, not law. |
| 15 | Regulatory | Cahier des charges (Ministry of Transport, effective 2024-04-15, transition through end-2025): operators must be legal entities (SARL/SA); minimum capital 500,000 MAD; continuous minimum fleet 7 vehicles; vehicle age caps — ICE 5 yrs / hybrid 6 / EV 7 | PARTIALLY VERIFIED | Multiple consistent secondary sources cited by research (nexora-expertise.ma, lematin.ma, lebrief.ma). **Primary arrêté not consulted** → shipped as OFF-by-default configurable monitors labeled "verify with your accountant"; never hard blocks until primary confirmation (reconciliation G.2). |
| 16 | Data protection | CNDP forms are numbered F211 (declaration) / F112 (authorization) | UNVERIFIED | Research assertion; no CNDP source confirms the numbers. No form-generation feature until verified. |
| 17 | Data protection | Geolocating rental vehicles is lawful for asset protection; covert employee monitoring outside working hours is prohibited with penal sanctions | PARTIALLY VERIFIED | Law-firm source (avocat-jawhari.com) via research; consistent with Loi 09-08 logic. Verify precise conditions before GPS launch; consent block in contract covers the rental-period purpose. |
| 18 | Tax | CGI Article 145 mandates invoice mentions (ICE, IF, RC, etc.) | VERIFIED | Long-established; hisab.ma source via research. Exact mention list re-checked against CGI text at implementation. |
| 19 | Payments | CMI pre-authorization (PLBS) used for rental deposits (cautions) | PARTIALLY VERIFIED | CMI product line real (cmi.co.ma via research); bank/merchant integration details unverified. V1 integration gate. |
| 20 | Payments | Fatourati is a CMI/Maroc Telecommerce multi-channel bill-payment service (reference/QR payment of invoices); usable by agencies for payment links | VERIFIED (service) / creditor onboarding UNVERIFIED | ecoactu.ma, lebrief.ma (2026-04, Fatourati QR launch; 32 banks; 250M+ txns 2025). How a rental agency becomes an emitting creditor: unknown → `PaymentGateway` capability, V1, pending facts. |
| 21 | Fines | NARSA/ANSR operate an online infractions consultation/payment platform | PARTIALLY VERIFIED | maroctl.com via research (platform exists). Radar-fine PDF formats and any API: UNVERIFIED → fine matcher ships manual-assist first (G.7). |
| 22 | Telematics | Teltonika FMB003 (OBD) and FMB130 trackers exist and are integrable | VERIFIED | flespi device references via research. CAN-bus data availability across mixed Moroccan fleets: technically uncertain (V2 validation). |
| 23 | Insurance | Typical franchise range 5,000–30,000 MAD; Super CDW reduces to ~zero; exclusions commonly tires/glass/undercarriage | PARTIALLY VERIFIED (industry practice) | Multiple rental CGVs via research (iRent, Hertz, Avis, Highway). Values vary per agency → template data, not code. |
| 24 | Contracts | Driver age minimums 21/23 by category; driving license held ≥ 2 years | PARTIALLY VERIFIED (industry practice) | Agency CGVs via research; not law → configurable eligibility pack. |
| 25 | Cross-border | Ceuta/Melilla border restrictions and Tanger Med ferry; Admission Temporaire (AT) customs regime for vehicles | VERIFIED (framework) / rental prohibitions = practice | douane.gov.ma circulaire + conseil-douane.ma via research. Contract block + geofence design (V2 enforcement when telemetry live). |
| 26 | Market | EV/hybrid reached 17% of new passenger-vehicle sales in early 2026 | PARTIALLY VERIFIED | Single source (leguideauto.ma via research). Directionally plausible; EV pack stays V2. |
| 27 | Market | ~9,500 agencies / ~160,000 vehicles; severe fragmentation; informal practices | PARTIALLY VERIFIED | FLASCAM statements via press (lesecoauto, medias24). Market-sizing for business plan, not architecture. |
| 28 | Identity | Moroccan CIN (CNIE) carries a machine-readable zone (MRZ) usable for OCR capture | UNVERIFIED | Required before any MRZ/biometric feature; passports clearly have MRZ. On-device parsing could be offline-capable if confirmed. |
| 29 | Comms | WhatsApp is the primary channel; email open rates are low | UNVERIFIED (product hypothesis) | Universally asserted, incl. by research; no measurement yet. Channel strategy decision G.4. |
| 30 | AI/LLM | An LLM "fine-tuned exclusively on the agency's database" is the right copilot mechanism | REFUTED (as mechanism) | Fine-tuning is wrong tool for tabular operational Q&A: freshness, per-tenant isolation (CNDP), cost, provider lock-in. Research *intent* (reason only over this agency's data) preserved via per-tenant grounded RAG (ADR-0009). |

## Rules

1. Any PR that introduces a business rule backed by an external fact must reference a
   register entry (or add one) in its description.
2. Register entries never cite the missing research document as source.
3. Sources are recorded with retrieval dates; legal claims get re-checked before GA features ship.
