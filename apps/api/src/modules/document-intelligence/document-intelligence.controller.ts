import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { DocumentIntelligenceService, type DocumentFamily } from './document-intelligence.service.js';

@Controller('api/document-intelligence')
@UseGuards(AuthGuard, PermissionsGuard)
export class DocumentIntelligenceController {
  constructor(private readonly service: DocumentIntelligenceService) {}

  @Get('intakes')
  @RequirePermission('agency:read')
  list(@Req() req: AuthedRequest) {
    return this.service.list(req.ctx!.agencyId);
  }

  @Get('intakes/:id')
  @RequirePermission('agency:read')
  get(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    return this.service.get(req.ctx!.agencyId, id);
  }

  @Post('intakes')
  @RequirePermission('customers:write')
  create(@Body() body: { documentId: string }, @Req() req: AuthedRequest) {
    return this.service.createIntake(req.ctx!.agencyId, body.documentId, req.ctx!.userId);
  }

  @Post('intakes/:id/classify')
  @RequirePermission('customers:write')
  classify(@Param('id', ParseUUIDPipe) id: string, @Body() body: { family: DocumentFamily }, @Req() req: AuthedRequest) {
    return this.service.classify(req.ctx!.agencyId, id, body.family, req.ctx!.userId);
  }

  @Post('intakes/:id/ocr')
  @RequirePermission('customers:write')
  runOcr(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    return this.service.runOcr(req.ctx!.agencyId, id, req.ctx!.userId);
  }
}
