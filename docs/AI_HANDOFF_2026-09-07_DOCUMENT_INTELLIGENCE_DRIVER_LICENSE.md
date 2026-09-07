# AI Handoff — 2026-09-07 — Document Intelligence Driver Licence Slice

## Scope
The Document Intelligence architecture is implemented as a bounded capability on top of the existing `documents` and `identity_documents` infrastructure.

## Implemented
- `document_intakes`, `document_extraction_runs`, and `document_extracted_fields` foundation exists in migration `0012_document_intelligence.sql`.
- OCR is provider-port based; PaddleOCR remains outside NestJS behind `OCR_PROVIDER`.
- Driver-licence candidate extraction exists in `driver-license.extractor.ts`.
- Candidate extraction is conservative and evidence-based: labelled fields are extracted where present; missing/ambiguous values remain null.
- Candidate validation checks required identity fields and date ordering. It does not invent or assert undocumented licence-number formats.
- OCR output remains evidence. It does not mutate canonical customer identity automatically.
- Human confirmation endpoint exists: `POST /api/document-intelligence/intakes/:id/driver-license/confirm`.
- Confirmation verifies tenant ownership and customer ownership, validates confirmed values, encrypts the licence number, stores only last4 for normal display, attaches the source document, marks extracted fields confirmed, transitions intake to `CONFIRMED`, and audits the action.
- Intake detail returns extraction runs and fields for review.
- Added web review queue at `/document-intelligence`.
- Added driver-licence review screen at `/document-intelligence/intakes/:id` with source-document preview, OCR confidence display, editable candidate fields, raw OCR inspection, classify/OCR actions, and explicit human confirmation.
- Review UI never writes customer first/last name from OCR; it only confirms the identity document into the existing identity domain.

## Canonical identity boundary
Existing customer infrastructure stores identity documents with encrypted full numbers + `numberLast4`; full reveal is separately permissioned and audited. Document Intelligence follows that model instead of creating a parallel identity store.

## Important limitations / follow-up hardening
- The extraction logic is a first vertical slice, not a government-grade Moroccan licence parser.
- Confirmation should gain duplicate/idempotency protection and be narrowed to the latest extraction run before production use.
- The current review page resolves the signed source-document URL through the existing document list endpoint; this is suitable for the first slice but can later be replaced by a dedicated signed source-document field on intake detail.
- Real Moroccan licence samples must be used to improve layout/field recognition, bilingual OCR behavior, and validation rules.

## Verification status
Code has been added on `codex/document-intelligence-driver-license-v2`, but local typecheck/build/runtime verification has not been performed from this environment. Do not claim CI/build green until verified locally.

## Next
1. Pull `codex/document-intelligence-driver-license-v2`.
2. Run `pnpm db:migrate` if migration `0012_document_intelligence.sql` has not yet been applied; do not reset the database.
3. Run API/web typecheck and existing test/build commands.
4. Create an intake for a real Moroccan driver's-licence document and exercise classify → OCR → review → confirmation.
5. Use the supplied Moroccan sample locally, never commit it to GitHub, and tune OCR/extraction from observed evidence.
6. Add duplicate/idempotency guards and latest-run confirmation semantics.
7. Then generalize the same pipeline to CIN/passport.
