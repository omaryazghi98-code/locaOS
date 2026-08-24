/**
 * Alert rules engine types (ADR-0009). Rules are data; the evaluator has three channels:
 *  1. EVENT rules  — simple declarative conditions over a domain-event payload
 *  2. SCHEDULE rules — thin registered checks (system rules) run by the scheduler
 *  3. SIGNALS      — derived conditions (ADR-0010), also raised through this record shape
 */
export const ALERT_SEVERITIES = ['INFO', 'ATTENTION', 'HIGH', 'CRITICAL'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ALERT_STATUSES = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export const ACTION_KINDS = ['NOTIFY', 'CREATE_TASK', 'REQUIRE_APPROVAL', 'SUGGESTION'] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];

/** Simple declarative condition over an event payload — deliberately NOT a DSL. */
export type Condition =
  | { field: string; op: 'eq' | 'ne'; value: string | number | boolean | null }
  | { field: string; op: 'gt' | 'lt' | 'gte' | 'lte'; value: number }
  | { field: string; op: 'in'; value: (string | number)[] }
  | { field: string; op: 'exists' | 'missing' };

export function evaluateCondition(cond: Condition, payload: Record<string, unknown>): boolean {
  const raw = cond.field.split('.').reduce<unknown>((acc, k) =>
    acc != null && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined, payload);
  switch (cond.op) {
    case 'eq': return raw === cond.value;
    case 'ne': return raw !== cond.value;
    case 'gt': return typeof raw === 'number' && raw > cond.value;
    case 'lt': return typeof raw === 'number' && raw < cond.value;
    case 'gte': return typeof raw === 'number' && raw >= cond.value;
    case 'lte': return typeof raw === 'number' && raw <= cond.value;
    case 'in': return raw != null && (cond.value as unknown[]).includes(raw as string | number);
    case 'exists': return raw !== undefined && raw !== null;
    case 'missing': return raw === undefined || raw === null;
  }
}

export interface AlertRuleDef {
  key: string;
  name: string;
  channel: 'EVENT' | 'SCHEDULE' | 'SIGNAL';
  eventType?: string;        // for EVENT rules
  scheduleKey?: string;      // for SCHEDULE rules (registry of thin system checks)
  severity: AlertSeverity;
  actionKind: ActionKind;
  dedupWindowMinutes: number;
  enabledByDefault: boolean;
  conditions?: Condition[];
  description: string;
}

export function buildDedupKey(ruleKey: string, entityType: string | null, entityId: string | null, at = new Date()): string {
  const day = at.toISOString().slice(0, 10);
  return `${ruleKey}:${entityType ?? '-'}:${entityId ?? '-'}:${day}`;
}
