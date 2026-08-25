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
      style={{ cursor: 'help' }}
      title={title ?? statusValue}
    >
      {statusValue}
    </span>
  );
}
