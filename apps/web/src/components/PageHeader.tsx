'use client';
import Link from 'next/link';

type Action = {
  path: string;
  label: string;
  variant?: 'primary' | 'mini';
};

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: Action;
  showDivider?: boolean;
}

export function PageHeader({ title, subtitle, action, showDivider = true }: PageHeaderProps) {
  return (
    <div className="topbar">
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="sub">{subtitle}</div>}
      </div>

      {action && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {action.variant === 'primary' ? (
            <Link href={action.path} className="btn primary">
              {action.label}
            </Link>
          ) : (
            <Link href={action.path} className="btn mini">
              {action.label}
            </Link>
          )}
        </div>
      )}

      {showDivider && <div style={{ borderTop: '1px solid var(--line)', margin: '8px 0', width: '100%' }} />}
    </div>
  );
}
