import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { NaviService } from './navi.service.js';

const QueryBody = z.object({ query: z.string().trim().min(1).max(2000) });

@Controller('api/intelligence/navi')
@UseGuards(AuthGuard, PermissionsGuard)
export class NaviController {
  constructor(private readonly navi: NaviService) {}

  @Post('query')
  @RequirePermission('ops:read')
  async query(
    @Body(new ZodValidationPipe(QueryBody)) body: { query: string },
    @Req() req: AuthedRequest,
  ) {
    return this.navi.query(req.ctx!.agencyId, body.query);
  }
}
