# locaOS — Document Intelligence / Intake Architecture

**Status:** Architectural seam locked; implementation deferred.
**Decision date:** 2026-09-07

## 1. Purpose

locaOS needs a provider-agnostic document intake capability for operational documents. The goal is to turn captured documents into validated, auditable canonical records without making OCR or extraction technology part of the authoritative domain model.

This is an architectural capability, not a commitment to a specific OCR vendor.

## 2. Target flow

```text
Document / Camera Capture
        ↓
Document Intake
        ↓
Document Classification
        ↓
OCR Provider Adapter
   ├── first candidate: PaddleOCR
   ├── future cloud OCR provider
   └── future specialized provider
        ↓
Field Extraction
        ↓
Confidence / Quality Signals
        ↓
Validation
        ↓
Human Confirmation
        ↓
Canonical locaOS Record
        ↓
Encrypted Document Storage + Audit Trail
```

The authoritative record is created only after validation and the required human/domain confirmation. OCR output is evidence/input, not authoritative truth.

## 3. Candidate document families

The seam should eventually support, where legally and operationally appropriate:

- CIN / national identity documents
- passports
- driver's licences
- rental contracts and amendments
- vehicle registration documents
- insurance documents
- technical inspection documents
- invoices
- receipts
- damage / inspection paperwork
- supplier documents
- future government/regulatory documents where official access, legal basis, security requirements and technical documentation are verified

No government integration, document requirement, or legal interpretation should be inferred merely because a document type is technically parseable.

## 4. Architectural boundaries

### Document Intake
Responsible for receiving a file/image/camera capture, recording provenance and creating an intake job/reference. It should not directly mutate customer, vehicle, contract or financial truth.

### Classification
Determines the likely document family and version/layout where useful. Classification remains a signal until validated.

### OCR Provider Port
Defines the normalized interface for OCR engines. Providers return structured OCR evidence such as text, regions, page information, language/script signals and provider metadata.

### Extraction
Maps OCR evidence into a document-family-specific candidate schema. Extracted values must retain confidence/provenance where useful.

### Validation
Applies schema, formatting, consistency and domain validation. Validation may reject, flag, or request human review; it must not silently invent missing values.

### Human Confirmation
The user confirms or corrects extracted fields before canonical records are committed where the information is identity-, contract-, financial-, compliance-, or otherwise high-impact.

### Canonical Record Creation
Existing domain services remain authoritative. Document intelligence calls those services through explicit application/domain boundaries rather than writing directly into domain tables.

### Storage / Audit
Original evidence and derived artifacts must use the project's secure document-storage boundary. Audit history should preserve who/what/when, source document reference, extraction/provider metadata where relevant, validation result and confirmation/correction history.

## 5. Provider abstraction

Do **not** embed PaddleOCR inside the NestJS controllers or domain services.

Use the same adapter philosophy already used for external providers:

```text
locaOS document domain/application port
              ↓
       OCR provider adapter
              ↓
      PaddleOCR / future provider
```

PaddleOCR is the first candidate engine to evaluate because it can provide OCR/document parsing capabilities across many languages and document formats. It is a candidate dependency, not yet a committed production dependency.

## 6. Security and trust requirements

Documents can contain highly sensitive identity, contractual and financial information. The eventual implementation must preserve:

- tenant isolation
- server-side authorization
- encrypted/secure storage
- least-privilege access
- explicit provenance
- auditability
- retention/deletion policy
- protection against cross-tenant retrieval
- no silent overwrite of canonical records
- human confirmation for high-impact extracted data

The OCR provider must not become the system of record.

## 7. NAVI integration

NAVI should eventually be able to orchestrate document workflows without becoming the document authority.

Example:

```text
NAVI: "This driver's licence is missing from the reservation package."
        ↓
prepare intake workflow
        ↓
user captures document
        ↓
OCR / extraction / validation
        ↓
NAVI: "I found the name, licence number and expiry date. Please confirm."
        ↓
human confirmation
        ↓
domain service creates/updates canonical record
```

NAVI may summarize, retrieve, explain and prepare actions. It must not bypass authorization or silently promote OCR output into authoritative truth.

## 8. Deferred implementation scope

This document intentionally does **not** commit the immediate build order for OCR, storage infrastructure, document schemas, mobile capture, provider contracts, or government integrations.

Current priority remains the authoritative rental/settlement foundation and operational truth. Document Intelligence is a locked architectural seam for subsequent implementation so that identity, contracts, compliance and operational paperwork do not require a later retrofit.

## 9. Relationship to other architecture

Document Intelligence should connect to, but remain distinct from:

- customer identity/document handling
- contracts and document packages
- vehicle/compliance records
- finance evidence and receipts
- inspections/damage evidence
- secure document storage
- integrations/provider adapters
- NAVI operational memory

The principle is:

**capture → understand → validate → confirm → canonicalize → audit**

not:

**upload → OCR → directly mutate the database**.
