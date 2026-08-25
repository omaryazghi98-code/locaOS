'use client';

type EmptyStateProps = {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  illustration?: string;
};

export function EmptyState({ title, description, action, illustration }: EmptyStateProps) {
  const titleId = `empty-state-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'title'}`;
  return (
    <section aria-labelledby={titleId} style={{ textAlign: 'center', padding: 'clamp(24px, 6vw, 40px) 20px' }}>
      {illustration && (
        <div aria-hidden="true" style={{ width: '80px', height: '80px', margin: '0 auto 16px', fontSize: '32px' }}>
          {illustration}
        </div>
      )}
      <h2 id={titleId} style={{ margin: '12px 0 8px', fontSize: '16px' }}>{title}</h2>
      <p style={{ color: 'var(--muted)', margin: '0 0 16px' }}>{description}</p>
      {action && (
        <button type="button" className="btn mini" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </section>
  );
}
