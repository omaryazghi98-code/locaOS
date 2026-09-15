export type NaviEntityType =
  | 'reservation'
  | 'vehicle'
  | 'customer'
  | 'contract'
  | 'inspection'
  | 'operations';

export type NaviEvidence = {
  source: string;
  entityType: NaviEntityType;
  entityId: string;
  label: string;
  facts: Record<string, unknown>;
};

export type NaviContext = {
  query: string;
  entity: { type: NaviEntityType; id: string; reference?: string } | null;
  facts: Record<string, unknown>;
  evidence: NaviEvidence[];
  relatedEntities: Array<{ type: NaviEntityType; id: string; reference?: string }>;
  missingContext: string[];
};

export type NaviReasoningResult = {
  answer: string;
  facts: string[];
  inferences: string[];
  impact: string | null;
  recommendation: string | null;
  evidence: NaviEvidence[];
  relatedEntities: Array<{ type: NaviEntityType; id: string; reference?: string }>;
  proposedActions: Array<{ type: string; label: string; entityType: NaviEntityType; entityId: string }>;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
};
