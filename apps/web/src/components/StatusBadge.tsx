'use client';

type StatusBadgeProps = {
  status?: string;
  value?: string; // alias for status
  className?: string;
  title?: string; // tooltip / expanded label
};

const STATUS_MAP: Record<string, string> = {
  // ACTIVE / ok
  ACTIVE: 'ok',
  // RENTED / info
  RENTED: 'info',
  // MAINTENANCE / warn
  MAINTENANCE: 'warn',
  // OVERDUE / danger
  OVERDUE: 'danger',
  // IMMOBILIZED / danger
  IMMOBILIZED: 'danger',
  // ACCIDENT / danger
  ACCIDENT: 'danger',
  // UNAVAILABLE / muted
  UNAVAILABLE: 'muted',
  // BLANK_ISSUED / warn
  BLANK_ISSUED: 'warn',
  // VOIDED / muted
  VOIDED: 'muted',
  // IN_PROGRESS / info
  IN_PROGRESS: 'info',
  // CANCELLED / muted
  CANCELLED: 'muted',
  // NO_SHOW / muted
  NO_SHOW: 'muted',
  // AVAILABLE / ok
  AVAILABLE: 'ok',
  // PREPARING / info
  PREPARING: 'info',
  // CONTRACT_READY / info
  CONTRACT_READY: 'info',
  // IN_TRANSIT / info
  IN_TRANSIT: 'info',
  // AWAITING_INSPECTION / warn
  AWAITING_INSPECTION: 'warn',
  // INSPECTED / warn
  INSPECTED: 'warn',
  // CLEANING / warn
  CLEANING: 'warn',
};

export function StatusBadge({ status, className, title }: StatusBadgeProps) {
  const statusValue = status ?? value;
  const key = Object.keys(STATUS_MAP).find((k) => k === statusValue) || 'muted';
  const pillClass = STATUS_MAP[key as keyof typeof STATUS_MAP] || 'muted';

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