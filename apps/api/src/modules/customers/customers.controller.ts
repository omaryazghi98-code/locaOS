import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { and, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import { db, withTenant } from '../../db/client';
import { consentRecords, customerFlags, customers, identityDocuments } from '../../db/schema';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { audit } from '../audit/audit.service.js';
import { decryptField, encryptField, last4 } from '../crypto/crypto.js';
import { storage } from '../storage/storage.js';

const CustomerSchema = z.object({
  kind: z.enum(['INDIVIDUAL', 'COMPANY']).default('INDIVIDUAL'),
  segment: z.enum(['DOMESTIC', 'MRE', 'TOURIST', 'BUSINESS']).default('DOMESTIC'),
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
  companyName: z.string().max(120).optional(),
  phone: z.string().regex(/^\+\d{8,15}$/, 'Telephone E.164 requis (+212...)'),
  email: z.string().email().optional(),
  notes: z.string().max(1000).optional(),
});

const IdentityDocSchema = z.object({
  customerId: z.string().uuid(),
  type: z.enum(['CIN', 'PASSPORT', 'RESIDENCE_PERMIT', 'DRIVER_LICENSE']),
  number: z.string().min(3).max(40),
  issuerCountry: z.string().length(2).optional(),
  issueDate: z.string().date().nullable().optional(),
  expiryDate: z.string().date().nullable().optional(),
  frontObjectKey: z.string().optional(),
});

const FlagSchema = z.object({
  customerId: z.string().uuid(),
  kind: z.enum(['NO_SHOW', 'DAMAGE', 'UNPAID', 'OTHER']),
  severity: z.enum(['INFO', 'ATTENTION', 'CRITICAL']).default('ATTENTION'),
  note: z.string().max(500).optional(),
});

const ConsentSchema = z.object({
  customerId: z.string().uuid(),
  purpose: z.enum(['GPS_TRACKING', 'MARKETING', 'DATA_PROCESSING']),
  granted: z.boolean(),
  language: z.string().length(2).default('fr'),
});

@Controller('api/customers')
@UseGuards(AuthGuard, PermissionsGuard)
export class CustomersController {
  @Get()
  @RequirePermission('customers:read')
  async list(@Req() req: AuthedRequest) {
    const q = (req.query.q as string | undefined)?.trim();
    return withTenant(req.ctx!.agencyId, (tx) => {
      const base = and(eq(customers.agencyId, req.ctx!.agencyId), isNull(customers.deletedAt));
      const where = q
        ? and(base, or(ilike(customers.lastName, `%${q}%`), ilike(customers.firstName, `%${q}%`), ilike(customers.phone, `%${q}%`)))
        : base;
      return tx.select().from(customers).where(where).orderBy(desc(customers.createdAt)).limit(100);
    });
  }

  @Post()
  @RequirePermission('customers:write')
  async create(@Body(new ZodValidationPipe(CustomerSchema)) body: z.infer<typeof CustomerSchema>, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const inserted = await tx.insert(customers).values({
        agencyId: req.ctx!.agencyId, ...body,
      }).returning();
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'customer', entityId: inserted[0]!.id, action: 'CUSTOMER_CREATED', after: { name: `${body.firstName ?? ''} ${body.lastName ?? ''}`, phone: body.phone },
      });
      return inserted[0];
    });
  }

  @Get(':id')
  @RequirePermission('customers:read')
  async detail(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const c = await tx.select().from(customers)
        .where(and(eq(customers.id, id), eq(customers.agencyId, req.ctx!.agencyId))).limit(1);
      if (!c[0]) throw new NotFoundException('Client introuvable');
      const docs = await tx.select().from(identityDocuments).where(eq(identityDocuments.customerId, id));
      const flags = await tx.select().from(customerFlags).where(eq(customerFlags.customerId, id));
      const consents = await tx.select().from(consentRecords).where(eq(consentRecords.customerId, id));
      return {
        customer: c[0],
        identityDocuments: docs.map((d) => ({ ...d, numberMasked: `••••••${d.numberLast4}`, number: undefined, numberEncrypted: undefined })),
        flags, consents,
      };
    });
  }

  @Post(':id/identity-documents')
  @RequirePermission('customers:write')
  async addIdentityDoc(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(IdentityDocSchema)) body: z.infer<typeof IdentityDocSchema>, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const inserted = await tx.insert(identityDocuments).values({
        agencyId: req.ctx!.agencyId, customerId: id, type: body.type,
        numberEncrypted: encryptField(body.number), numberLast4: last4(body.number),
        issuerCountry: body.issuerCountry ?? null,
        issueDate: body.issueDate ?? null, expiryDate: body.expiryDate ?? null,
        frontObjectKey: body.frontObjectKey ?? null,
      }).returning();
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'identity_document', entityId: inserted[0]!.id, action: 'IDENTITY_DOC_ADDED',
        after: { type: body.type, last4: last4(body.number) },
      });
      return { ...inserted[0], numberEncrypted: undefined };
    });
  }

  /** Full number only for permissioned, audited unmasking (identity:unmask). */
  @Post('identity-documents/:docId/reveal')
  @RequirePermission('identity:unmask')
  async reveal(@Param('docId', ParseUUIDPipe) docId: string, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const d = await tx.select().from(identityDocuments)
        .where(and(eq(identityDocuments.id, docId), eq(identityDocuments.agencyId, req.ctx!.agencyId))).limit(1);
      if (!d[0]) throw new NotFoundException('Document introuvable');
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'identity_document', entityId: docId, action: 'IDENTITY_DOC_REVEALED', reason: (req.body as { reason?: string })?.reason ?? null,
      });
      return { id: docId, number: decryptField(d[0].numberEncrypted) };
    });
  }

  @Post(':id/flags')
  @RequirePermission('customer:flag:add')
  async addFlag(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(FlagSchema)) body: z.infer<typeof FlagSchema>, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const inserted = await tx.insert(customerFlags).values({
        agencyId: req.ctx!.agencyId, customerId: id, kind: body.kind, severity: body.severity,
        note: body.note ?? null, createdBy: req.ctx!.userId, approvedBy: req.ctx!.userId, // human-confirmed by construction
      }).returning();
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'customer_flag', entityId: inserted[0]!.id, action: 'CUSTOMER_FLAG_ADDED',
        after: body, reason: 'human confirmation (§14 — never automatic)',
      });
      return inserted[0];
    });
  }

  @Post(':id/consents')
  @RequirePermission('customers:write')
  async addConsent(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(ConsentSchema)) body: z.infer<typeof ConsentSchema>, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, (tx) => tx.insert(consentRecords).values({
      agencyId: req.ctx!.agencyId, customerId: id, purpose: body.purpose,
      granted: body.granted, language: body.language, capturedBy: req.ctx!.userId,
    }).returning());
  }
}
