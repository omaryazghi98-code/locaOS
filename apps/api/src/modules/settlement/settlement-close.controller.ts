import { ConflictException, Controller, ForbiddenException, NotFoundException, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { withTenant } from '../../db/client.js';
import { contracts, reservations, vehicles } from '../../db/schema.js';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { audit } from '../audit/audit.service.js';
import { appendEvent, dispatchPendingSafe } from '../events/events.js';
import { loadVersionContent, newVersion } from '../contracts/contracts.service.js';
import { assembleContractSettlement, SettlementAssemblyError } from './settlement.service.js';

/**
 * Temporary home for the hardened close route while the legacy ContractsController
 * is being decomposed. It is registered before ContractsController so Express/Nest
 * dispatches this identical route first; the legacy handler remains as dead code
 * until the controller refactor removes it.
 */
@Controller('api/contracts')
@UseGuards(AuthGuard, PermissionsGuard)
export class SettlementCloseController {
  @Post(':id/close')
  @RequirePermission('contracts:write')
  async close(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    const result = await withTenant(req.ctx!.agencyId, async (tx) => {
      const contract = (await tx.select().from(contracts)
        .where(and(eq(contracts.id, id), eq(contracts.agencyId, req.ctx!.agencyId)))
        .for('update').limit(1))[0];
      if (!contract) throw new NotFoundException('Contrat introuvable');
      if (contract.status !== 'ACTIVE' && contract.status !== 'AMENDED') throw new ForbiddenException('Contrat non actif');
      if (!contract.reservationId) throw new ConflictException({ error: { code: 'RETURN_FLOW_INCOMPLETE', message: 'Une réservation est requise pour clôturer le contrat' } });
      if (!contract.vehicleId) throw new ConflictException({ error: { code: 'RETURN_FLOW_INCOMPLETE', message: 'Un véhicule est requis pour clôturer le contrat' } });

      const reservation = (await tx.select().from(reservations)
        .where(and(eq(reservations.id, contract.reservationId), eq(reservations.agencyId, req.ctx!.agencyId))).limit(1))[0];
      if (!reservation) throw new NotFoundException('Réservation introuvable');
      if (reservation.vehicleId !== contract.vehicleId) {
        throw new ConflictException({ error: { code: 'RETURN_VEHICLE_MISMATCH', message: 'Le véhicule du contrat ne correspond plus à la réservation' } });
      }

      const vehicle = (await tx.select().from(vehicles)
        .where(and(eq(vehicles.id, contract.vehicleId), eq(vehicles.agencyId, req.ctx!.agencyId)))
        .for('update').limit(1))[0];
      if (!vehicle) throw new NotFoundException('Véhicule introuvable');
      if (['RENTED', 'OVERDUE', 'AWAITING_INSPECTION'].includes(vehicle.operationalStatus)) {
        throw new ConflictException({
          error: { code: 'RETURN_INSPECTION_INCOMPLETE', message: 'Inspection retour doit être terminée avant clôture', vehicleStatus: vehicle.operationalStatus },
        });
      }

      const content = await loadVersionContent(tx, id, contract.currentVersionId);
      const requiredDeposit = parseMajorAmount(content.deposit.amount);
      if (requiredDeposit > 0n && !contract.depositId) {
        throw new ConflictException({ error: { code: 'DEPOSIT_MISSING', message: 'Caution du contrat introuvable' } });
      }

      let assembled;
      try {
        assembled = await assembleContractSettlement(tx, req.ctx!.agencyId, contract, content);
      } catch (error) {
        if (error instanceof SettlementAssemblyError) {
          throw new ConflictException({ error: { code: 'SETTLEMENT_INCOMPLETE', message: error.message } });
        }
        throw error;
      }

      if (assembled.depositStatus && !['RELEASED', 'SETTLED'].includes(assembled.depositStatus)) {
        throw new ConflictException({
          error: { code: 'DEPOSIT_NOT_FINALIZED', message: 'La caution doit être libérée ou soldée avant clôture', depositStatus: assembled.depositStatus },
        });
      }
      if (assembled.unresolvedDamageIds.length > 0) {
        throw new ConflictException({
          error: {
            code: 'DAMAGE_NOT_RESOLVED',
            message: 'Des dommages découverts au retour ne sont pas encore résolus',
            damageIds: assembled.unresolvedDamageIds,
          },
        });
      }
      if (assembled.settlement.balanceDue > 0n) {
        throw new ConflictException({
          error: {
            code: 'CONTRACT_NOT_SETTLED',
            message: 'Le décompte final reste impayé avant clôture',
            balanceDue: assembled.settlement.balanceDue.toString(),
            currency: assembled.settlement.currency,
          },
        });
      }
      if (assembled.settlement.overpayment > 0n) {
        throw new ConflictException({
          error: {
            code: 'CUSTOMER_REFUND_REQUIRED',
            message: 'Un trop-perçu reste à rembourser avant clôture',
            overpayment: assembled.settlement.overpayment.toString(),
            currency: assembled.settlement.currency,
          },
        });
      }

      content.settlement = {
        capturedAt: new Date().toISOString(),
        currency: assembled.settlement.currency,
        charges: assembled.settlement.charges.toString(),
        discounts: assembled.settlement.discounts.toString(),
        grossTotal: assembled.settlement.grossTotal.toString(),
        incomingPayments: assembled.settlement.incomingPayments.toString(),
        outgoingPayments: assembled.settlement.outgoingPayments.toString(),
        netPayments: assembled.settlement.netPayments.toString(),
        depositHeld: assembled.settlement.depositHeld.toString(),
        depositApplied: assembled.settlement.depositApplied.toString(),
        depositRefund: assembled.settlement.depositRefund.toString(),
        paidAgainstCharges: assembled.settlement.paidAgainstCharges.toString(),
        balanceDue: assembled.settlement.balanceDue.toString(),
        overpayment: assembled.settlement.overpayment.toString(),
        customerRefund: assembled.settlement.customerRefund.toString(),
      };
      content.snapshot.returnInspectionId = assembled.returnInspectionId;
      content.references.returnInspectionId = assembled.returnInspectionId;
      await newVersion(tx, req.ctx!.agencyId, id, content, req.ctx!.userId);

      const updated = await tx.update(contracts).set({ status: 'CLOSED', updatedAt: new Date() })
        .where(and(eq(contracts.id, id), eq(contracts.agencyId, req.ctx!.agencyId))).returning();
      await tx.update(reservations).set({ status: 'COMPLETED', updatedAt: new Date() })
        .where(and(eq(reservations.id, reservation.id), eq(reservations.agencyId, req.ctx!.agencyId)));

      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'contract', entityId: id, action: 'CONTRACT_CLOSED',
        before: { status: contract.status },
        after: { status: 'CLOSED', vehicleStatus: vehicle.operationalStatus, settlement: content.settlement },
      });
      await appendEvent(tx, req.ctx!.agencyId, 'ContractClosed', {
        contractId: id, number: String(contract.number), reservationId: reservation.id,
        vehicleId: contract.vehicleId, vehicleStatus: vehicle.operationalStatus,
        returnInspectionId: assembled.returnInspectionId,
        settlementGrossTotal: assembled.settlement.grossTotal.toString(),
      });
      return updated[0];
    });
    dispatchPendingSafe();
    return result;
  }
}

function parseMajorAmount(value: string | null): bigint {
  if (value == null || !/^-?\d+(\.\d{1,2})?$/.test(value)) return 0n;
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ''] = unsigned.split('.');
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return negative ? -minor : minor;
}
