import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { DocumentIntelligenceService, type DocumentFamily } from './document-intelligence.service.js';

const CandidateSchema = z.object({ value: z.string().trim().nullable(), confidence: z.number().min(0).max(1).nullable(), sourceFieldKey: z.string().nullable() });
const DriverLicenseConfirmationSchema = z.object({
  customerId: z.string().uuid(),
  confirmed: z.object({
    licenseNumber: CandidateSchema,
    firstName: CandidateSchema,
    lastName: CandidateSchema,
    dateOfBirth: CandidateSchema,
    issueDate: CandidateSchema,
    expiryDate: CandidateSchema,
    issuerCountry: CandidateSchema,
  }),
});

@Controller('api/document-intelligence')
@UseGuards(AuthGuard, PermissionsGuard)
export class DocumentIntelligenceController {
  constructor(private readonly service: DocumentIntelligenceService) {}

  @Get('intakes')
  @RequirePermission('agency:read')
  list(@Req() req: AuthedRequest) { return this.service.list(req.ctx!.agencyId); }

  @Get('intakes/:id')
  @RequirePermission('agency:read')
  get(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) { return this.service.get(req.ctx!.agencyId, id); }

  @Post('intakes')
  @RequirePermission('customers:write')
  create(@Body(new ZodValidationPipe(z.object({ documentId: z.string().uuid() }))) body: { documentId: string }, @Req() req: AuthedRequest) {
    return this.service.createIntake(req.ctx!.agencyId, body.documentId, req.ctx!.userId);
  }

  @Post('intakes/:id/classify')
  @RequirePermission('customers:write')
  classify(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(z.object({ family: z.enum(['UNKNOWN','DRIVER_LICENSE','CIN','PASSPORT','RESIDENCE_PERMIT','VEHICLE_REGISTRATION','INSURANCE','TECHNICAL_INSPECTION','CONTRACT','INVOICE','RECEIPT','INSPECTION','OTHER']) }))) body: { family: DocumentFamily }, @Req() req: AuthedRequest) {
    return this.service.classify(req.ctx!.agencyId, id, body.family, req.ctx!.userId);
  }

  @Post('intakes/:id/ocr')
  @RequirePermission('customers:write')
  runOcr(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    return this.service.runOcr(req.ctx!.agencyId, id, req.ctx!.userId);
  }

  @Post('intakes/:id/driver-license/confirm')
  @RequirePermission('customers:write')
  confirmDriverLicense(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(DriverLicenseConfirmationSchema)) body: z.infer<typeof DriverLicenseConfirmationSchema>, @Req() req: AuthedRequest) {
    return this.service.confirmDriverLicense(req.ctx!.agencyId, id, body.customerId, body.confirmed, req.ctx!.userId);
  }
}
