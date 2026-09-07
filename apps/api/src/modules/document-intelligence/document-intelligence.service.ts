import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { withTenant } from '../../db/client';
import { audit } from '../audit/audit.service.js';
import { documents, customers } from '../../db/schema';
import { encryptField, last4 } from '../crypto/crypto.js';
import { extractDriverLicenseCandidates, validateDriverLicenseCandidates, type DriverLicenseCandidates } from './driver-license.extractor.js';

export type DocumentFamily =
  | 'UNKNOWN' | 'DRIVER_LICENSE' | 'CIN' | 'PASSPORT' | 'RESIDENCE_PERMIT'
  | 'VEHICLE_REGISTRATION' | 'INSURANCE' | 'TECHNICAL_INSPECTION' | 'CONTRACT'
  | 'INVOICE' | 'RECEIPT' | 'INSPECTION' | 'OTHER';

export interface OcrInput { objectKey: string; mimeType: string; }
export interface OcrField { key: string; value: string | null; confidence: number | null; sourceRegion?: unknown; }
export interface OcrResult { provider: string; providerRunId?: string; rawText: string; fields: OcrField[]; metadata?: Record<string, unknown>; }
export interface OcrProvider { name: string; extract(input: OcrInput): Promise<OcrResult>; }

@Injectable()
export class DocumentIntelligenceService {
  constructor(@Inject('OCR_PROVIDER') private readonly ocr: OcrProvider) {}

