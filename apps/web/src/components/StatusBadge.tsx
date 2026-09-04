'use client';

type StatusBadgeProps = {
  status?: string;
  value?: string;
  className?: string;
  title?: string;
};

const STATUS_MAP: Record<string, string> = {
  ACTIVE: 'ok',
  RENTED: 'info',
  MAINTENANCE: 'warn',
  OVERDUE: 'danger',
  IMMOBILIZED: 'danger',
  ACCIDENT: 'danger',
  UNAVAILABLE: 'muted',
  BLANK_ISSUED: 'warn',
  VOIDED: 'muted',
  IN_PROGRESS: 'info',
  CANCELLED: 'muted',
  NO_SHOW: 'muted',
  AVAILABLE: 'ok',
  PREPARING: 'info',
  CONTRACT_READY: 'info',
  IN_TRANSIT: 'info',
  AWAITING_INSPECTION: 'warn',
  INSPECTED: 'warn',
  CLEANING: 'warn',
};

export function StatusBadge({ status, value, className, title }: StatusBadgeProps) {
  const statusValue = status ?? value ?? '';
  const pillClass = STATUS_MAP[statusValue] ?? 'muted';

  return (
    <span
      className={`pill ${pillClass} ${className ?? ''}`}
      data-status={statusValue}
      style={{ cursor: 'help', color: 'var(--st)', background: 'color-mix(in srgb, var(--st) 15%, transparent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
      title={title ?? statusValue}
    >
      <i aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--st)', display: 'inline-block' }} />
      {statusValue}
    </span>
  );
}
