# AI Handoff — 2026-09-07 — Document Intelligence Driver Licence Slice

## Scope
The Document Intelligence architecture is now implemented as a bounded capability on top of the existing `documents` and `identity_documents` infrastructure.

## Implemented
- `document_intakes`, `document_extraction_runs`, and `document_extracted_fields` foundation already exists in migration `0012_document_intelligence.sql`.
- OCR is provider-port based; PaddleOCR remains outside NestJS behind `OCR_PROVIDER`.
- Driver-licence candidate extraction added in `driver-license.extractor.ts`.
- Candidate extraction is conservative and evidence-based: labelled fields are extracted where present; missing/ambiguous values remain null.
- Candidate validation checks required identity fields and date ordering. It does not invent or assert undocumented licence-number formats.
- OCR output remains evidence. It does not mutate canonical customer identity automatically.
- Added explicit human confirmation endpoint: `POST /api/document-intelligence/intakes/:id/driver-license/confirm`.
- Confirmation verifies tenant ownership and customer ownership, validates the confirmed values, encrypts the licence number, stores only last4 for normal display, attaches the source document, marks extracted fields confirmed, transitions intake to `CONFIRMED`, and audits the action.
- Intake detail now returns extraction fields for the review UI.

## Canonical identity boundary
Existing customer infrastructure stores identity documents with encrypted full numbers + `numberLast4`; full reveal is separately permissioned and audited. Document Intelligence follows that model instead of creating a parallel identity store.

## Important limitation
The extraction logic is a first vertical slice, not a government-grade Moroccan licence parser. Real licence samples must be used to improve layout/field recognition and validation rules before production use.

## Verification status
Not locally verified in this handoff. The user must pull the implementation branch and run migration/typecheck/tests locally. Do not claim CI/build green until verified.

## Next
1. Pull `codex/document-intelligence-driver-license-v2`.
2. Run existing DB migration workflow if `0012_document_intelligence.sql` has not yet been applied.
3. Typecheck/test the API.
4. Build the review UI against the new intake/confirmation endpoints.
5. Test with real Moroccan driver's-licence samples and tune extraction from evidence rather than hardcoding assumptions.
6. Then generalize the same pipeline to CIN/passport.
