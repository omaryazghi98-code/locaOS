import type { OcrField } from './document-intelligence.service.js';

export interface DriverLicenseCandidates {
  licenseNumber: Candidate;
  firstName: Candidate;
  lastName: Candidate;
  dateOfBirth: Candidate;
  issueDate: Candidate;
  expiryDate: Candidate;
  issuerCountry: Candidate;
}

export interface Candidate {
  value: string | null;
  confidence: number | null;
  sourceFieldKey: string | null;
}

const LABELS = {
  licenseNumber: /(?:permis|license|licence|n[°o]|number|num[eé]ro)\s*[:#-]?\s*([A-Z0-9][A-Z0-9 .-]{2,39})/i,
  firstName: /(?:pr[eé]nom|first\s*name)\s*[:#-]?\s*([A-ZÀ-Ÿ][A-ZÀ-Ÿ' -]{1,79})/i,
  lastName: /(?:nom|surname|last\s*name)\s*[:#-]?\s*([A-ZÀ-Ÿ][A-ZÀ-Ÿ' -]{1,79})/i,
  dob: /(?:date\s*(?:de\s*)?naissance|date\s*of\s*birth|birth)\s*[:#-]?\s*(\d{2}[./-]\d{2}[./-]\d{4}|\d{4}[./-]\d{2}[./-]\d{2})/i,
  issue: /(?:date\s*(?:de\s*)?d[eé]livrance|date\s*(?:of\s*)?issue|issued)\s*[:#-]?\s*(\d{2}[./-]\d{2}[./-]\d{4}|\d{4}[./-]\d{2}[./-]\d{2})/i,
  expiry: /(?:date\s*(?:d['’]?)?expiration|date\s*(?:of\s*)?expiry|expiry|expires)\s*[:#-]?\s*(\d{2}[./-]\d{2}[./-]\d{4}|\d{4}[./-]\d{2}[./-]\d{2})/i,
};

function candidate(value: string | null, confidence: number | null, sourceFieldKey: string | null): Candidate {
  return { value: value?.trim() || null, confidence, sourceFieldKey };
}

function fromLabel(fields: OcrField[], pattern: RegExp, group = 1): Candidate {
  for (const field of fields) {
    const value = field.value?.trim() ?? '';
    const match = value.match(pattern);
    if (match?.[group]) return candidate(match[group], field.confidence, field.key);
  }
  return candidate(null, null, null);
}

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const parts = value.replaceAll('/', '-').replaceAll('.', '-').split('-');
  if (parts.length !== 3) return null;
  if (parts[0]!.length === 4) return parts.join('-');
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function dateCandidate(fields: OcrField[], pattern: RegExp): Candidate {
  const c = fromLabel(fields, pattern);
  return candidate(normalizeDate(c.value), c.confidence, c.sourceFieldKey);
}

export function extractDriverLicenseCandidates(fields: OcrField[], rawText: string): DriverLicenseCandidates {
  const all = fields.length ? fields : rawText.split(/\r?\n/).map((value, i) => ({ key: `ocr.text.${i}`, value, confidence: null }));
  const issuer = all.find((f) => /\bMA\b|MAROC|MOROCCO|ROYAUME DU MAROC/i.test(f.value ?? ''));
  return {
    licenseNumber: fromLabel(all, LABELS.licenseNumber),
    firstName: fromLabel(all, LABELS.firstName),
    lastName: fromLabel(all, LABELS.lastName),
    dateOfBirth: dateCandidate(all, LABELS.dob),
    issueDate: dateCandidate(all, LABELS.issue),
    expiryDate: dateCandidate(all, LABELS.expiry),
    issuerCountry: candidate(issuer ? 'MA' : null, issuer?.confidence ?? null, issuer?.key ?? null),
  };
}

export function validateDriverLicenseCandidates(c: DriverLicenseCandidates) {
  const errors: string[] = [];
  if (!c.licenseNumber.value) errors.push('LICENSE_NUMBER_MISSING');
  if (!c.lastName.value) errors.push('LAST_NAME_MISSING');
  if (!c.firstName.value) errors.push('FIRST_NAME_MISSING');
  if (!c.dateOfBirth.value) errors.push('DATE_OF_BIRTH_MISSING');
  if (c.issueDate.value && c.expiryDate.value && c.issueDate.value > c.expiryDate.value) errors.push('DATE_RANGE_INVALID');
  return { valid: errors.length === 0, errors };
}
