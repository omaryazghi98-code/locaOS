import { Body, ConflictException, Controller, ForbiddenException, BadRequestException, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req, Query, UseGuards } from '@nestjs/common';
import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { toMadEquivalent } from '@locaos/domain';
import { withTenant } from '../../db/client';
import { cashSessions, contracts, customers, deposits, depositCharges, inspections, payments, reservations, vehicles } from '../../db/schema';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { audit } from '../audit/audit.service.js';
import { appendEvent, dispatchPending, dispatchPendingSafe } from '../events/events.js';

const PaymentSchema = z.object({
  direction: z.enum(['IN', 'OUT']).default('IN'),
  method: z.enum(['CASH', 'CARD', 'TRANSFER', 'DEPOSIT_CASH']),
  purpose: z.enum(['RENTAL', 'DEPOSIT', 'DAMAGE', 'FUEL', 'FINE', 'OTHER']).optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Montant (ex: 1500 ou 1500.50)'),
  currency: z.enum(['MAD', 'EUR', 'USD']).default('MAD'),
  fxRate: z.number().positive().optional(),
  contractId: z.string().uuid().optional(),
  reservationId: z.string().uuid().optional(),
  note: z.string().max(300).optional(),
});

const RefundSchema = PaymentSchema.omit({ method: true, direction: true }).extend({
  reversesPaymentId: z.string().uuid(),
});

const DepositSchema = z.object({
  contractId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  method: z.enum(['CASH_HELD', 'CARD_PREAUTH', 'BANK']),
  providerRef: z.string().max(80).optional(),
  preauthExpiresAt: z.string().datetime().optional(),
});

const DepositChargeSchema = z.object({
  depositId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  reason: z.string().min(3).max(300),
  damageId: z.string().uuid().optional(),
});

const CloseSessionSchema = z.object({
  counted: z.record(z.string(), z.record(z.string(), z.number())),
  fxRates: z.record(z.string(), z.number()).default({}),
  varianceExplanation: z.string().max(300).optional(),
});

const cents = (s: string) => BigInt(Math.round(Number(s) * 100));

