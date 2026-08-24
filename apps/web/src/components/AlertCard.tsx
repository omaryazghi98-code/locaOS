'use client';

type AlertCardProps = {
  type: 'info' | 'warn' | 'danger' | 'ok';
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
};

const ALERT_CLASSES: Record<'info' | 'warn' | 'danger' | 'ok', string> = {
  warn: 'alert-ATTENTION',
  danger: 'alert-CRITICAL',
  info: '',
  ok: '',
};

export function AlertCard({ type, title, description, action }: AlertCardProps) {
  const alertClass = ALERT_CLASSES[type];

  return (
    <div
      className={`alert ${alertClass}`}
      style={{ marginBottom: '12px' }}
      aria-live="polite"
    >
      <div>
        <strong className="t">{title}</strong>
        <span className="m" style={{ marginTop: '2px', display: 'block' }}>
          {description}
        </span>
      </div>
      {action && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
          <button className="btn mini" onClick={action.onClick}>
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}