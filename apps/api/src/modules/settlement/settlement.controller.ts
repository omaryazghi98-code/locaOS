import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { calculateSettlement, type SettlementLineKind } from '@locaos/domain';
import { withTenant } from '../../db/client.js';
import { ContractContent } from '@locaos/domain';
import { contracts, contractVersions, deposits, payments } from '../../db/schema.js';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';

@Controller('api/contracts')
@UseGuards(AuthGuard, PermissionsGuard)
export class SettlementController {
  @Get(':id/settlement')
  @RequirePermission('contracts:read')
  async preview(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const contract = (await tx.select().from(contracts)
        .where(and(eq(contracts.id, id), eq(contracts.agencyId, req.ctx!.agencyId))).limit(1))[0];
      if (!contract) throw new NotFoundException('Contrat introuvable');

      const version = (await tx.select().from(contractVersions)
        .where(eq(contractVersions.id, contract.currentVersionId!)).limit(1))[0];
      if (!version) throw new NotFoundException('Version du contrat introuvable');
      const content = ContractContent.parse(version.content);

      const deposit = contract.depositId
        ? (await tx.select().from(deposits).where(eq(deposits.id, contract.depositId)).limit(1))[0] ?? null
        : null;
      const paymentRows = await tx.select().from(payments)
        .where(and(eq(payments.contractId, id), eq(payments.agencyId, req.ctx!.agencyId)));

      const lines = content.pricing.lines.map((line) => ({
        code: line.code,
        label: line.label,
        kind: settlementKind(line.code),
        amount: parseMajorAmount(line.total ?? '0'),
      }));

      const settlement = calculateSettlement({
        currency: content.pricing.currency,
        lines,
        payments: paymentRows.map((payment) => ({
          id: payment.id,
          amount: payment.amount,
          direction: payment.direction,
          currency: payment.currency,
          settlementAmount: payment.currency === content.pricing.currency
            ? payment.amount
            : payment.madEquivalent ?? undefined,
          purpose: payment.purpose,
          reversesPaymentId: payment.reversesPaymentId,
        })),
        deposit: deposit ? {
          id: deposit.id,
          heldAmount: deposit.amount,
          chargedAmount: 0n,
        } : null,
      });

      return {
        contractId: id,
        status: contract.status,
        snapshotVersionId: version.id,
        settlement,
      };
    });
  }
}

function settlementKind(code: string): SettlementLineKind {
  const normalized = code.toUpperCase();
  const known: Record<string, SettlementLineKind> = {
    RENTAL: 'RENTAL', EXTENSION: 'EXTENSION', LATE_RETURN: 'LATE_RETURN',
    MILEAGE: 'MILEAGE', FUEL: 'FUEL', EXTRA: 'EXTRA', FEE: 'FEE',
    FINE: 'FINE', DAMAGE: 'DAMAGE', DISCOUNT: 'DISCOUNT',
  };
  return known[normalized] ?? 'OTHER';
}

/** Contract snapshots store human-readable major units; settlement uses integer minor units. */
function parseMajorAmount(value: string): bigint {
  const normalized = value.replace(/\s/gu, '').replace(',', '.');
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) throw new Error(`Invalid contract amount: ${value}`);
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction = ''] = unsigned.split('.');
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return negative ? -minor : minor;
}
