/**
 * Alert evaluator (ADR-0009): consumes outbox events for EVENT rules; SCHEDULE rules are
 * thin registered checks in scheduler.ts. All alerts flow through raiseAlert() with dedup,
 * severity, source, entity refs, and full ack/resolve lifecycle in the API.
 */
import { and, eq, sql } from 'drizzle-orm';
import { buildDedupKey, evaluateCondition, type AlertSeverity } from '@locaos/domain';
import { db, withTenant } from '../../db/client';
import { alertRules, alerts, outboxEvents } from '../../db/schema';
import { markProcessed } from '../events/events.js';

const FR: Record<string, string> = {
  PaymentRecorded: 'Paiement enregistré',
  DepositReleased: 'Caution libérée',
  RefundIssued: 'Remboursement émis',
  PriceOverridden: 'Prix modifié',
  QuoteBelowFloor: 'Devis sous plancher',
  ContractVoided: 'Contrat annulé',
  DamageNewOnReturn: 'Nouveau dommage',
  FuelLowOnReturn: 'Carburant bas au retour',
  InspectionTooFast: 'Inspection trop rapide',
  LoginOutsideHours: 'Connexion hors heures',
  CashVarianceNonZero: 'Écart de caisse',
};

type DbLike = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function raiseAlert(args: {
  agencyId: string; ruleKey: string; severity: AlertSeverity; sourceKind?: 'RULE' | 'SCHEDULE' | 'SIGNAL';
  category?: string; entityType?: string; entityId?: string; title: string; message: string; evidence?: unknown;
  dedupAt?: Date; tx?: DbLike;
}): Promise<void> {
  const runner = args.tx ?? db;
  const dedupKey = buildDedupKey(args.ruleKey, args.entityType ?? null, args.entityId ?? null, args.dedupAt ?? new Date());
  await runner.insert(alerts).values({
    agencyId: args.agencyId,
    ruleKey: args.ruleKey,
    category: args.category ?? 'OPERATIONS',
    severity: args.severity,
    sourceKind: args.sourceKind ?? 'RULE',
    entityType: args.entityType ?? null,
    entityId: args.entityId ?? null,
    dedupKey,
    title: args.title,
    message: args.message,
    evidence: (args.evidence ?? undefined) as never,
  }).onConflictDoNothing({ target: [alerts.agencyId, alerts.dedupKey] });
}

export async function handleOutbox(id: string, agencyId: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const rules = await withTenant(agencyId, (tx) =>
      tx.select().from(alertRules)
        .where(and(eq(alertRules.agencyId, agencyId), eq(alertRules.eventType, eventType), eq(alertRules.enabled, true)))
        .then((rows) => rows));
    for (const rule of rules) {
      const ref = (payload.vehicleId ?? payload.contractId ?? payload.paymentId ?? payload.sessionId ?? payload.reservationId ?? payload.userId) as string | undefined;
      const conditions = (rule.conditions as { field: string; op: string; value: unknown }[] | null) ?? [];
      const matched = conditions.every((c) => evaluateCondition(c as never, payload));
      if (!matched) continue;
      await raiseAlert({
        agencyId, ruleKey: rule.key, severity: rule.severity as AlertSeverity, sourceKind: 'RULE',
        entityType: ref ?? undefined,
        entityId: ref ?? undefined,
        title: rule.name,
        message: `${FR[eventType] ?? eventType} — ${JSON.stringify(payload).slice(0, 300)}`,
        evidence: payload,
      });
    }
  } finally {
    await markProcessed(id);
  }
}

/** Outbox relay — catches rows whose in-process evaluation didn't happen (crash safety). */
export async function relayOutbox(): Promise<number> {
  const rows = await db.select({ id: outboxEvents.id, agencyId: outboxEvents.agencyId, eventType: outboxEvents.eventType, payload: outboxEvents.payload })
    .from(outboxEvents).where(sql`${outboxEvents.processedAt} is null`).limit(100);
  for (const r of rows) {
    await handleOutbox(r.id, r.agencyId, r.eventType, r.payload as Record<string, unknown>);
  }
  return rows.length;
}
