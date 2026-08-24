/** Append-only audit log (§11). Every call writes one immutable row (DB trigger blocks edits). */
import { db, type Tx } from '../../db/client';
import { auditEvents } from '../../db/schema';

export interface AuditActor { id: string | null; name: string | null; }

export async function audit(
  tx: Tx | typeof db,
  args: {
    agencyId: string; actor?: AuditActor | null; entityType: string; entityId?: string | null;
    action: string; before?: unknown; after?: unknown; source?: string; ip?: string | null; reason?: string | null;
  },
): Promise<void> {
  await tx.insert(auditEvents).values({
    agencyId: args.agencyId,
    actorId: args.actor?.id ?? null,
    actorName: args.actor?.name ?? null,
    entityType: args.entityType,
    entityId: args.entityId ?? null,
    action: args.action,
    before: (args.before ?? undefined) as never,
    after: (args.after ?? undefined) as never,
    source: args.source ?? 'api',
    ip: args.ip ?? null,
    reason: args.reason ?? null,
  });
}
