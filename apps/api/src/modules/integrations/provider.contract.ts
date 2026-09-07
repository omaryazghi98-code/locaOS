/**
 * Generic integration provider contract.
 *
 * Domain modules remain authoritative. Providers supply external capabilities and
 * must never be allowed to silently mutate rental truth.
 */
export type IntegrationKind = 'PAYMENTS' | 'OCR' | 'SIGNATURE' | 'MESSAGING' | 'TELEMATICS' | 'ACCOUNTING' | 'OTHER';
export type IntegrationStatus = 'CONNECTED' | 'MOCK' | 'UNAVAILABLE' | 'DEGRADED';

export interface IntegrationCapability {
  key: string;
  description: string;
}

export interface IntegrationContext {
  agencyId: string;
  correlationId?: string;
  requestedBy?: string;
}

export interface IntegrationProvider {
  readonly id: string;
  readonly kind: IntegrationKind;
  readonly name: string;
  status(): { status: IntegrationStatus; detail: string };
  capabilities(): readonly IntegrationCapability[];
  execute(action: string, payload: unknown, context: IntegrationContext): Promise<unknown>;
}
