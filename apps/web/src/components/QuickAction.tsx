'use client';

type QuickActionProps = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'mini' | 'danger';
};

export function QuickAction({ label, onClick, variant = 'mini' }: QuickActionProps) {
  const cls = variant === 'primary'
    ? 'btn primary'
    : variant === 'danger'
      ? 'btn danger'
      : 'btn mini';

  return <button className={cls} onClick={onClick}>{label}</button>;
}