  async createIntake(agencyId: string, documentId: string, userId: string) {
    return withTenant(agencyId, async (tx) => {
      const doc = await tx.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.agencyId, agencyId))).limit(1);
      if (!doc[0]) throw new NotFoundException('Document introuvable');
      const existing = await tx.execute(sql`select * from document_intakes where agency_id=${agencyId} and document_id=${documentId} limit 1`);
      if ((existing as unknown as { rows: unknown[] }).rows[0]) return (existing as unknown as { rows: unknown[] }).rows[0];
      const inserted = await tx.execute(sql`insert into document_intakes (agency_id, document_id, status, created_by) values (${agencyId}, ${documentId}, 'RECEIVED', ${userId}) returning *`);
      const intake = (inserted as unknown as { rows: unknown[] }).rows[0];
      await audit(tx, { agencyId, actor: { id: userId }, entityType: 'document_intake', entityId: String((intake as { id: string }).id), action: 'DOCUMENT_INTAKE_CREATED', after: { documentId, status: 'RECEIVED' } });
      return intake;
    });
  }

  async list(agencyId: string) {
    return withTenant(agencyId, async (tx) => {
      const result = await tx.execute(sql`select di.*, d.kind as source_document_kind, d.entity_type, d.entity_id from document_intakes di join documents d on d.id=di.document_id where di.agency_id=${agencyId} order by di.created_at desc limit 100`);
      return (result as unknown as { rows: unknown[] }).rows;
    });
  }

  async get(agencyId: string, id: string) {
    return withTenant(agencyId, async (tx) => {
      const result = await tx.execute(sql`select di.*, d.kind as source_document_kind, d.entity_type, d.entity_id from document_intakes di join documents d on d.id=di.document_id where di.agency_id=${agencyId} and di.id=${id} limit 1`);
      const intake = (result as unknown as { rows: unknown[] }).rows[0] as { id: string } | undefined;
      if (!intake) throw new NotFoundException('Intake documentaire introuvable');
      const runs = await tx.execute(sql`select * from document_extraction_runs where agency_id=${agencyId} and intake_id=${id} order by created_at desc`);
      const fields = await tx.execute(sql`select * from document_extracted_fields where agency_id=${agencyId} and extraction_run_id in (select id from document_extraction_runs where agency_id=${agencyId} and intake_id=${id}) order by created_at, field_key`);
      return { intake, runs: (runs as unknown as { rows: unknown[] }).rows, fields: (fields as unknown as { rows: unknown[] }).rows };
    });
  }

  async classify(agencyId: string, id: string, family: DocumentFamily, userId: string) {
    return withTenant(agencyId, async (tx) => {
      const result = await tx.execute(sql`update document_intakes set document_family=${family}, status='CLASSIFIED', updated_at=now() where agency_id=${agencyId} and id=${id} returning *`);
      const row = (result as unknown as { rows: unknown[] }).rows[0];
      if (!row) throw new NotFoundException('Intake documentaire introuvable');
      await audit(tx, { agencyId, actor: { id: userId }, entityType: 'document_intake', entityId: id, action: 'DOCUMENT_CLASSIFIED', after: { family } });
      return row;
    });
  }

  async runOcr(agencyId: string, id: string, userId: string) {
    return withTenant(agencyId, async (tx) => {
      const result = await tx.execute(sql`select di.*, d.object_key, d.mime_type from document_intakes di join documents d on d.id=di.document_id where di.agency_id=${agencyId} and di.id=${id} limit 1`);
      const intake = (result as unknown as { rows: Array<{ id: string; object_key: string; mime_type: string; document_family: DocumentFamily }> }).rows[0];
      if (!intake) throw new NotFoundException('Intake documentaire introuvable');
      const run = await tx.execute(sql`insert into document_extraction_runs (agency_id,intake_id,provider,status) values (${agencyId},${id},${this.ocr.name},'STARTED') returning id`);
      const runId = (run as unknown as { rows: Array<{ id: string }> }).rows[0]!.id;
      await tx.execute(sql`update document_intakes set status='OCR_PENDING', provider=${this.ocr.name}, updated_at=now() where id=${id} and agency_id=${agencyId}`);
      try {
        const output = await this.ocr.extract({ objectKey: intake.object_key, mimeType: intake.mime_type });
        await tx.execute(sql`update document_extraction_runs set status='SUCCEEDED', provider_run_id=${output.providerRunId ?? null}, raw_text=${output.rawText}, provider_metadata=${JSON.stringify(output.metadata ?? {})}::jsonb, completed_at=now() where id=${runId} and agency_id=${agencyId}`);
        for (const field of output.fields) {
          await tx.execute(sql`insert into document_extracted_fields (agency_id,extraction_run_id,field_key,value_text,confidence,source_region) values (${agencyId},${runId},${field.key},${field.value},${field.confidence},${JSON.stringify(field.sourceRegion ?? null)}::jsonb)`);
        }
        if (intake.document_family === 'DRIVER_LICENSE') {
          const candidates = extractDriverLicenseCandidates(output.fields, output.rawText);
          const validation = validateDriverLicenseCandidates(candidates);
          for (const [key, value] of Object.entries(candidates)) {
            const c = value as { value: string | null; confidence: number | null; sourceFieldKey: string | null };
            await tx.execute(sql`insert into document_extracted_fields (agency_id,extraction_run_id,field_key,value_text,confidence,source_region) values (${agencyId},${runId},${'driver_license.' + key},${c.value},${c.confidence},${JSON.stringify({ sourceFieldKey: c.sourceFieldKey })}::jsonb)`);
          }
          await tx.execute(sql`update document_intakes set status=${validation.valid ? 'READY_FOR_CONFIRMATION' : 'VALIDATION_REQUIRED'}, updated_at=now() where id=${id} and agency_id=${agencyId}`);
          await audit(tx, { agencyId, actor: { id: userId }, entityType: 'document_intake', entityId: id, action: 'DRIVER_LICENSE_EXTRACTED', after: { provider: output.provider, extractionRunId: runId, valid: validation.valid, errors: validation.errors } });
          return { extractionRunId: runId, ...output, driverLicense: candidates, validation };
        }
        await tx.execute(sql`update document_intakes set status='READY_FOR_CONFIRMATION', updated_at=now() where id=${id} and agency_id=${agencyId}`);
        await audit(tx, { agencyId, actor: { id: userId }, entityType: 'document_intake', entityId: id, action: 'DOCUMENT_OCR_COMPLETED', after: { provider: output.provider, extractionRunId: runId, fieldCount: output.fields.length } });
        return { extractionRunId: runId, ...output };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await tx.execute(sql`update document_extraction_runs set status='FAILED', error_message=${message}, completed_at=now() where id=${runId} and agency_id=${agencyId}`);
        await tx.execute(sql`update document_intakes set status='FAILED', updated_at=now() where id=${id} and agency_id=${agencyId}`);
        throw error;
      }
    });
  }

  async confirmDriverLicense(agencyId: string, intakeId: string, customerId: string, confirmed: DriverLicenseCandidates, userId: string) {
    return withTenant(agencyId, async (tx) => {
      const intakeResult = await tx.execute(sql`select di.*, d.id as document_id, d.object_key from document_intakes di join documents d on d.id=di.document_id where di.agency_id=${agencyId} and di.id=${intakeId} limit 1`);
      const intake = (intakeResult as unknown as { rows: Array<{ document_family: DocumentFamily; status: string; document_id: string }> }).rows[0];
      if (!intake) throw new NotFoundException('Intake documentaire introuvable');
      if (intake.document_family !== 'DRIVER_LICENSE') throw new BadRequestException('DOCUMENT_NOT_DRIVER_LICENSE');
      if (!['READY_FOR_CONFIRMATION', 'VALIDATION_REQUIRED'].includes(intake.status)) throw new BadRequestException('DOCUMENT_NOT_READY_FOR_CONFIRMATION');

      const customer = await tx.select().from(customers).where(and(eq(customers.id, customerId), eq(customers.agencyId, agencyId))).limit(1);
      if (!customer[0]) throw new NotFoundException('Client introuvable');
      const validation = validateDriverLicenseCandidates(confirmed);
      if (!validation.valid) throw new BadRequestException({ code: 'DRIVER_LICENSE_VALIDATION_FAILED', errors: validation.errors });
      if (!confirmed.licenseNumber.value) throw new BadRequestException('LICENSE_NUMBER_REQUIRED');

      const inserted = await tx.execute(sql`
        insert into identity_documents (agency_id, customer_id, type, number_encrypted, number_last4, issuer_country, issue_date, expiry_date, front_object_key)
        values (${agencyId}, ${customerId}, 'DRIVER_LICENSE', ${encryptField(confirmed.licenseNumber.value)}, ${last4(confirmed.licenseNumber.value)}, ${confirmed.issuerCountry.value}, ${confirmed.issueDate.value}, ${confirmed.expiryDate.value}, (select object_key from documents where id=${intake.document_id} and agency_id=${agencyId}))
        returning id, customer_id, type, number_last4, issuer_country, issue_date, expiry_date, front_object_key, created_at, updated_at`);
      const identity = (inserted as unknown as { rows: unknown[] }).rows[0];
      if (!identity) throw new BadRequestException('IDENTITY_DOCUMENT_CREATE_FAILED');

      await tx.execute(sql`update document_intakes set status='CONFIRMED', updated_at=now() where agency_id=${agencyId} and id=${intakeId}`);
      await tx.execute(sql`update document_extracted_fields set validation_status='CONFIRMED', confirmed_value=case field_key when 'driver_license.licenseNumber' then ${confirmed.licenseNumber.value} when 'driver_license.firstName' then ${confirmed.firstName.value} when 'driver_license.lastName' then ${confirmed.lastName.value} when 'driver_license.dateOfBirth' then ${confirmed.dateOfBirth.value} when 'driver_license.issueDate' then ${confirmed.issueDate.value} when 'driver_license.expiryDate' then ${confirmed.expiryDate.value} when 'driver_license.issuerCountry' then ${confirmed.issuerCountry.value} else confirmed_value end, confirmed_by=${userId}, confirmed_at=now() where agency_id=${agencyId} and extraction_run_id in (select id from document_extraction_runs where agency_id=${agencyId} and intake_id=${intakeId})`);
      await audit(tx, { agencyId, actor: { id: userId }, entityType: 'document_intake', entityId: intakeId, action: 'DRIVER_LICENSE_CONFIRMED', after: { customerId, identityDocumentId: (identity as { id: string }).id, type: 'DRIVER_LICENSE' }, reason: 'human confirmation of extracted identity data' });
      return { intakeId, identityDocument: identity };
    });
  }
}
