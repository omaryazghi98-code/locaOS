import { apiFetch } from '@/lib/api';
import DriverLicenseReview from './DriverLicenseReview';

interface IntakeDetail {
  intake: {
    id: string;
    document_id: string;
    document_family: string;
    status: string;
    provider: string | null;
    created_at: string;
  };
  runs: {
    id: string;
    provider: string;
    status: string;
    raw_text: string | null;
    provider_metadata: Record<string, unknown> | null;
    created_at: string;
    completed_at: string | null;
  }[];
  fields: {
    id: string;
    extraction_run_id: string;
    field_key: string;
    value_text: string | null;
    confidence: number | null;
    source_region: unknown;
    validation_status: string;
    confirmed_value: string | null;
  }[];
}

interface DocumentRow {
  id: string;
  kind: string;
  label: string | null;
  mimeType: string;
  bytes: number;
  url: string;
  entityType: string;
  entityId: string | null;
}

export default async function DocumentIntakeReview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await apiFetch<IntakeDetail>(`/api/document-intelligence/intakes/${id}`);
  const docs = await apiFetch<DocumentRow[]>(`/api/documents?entityType=${encodeURIComponent(detail.intake.document_family === 'DRIVER_LICENSE' ? 'customer' : 'other')}`);
  const document = docs.find((d) => d.id === detail.intake.document_id);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Revue documentaire</h1>
          <div className="sub mono">{detail.intake.document_family} · {detail.intake.status} · {detail.intake.provider ?? 'OCR non exécuté'}</div>
        </div>
      </div>
      <DriverLicenseReview
        intake={detail.intake}
        runs={detail.runs}
        fields={detail.fields}
        documentUrl={document?.url ?? null}
        initialCustomerId={document?.entityId ?? ''}
      />
    </div>
  );
}
