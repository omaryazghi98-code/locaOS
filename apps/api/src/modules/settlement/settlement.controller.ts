import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { ContractContent } from '@locaos/domain';
import { withTenant } from '../../db/client.js';
import { contracts, contractVersions } from '../../db/schema.js';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { assembleContractSettlement } from './settlement.service.js';

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
      if (!contract.currentVersionId) throw new NotFoundException('Version du contrat introuvable');

      const version = (await tx.select().from(contractVersions)
        .where(and(eq(contractVersions.id, contract.currentVersionId), eq(contractVersions.agencyId, req.ctx!.agencyId))).limit(1))[0];
      if (!version) throw new NotFoundException('Version du contrat introuvable');
      const content = ContractContent.parse(version.content);
      const assembled = await assembleContractSettlement(tx, req.ctx!.agencyId, contract, content);

      return {
        contractId: id,
        status: contract.status,
        snapshotVersionId: version.id,
        returnInspectionId: assembled.returnInspectionId,
        unresolvedDamageIds: assembled.unresolvedDamageIds,
        depositStatus: assembled.depositStatus,
        settlement: assembled.settlement,
      };
    });
  }
}