@Controller('api/finance')
@UseGuards(AuthGuard, PermissionsGuard)
export class FinanceController {
  @Get('payments')
  @RequirePermission('finance:read')
  async paymentsList(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, (tx) => tx.select().from(payments)
      .where(eq(payments.agencyId, req.ctx!.agencyId))
      .orderBy(desc(payments.receivedAt)).limit(200));
  }

  @Post('payments')
  @RequirePermission('payments:write')
  async createPayment(@Body(new ZodValidationPipe(PaymentSchema)) body: z.infer<typeof PaymentSchema>, @Req() req: AuthedRequest) {
    const result = await withTenant(req.ctx!.agencyId, async (tx) => {
      const amount = cents(body.amount);
      let madEquivalent: bigint | null = null;
      let fxRate: string | null = null;
      if (body.currency !== 'MAD') {
        if (!body.fxRate) throw new BadRequestException('Taux de change requis (taux humain confirmé du jour)');
        madEquivalent = toMadEquivalent(amount, body.fxRate);
        fxRate = String(body.fxRate);
      }
      if (body.contractId) {
        const c = await tx.select({ status: contracts.status }).from(contracts)
          .where(and(eq(contracts.id, body.contractId), eq(contracts.agencyId, req.ctx!.agencyId))).limit(1);
        if (!c[0]) throw new NotFoundException('Contrat introuvable');
        if (['BLANK_ISSUED', 'VOIDED'].includes(c[0].status)) {
          throw new BadRequestException(`Paiement refusé: contrat ${c[0].status} — un contrat vierge/annulé ne peut pas porter d’écriture financière`);
        }
      }
      let cashSessionId: string | null = null;
      if (body.method === 'CASH' || body.method === 'DEPOSIT_CASH') {
        const open = await tx.select().from(cashSessions)
          .where(and(eq(cashSessions.agencyId, req.ctx!.agencyId), eq(cashSessions.status, 'OPEN'))).orderBy(desc(cashSessions.openedAt)).limit(1);
        cashSessionId = open[0]?.id ?? null;
      }
      const inserted = await tx.insert(payments).values({
        agencyId: req.ctx!.agencyId, direction: body.direction, method: body.method,
        purpose: body.purpose ?? null, amount, currency: body.currency,
        fxRate, madEquivalent, contractId: body.contractId ?? null,
        reservationId: body.reservationId ?? null, receivedBy: req.ctx!.userId,
        note: body.note ?? null, cashSessionId,
      }).returning();
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'payment', entityId: inserted[0]!.id, action: 'PAYMENT_RECORDED',
        after: { amount: body.amount, currency: body.currency, method: body.method },
      });
      const allocated = Boolean(body.contractId || body.reservationId);
      await appendEvent(tx, req.ctx!.agencyId, 'PaymentRecorded', {
        paymentId: inserted[0]!.id, method: body.method, amount: amount.toString(),
        currency: body.currency, contractId: body.contractId ?? null, allocated,
      });
      return inserted[0];
    });
    dispatchPendingSafe();
    return result;
  }

  @Post('refunds')
  @RequirePermission('payments:reversal')
  async refund(@Body(new ZodValidationPipe(RefundSchema)) body: z.infer<typeof RefundSchema>, @Req() req: AuthedRequest) {
    const result = await withTenant(req.ctx!.agencyId, async (tx) => {
      const original = await tx.select().from(payments)
        .where(and(eq(payments.id, body.reversesPaymentId), eq(payments.agencyId, req.ctx!.agencyId))).limit(1);
      if (!original[0]) throw new NotFoundException('Paiement original introuvable');
      const alreadyRefunded = await tx.select({ sum: sql<string>`coalesce(sum(amount), 0)` }).from(payments)
        .where(eq(payments.reversesPaymentId, original[0].id));
      if (cents(body.amount) + BigInt(alreadyRefunded[0]?.sum ?? '0') > original[0].amount) {
        throw new BadRequestException('Remboursement supérieur au paiement original (déjà remboursé: ' + String(alreadyRefunded[0]?.sum) + ' centimes)');
      }
      const amount = cents(body.amount);
      let madEquivalent: bigint | null = null;
      let fxRate: string | null = null;
      if (body.currency !== 'MAD') {
        if (!body.fxRate) throw new BadRequestException('Taux de change requis');
        madEquivalent = toMadEquivalent(amount, body.fxRate);
        fxRate = String(body.fxRate);
      }
      const inserted = await tx.insert(payments).values({
        agencyId: req.ctx!.agencyId, direction: 'OUT', method: 'REFUND',
        purpose: body.purpose ?? null, amount, currency: body.currency, fxRate, madEquivalent,
        contractId: original[0].contractId, reversesPaymentId: original[0].id,
        receivedBy: req.ctx!.userId, note: body.note ?? null,
      }).returning();
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'payment', entityId: inserted[0]!.id, action: 'REFUND_ISSUED',
        after: { reverses: original[0].id, amount: body.amount },
      });
      await appendEvent(tx, req.ctx!.agencyId, 'RefundIssued', {
        paymentId: inserted[0]!.id, reversesPaymentId: original[0].id,
        amount: amount.toString(), approvedBy: req.ctx!.userId,
      });
      return inserted[0];
    });
    dispatchPendingSafe();
    return result;
  }

  @Post('deposits')
  @RequirePermission('deposits:write')
  async createDeposit(@Body(new ZodValidationPipe(DepositSchema)) body: z.infer<typeof DepositSchema>, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const locked = await tx.execute(sql`select id from contracts where id = ${body.contractId} and agency_id = ${req.ctx!.agencyId} for update`);
      if (!locked.rows.length) throw new NotFoundException('Contrat introuvable');

      const existing = await tx.select().from(deposits)
        .where(and(eq(deposits.contractId, body.contractId), inArray(deposits.status, ['PLANNED', 'HELD', 'PRE_AUTHORIZED', 'PARTIALLY_CHARGED'])))
        .limit(1);
      if (existing[0]) {
        throw new ConflictException({
          error: { code: 'DEPOSIT_ALREADY_SECURED', message: 'Une caution active existe déjà pour ce contrat', depositId: existing[0].id },
        });
      }

      const inserted = await tx.insert(deposits).values({
        agencyId: req.ctx!.agencyId, contractId: body.contractId, amount: cents(body.amount),
        method: body.method, provider: body.method === 'CARD_PREAUTH' ? 'CMI_PLBS (saisie manuelle)' : null,
        providerRef: body.providerRef ?? null,
        preauthExpiresAt: body.preauthExpiresAt ? new Date(body.preauthExpiresAt) : null,
        status: body.method === 'CARD_PREAUTH' ? 'PRE_AUTHORIZED' : 'PLANNED',
        heldBy: req.ctx!.userId,
      }).returning();
      if (body.method !== 'CARD_PREAUTH') {
        await tx.update(deposits).set({ status: 'HELD' }).where(eq(deposits.id, inserted[0]!.id));
      }
      await tx.update(contracts).set({ depositId: inserted[0]!.id, updatedAt: new Date() }).where(eq(contracts.id, body.contractId));
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'deposit', entityId: inserted[0]!.id, action: 'DEPOSIT_CREATED',
        after: { amount: body.amount, method: body.method },
      });
      return { ...inserted[0], status: body.method === 'CARD_PREAUTH' ? 'PRE_AUTHORIZED' : 'HELD' };
    });
  }

  @Post('deposits/:id/release')
  @RequirePermission('deposit:release')
  async release(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(z.object({ reason: z.string().min(3).max(300) }))) body: { reason: string }, @Req() req: AuthedRequest) {
    const result = await withTenant(req.ctx!.agencyId, async (tx) => {
      const rows = await tx.select().from(deposits)
        .where(and(eq(deposits.id, id), eq(deposits.agencyId, req.ctx!.agencyId))).limit(1);
      if (!rows[0]) throw new NotFoundException('Caution introuvable');
      const d = rows[0];
      if (!['HELD', 'PRE_AUTHORIZED', 'PARTIALLY_CHARGED'].includes(d.status)) throw new ForbiddenException('Statut non libérable');
      const contract = await tx.select().from(contracts).where(eq(contracts.id, d.contractId)).limit(1);
      const ret = await tx.select().from(inspections)
        .where(and(eq(inspections.contractId, d.contractId), eq(inspections.kind, 'RETURN'))).limit(1);
      const returnInspectionExists = Boolean(ret[0]);
      const updated = await tx.update(deposits).set({
        status: 'RELEASED', releasedBy: req.ctx!.userId, releasedAt: new Date(), releaseReason: body.reason, updatedAt: new Date(),
      }).where(eq(deposits.id, id)).returning();
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'deposit', entityId: id, action: 'DEPOSIT_RELEASED',
        before: { status: d.status }, after: { status: 'RELEASED' }, reason: body.reason,
      });
      await appendEvent(tx, req.ctx!.agencyId, 'DepositReleased', {
        depositId: id, contractId: d.contractId, returnInspectionExists,
        reason: body.reason,
      });
      return { ...updated[0], returnInspectionExists, contractNumber: contract[0]?.number };
    });
    dispatchPendingSafe();
    return result;
  }

  @Post('deposits/:id/charge')
  @RequirePermission('deposit:charge')
  async charge(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(DepositChargeSchema)) body: z.infer<typeof DepositChargeSchema>, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const rows = await tx.select().from(deposits)
        .where(and(eq(deposits.id, id), eq(deposits.agencyId, req.ctx!.agencyId))).limit(1);
      const d = rows[0];
      if (!d) throw new NotFoundException('Caution introuvable');
      if (!['HELD', 'PRE_AUTHORIZED', 'PARTIALLY_CHARGED'].includes(d.status)) throw new ForbiddenException('Caution non disponible');
      const amount = cents(body.amount);
      const paid = await tx.insert(payments).values({
        agencyId: req.ctx!.agencyId, direction: 'IN', method: 'CARD', purpose: 'DAMAGE',
        amount, currency: 'MAD', madEquivalent: amount, depositId: id, contractId: d.contractId,
        receivedBy: req.ctx!.userId, note: body.reason,
      }).returning();
      const charge = await tx.insert(depositCharges).values({
        agencyId: req.ctx!.agencyId, depositId: id, amount, reason: body.reason,
        damageId: body.damageId ?? null, approvedBy: req.ctx!.userId, paymentId: paid[0]!.id,
      }).returning();
      const totalCharged = await tx.select({ sum: sql<string>`coalesce(sum(amount),0)` }).from(depositCharges).where(eq(depositCharges.depositId, id));
      const charged = BigInt(totalCharged[0]?.sum ?? '0');
      const newStatus = charged >= d.amount ? 'SETTLED' : 'PARTIALLY_CHARGED';
      await tx.update(deposits).set({ status: newStatus, updatedAt: new Date() }).where(eq(deposits.id, id));
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'deposit', entityId: id, action: 'DEPOSIT_CHARGED',
        after: { amount: body.amount, reason: body.reason },
      });
      return { charge: charge[0], payment: paid[0], depositStatus: newStatus };
    });
  }

  @Post('cash-sessions/open')
  @RequirePermission('cash:manage')
  async openSession(@Body(new ZodValidationPipe(z.object({ branchId: z.string().uuid(), openingBalance: z.string().default('0') }))) body: { branchId: string; openingBalance: string }, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const existing = await tx.select().from(cashSessions)
        .where(and(eq(cashSessions.agencyId, req.ctx!.agencyId), eq(cashSessions.status, 'OPEN'))).limit(1);
      if (existing[0]) throw new BadRequestException('Une session de caisse est déjà ouverte');
      const inserted = await tx.insert(cashSessions).values({
        agencyId: req.ctx!.agencyId, branchId: body.branchId, openedBy: req.ctx!.userId,
        openingBalance: cents(body.openingBalance),
      }).returning();
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'cash_session', entityId: inserted[0]!.id, action: 'CASH_SESSION_OPENED',
        after: { openingBalance: body.openingBalance },
      });
      return inserted[0];
    });
  }

  @Get('cash-sessions/current')
  @RequirePermission('cash:manage')
  async currentSession(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const open = await tx.select().from(cashSessions)
        .where(and(eq(cashSessions.agencyId, req.ctx!.agencyId), eq(cashSessions.status, 'OPEN'))).orderBy(desc(cashSessions.openedAt)).limit(1);
      if (!open[0]) return { session: null, expectedMAD: 0n, cashPayments: [] };
      const session = open[0];
      const cashPayments = await tx.select().from(payments)
        .where(and(eq(payments.cashSessionId, session.id))).orderBy(payments.receivedAt);
      const expected = session.openingBalance + cashPayments.reduce<bigint>((acc, p) =>
        acc + (p.direction === 'IN' ? (p.madEquivalent ?? p.amount) : -(p.madEquivalent ?? p.amount)), 0n);
      return { session, expectedMAD: expected, cashPayments };
    });
  }

  @Post('cash-sessions/:id/close')
  @RequirePermission('cash:manage')
  async closeSession(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(CloseSessionSchema)) body: z.infer<typeof CloseSessionSchema>, @Req() req: AuthedRequest) {
    const result = await withTenant(req.ctx!.agencyId, async (tx) => {
      const rows = await tx.select().from(cashSessions)
        .where(and(eq(cashSessions.id, id), eq(cashSessions.agencyId, req.ctx!.agencyId))).limit(1);
      const session = rows[0];
      if (!session || session.status !== 'OPEN') throw new NotFoundException('Session ouverte introuvable');

      const cashPayments = await tx.select().from(payments).where(eq(payments.cashSessionId, id));
      const expected = session.openingBalance + cashPayments.reduce<bigint>((acc, p) =>
        acc + (p.direction === 'IN' ? (p.madEquivalent ?? p.amount) : -(p.madEquivalent ?? p.amount)), 0n);

      const countedMAD = Object.entries(body.counted.MAD ?? {}).reduce<bigint>((acc, [denom, n]) => acc + BigInt(denom) * 100n * BigInt(n), 0n);
      let countedEquivalent = countedMAD;
      for (const [cur, denoms] of Object.entries(body.counted)) {
        if (cur === 'MAD') continue;
        if (!denoms || Object.keys(denoms).length === 0) continue;
        const rate = body.fxRates[cur];
        if (!rate || rate <= 0) throw new BadRequestException(`Taux requis pour la devise comptée ${cur}`);
        const foreign = Object.entries(denoms).reduce<bigint>((acc, [denom, n]) => acc + BigInt(denom) * 100n * BigInt(n), 0n);
        countedEquivalent += toMadEquivalent(foreign, rate);
      }
      const variance = countedEquivalent - expected;

      const updated = await tx.update(cashSessions).set({
        status: 'CLOSED', closedBy: req.ctx!.userId, closedAt: new Date(),
        expectedMAD: expected, counted: body.counted as never, countedMAD,
        countedMadEquivalent: countedEquivalent, varianceMAD: variance,
        varianceExplanation: body.varianceExplanation ?? null,
      }).where(eq(cashSessions.id, id)).returning();

      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'cash_session', entityId: id, action: 'CASH_SESSION_CLOSED',
        after: { expectedMAD: expected.toString(), countedMAD: countedMAD.toString(), varianceMAD: variance.toString() },
        reason: body.varianceExplanation ?? null,
      });
      await appendEvent(tx, req.ctx!.agencyId, 'CashSessionClosed', {
        sessionId: id, branchId: session.branchId, expectedMad: expected.toString(), varianceMad: variance.toString(),
      });
      if (variance !== 0n) {
        await appendEvent(tx, req.ctx!.agencyId, 'CashVarianceNonZero', {
          sessionId: id, branchId: session.branchId, varianceMad: variance.toString(),
        });
      }
      return updated[0];
    });
    dispatchPendingSafe();
    return result;
  }

  @Get('cash-sessions')
  @RequirePermission('finance:read')
  async sessionsList(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, (tx) => tx.select().from(cashSessions)
      .where(eq(cashSessions.agencyId, req.ctx!.agencyId)).orderBy(desc(cashSessions.openedAt)).limit(50));
  }

  @Get('outstanding')
  @RequirePermission('finance:read')
  async outstanding(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const rows = await tx.select({
        contractId: payments.contractId,
        contractNumber: contracts.number,
        customerName: sql<string>`${customers.firstName} || ' ' || ${customers.lastName}`,
        total: sql<string>`coalesce(sum(case when ${payments.direction} = 'IN' then (coalesce(${payments.madEquivalent}, ${payments.amount})) else -(coalesce(${payments.madEquivalent}, ${payments.amount})) end), 0)`,
      }).from(payments)
        .innerJoin(contracts, eq(contracts.id, payments.contractId))
        .innerJoin(customers, eq(customers.id, contracts.customerId))
        .where(eq(payments.agencyId, req.ctx!.agencyId))
        .groupBy(payments.contractId, contracts.number, customers.firstName, customers.lastName);
      return rows.map((r) => ({ ...r, totalMad: r.total }));
    });
  }
}

