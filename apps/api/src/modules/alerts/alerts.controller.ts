import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Post, Req, Query, UseGuards } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { withTenant } from '../../db/client';
import { alertRules, alerts } from '../../db/schema';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { audit } from '../audit/audit.service.js';

@Controller('api/alerts')
@UseGuards(AuthGuard, PermissionsGuard)
export class AlertsController {
  @Get()
  @RequirePermission('alerts:read')
  async list(@Query('status') status: string | undefined, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, (tx) => {
      const conds = [eq(alerts.agencyId, req.ctx!.agencyId)];
      if (status) conds.push(inArray(alerts.status, status.split(',') as never));
      return tx.select().from(alerts).where(and(...conds))
        .orderBy(sql`case ${alerts.severity} when 'CRITICAL' then 1 when 'HIGH' then 2 when 'ATTENTION' then 3 else 4 end`, desc(alerts.createdAt))
        .limit(200);
    });
  }

  @Get('rules')
  @RequirePermission('alerts:read')
  async rules(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, (tx) => tx.select().from(alertRules)
      .where(eq(alertRules.agencyId, req.ctx!.agencyId)).orderBy(alertRules.key));
  }

  /** Enable/disable a rule (compliance monitors stay OFF until the agency opts in — G.2). */
  @Post('rules/:key/toggle')
  @RequirePermission('alerts:resolve')
  async toggle(@Param('key') key: string, @Body(new ZodValidationPipe(z.object({ enabled: z.boolean() }))) body: { enabled: boolean }, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const updated = await tx.update(alertRules).set({ enabled: body.enabled })
        .where(and(eq(alertRules.agencyId, req.ctx!.agencyId), eq(alertRules.key, key))).returning();
      if (!updated[0]) throw new ForbiddenException('Règle introuvable');
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'alert_rule', entityId: key, action: 'ALERT_RULE_TOGGLED',
        before: { enabled: !body.enabled }, after: { enabled: body.enabled },
      });
      return updated[0];
    });
  }

  @Post(':id/ack')
  @RequirePermission('alerts:resolve')
  async ack(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const updated = await tx.update(alerts).set({
        status: 'ACKNOWLEDGED', acknowledgedBy: req.ctx!.userId, acknowledgedAt: new Date(), updatedAt: new Date(),
      }).where(and(eq(alerts.id, id), eq(alerts.agencyId, req.ctx!.agencyId))).returning();
      if (!updated[0]) throw new ForbiddenException('Alerte introuvable');
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'alert', entityId: id, action: 'ALERT_ACKNOWLEDGED',
      });
      return updated[0];
    });
  }

  @Post(':id/resolve')
  @RequirePermission('alerts:resolve')
  async resolve(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(z.object({ note: z.string().min(3).max(500) }))) body: { note: string }, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const updated = await tx.update(alerts).set({
        status: 'RESOLVED', resolvedBy: req.ctx!.userId, resolvedAt: new Date(),
        resolutionNote: body.note, updatedAt: new Date(),
      }).where(and(eq(alerts.id, id), eq(alerts.agencyId, req.ctx!.agencyId))).returning();
      if (!updated[0]) throw new ForbiddenException('Alerte introuvable');
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'alert', entityId: id, action: 'ALERT_RESOLVED', reason: body.note,
      });
      return updated[0];
    });
  }
}
