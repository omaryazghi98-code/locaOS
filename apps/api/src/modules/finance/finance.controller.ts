import { and, desc, eq, inArray } from 'drizzle-orm';
import { Body, ConflictException, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { withTenant } from '../../db/client.js';
import { audit, appendEvent } from '../../db/audit.js';
import { contracts, deposits, inspections, vehicles } from '../../db/schema.js';
import { dispatchPendingSafe } from '../../events/outbox.js';

const ReleaseBody = z.object({ reason: z.string().trim().min(1).max(500) });
const ChargeBody = z.object({ amount: z.number().positive(), reason: z.string().trim().min(1).max(500) });

@Controller('api/finance')
@UseGuards(AuthGuard, PermissionsGuard)
export class FinanceController {
  @Get('deposits/:id')
  @RequirePermission('finance:read')
  async getDeposit(@Param('id') id: string, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const rows = await tx.select().from(deposits).where(and(eq(deposits.agencyId, req.ctx!.agencyId), eq(deposits.id, id))).limit(1);
      if (!rows[0]) throw new ConflictException({ error: { code: 'DEPOSIT_NOT_FOUND', message: 'Deposit not found' } });
      return rows[0];
    });
  }

  @Post('deposits/:id/release')
  @RequirePermission('finance:write')
  async releaseDeposit(@Param('id') id: string, @Body(new ZodValidationPipe(ReleaseBody)) body: { reason: string }, @Req() req: AuthedRequest) {
    const result = await withTenant(req.ctx!.agencyId, async (tx) => {
      const d = (await tx.select().from(deposits).where(and(eq(deposits.agencyId, req.ctx!.agencyId), eq(deposits.id, id))).limit(1))[0];
      if (!d) throw new ConflictException({ error: { code: 'DEPOSIT_NOT_FOUND', message: 'Deposit not found' } });
      if (d.status !== 'HELD') throw new ConflictException({ error: { code: 'DEPOSIT_NOT_HELD', message: 'Deposit is not held' } });
      const contract = (await tx.select().from(contracts).where(and(eq(contracts.agencyId, req.ctx!.agencyId), eq(contracts.id, d.contractId))).limit(1))[0];
      if (!contract) throw new ConflictException({ error: { code: 'CONTRACT_NOT_FOUND', message: 'Contract not found' } });
      const vehicle = (await tx.select().from(vehicles).where(and(eq(vehicles.agencyId, req.ctx!.agencyId), eq(vehicles.id, contract.vehicleId))).limit(1))[0];
      const ret = (await tx.select().from(inspections).where(and(
        eq(inspections.agencyId, req.ctx!.agencyId),
        eq(inspections.contractId, d.contractId),
        eq(inspections.kind, 'RETURN'),
      )).orderBy(desc(inspections.submittedAt)).limit(1))[0];
      if (!ret || !vehicle || ['RENTED', 'OVERDUE', 'AWAITING_INSPECTION'].includes(vehicle.operationalStatus)) {
        throw new ConflictException({
          error: { code: 'RETURN_INSPECTION_REQUIRED', message: 'Inspection retour terminée obligatoire avant libération de la caution', vehicleStatus: vehicle?.operationalStatus ?? null },
        });
      }

      const updated = await tx.update(deposits).set({
        status: 'RELEASED', releasedBy: req.ctx!.userId, releasedAt: new Date(), releaseReason: body.reason, updatedAt: new Date(),
      }).where(eq(deposits.id, id)).returning();
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'deposit', entityId: id, action: 'DEPOSIT_RELEASED',
        before: { status: d.status }, after: { status: 'RELEASED' }, reason: body.reason,
      });
      await appendEvent(tx, req.ctx!.agencyId, 'DepositReleased', {
        depositId: id, contractId: d.contractId, returnInspectionExists: true,
        reason: body.reason,
      });
      return { ...updated[0], returnInspectionId: ret.id, contractNumber: contract.number };
    });
    dispatchPendingSafe();
    return result;
  }

  @Post('deposits/:id/charge')
  @RequirePermission('finance:write')
  async chargeDeposit(@Param('id') id: string, @Body(new ZodValidationPipe(ChargeBody)) body: { amount: number; reason: string }, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const d = (await tx.select().from(deposits).where(and(eq(deposits.agencyId, req.ctx!.agencyId), eq(deposits.id, id))).limit(1))[0];
      if (!d) throw new ConflictException({ error: { code: 'DEPOSIT_NOT_FOUND', message: 'Deposit not found' } });
      if (d.status !== 'HELD') throw new ConflictException({ error: { code: 'DEPOSIT_NOT_HELD', message: 'Deposit is not held' } });
      if (body.amount > Number(d.amount)) throw new ConflictException({ error: { code: 'DEPOSIT_CHARGE_EXCEEDS_AMOUNT', message: 'Charge exceeds deposit amount' } });
      return { depositId: id, amount: body.amount, reason: body.reason };
    });
  }
}
