'use client';

type EmptyStateProps = {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  illustration?: string;
};

export function EmptyState({ title, description, action, illustration }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      {illustration && <div style={{ width: '80px', height: '80px', margin: '0 auto 16px', fontSize: '32px' }}>{illustration}</div>}
      <h2 style={{ margin: '12px 0 8px', fontSize: '16px' }}>{title}</h2>
      <p style={{ color: 'var(--muted)', margin: '0 0 16px' }}> {description}</p>
      {action && (
        <button className="btn mini" onClick={action.onClick} style={{ margin: '0 8px 4px', fontSize: '12px' }}>
          {action.label}
        </button>
      )}
    </div>
  );
}