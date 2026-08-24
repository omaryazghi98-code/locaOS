'use client';
import Link from 'next/link';
import { UI_STRINGS } from '@locaos/domain/i18n';

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
  const dir = document.dir || 'ltr';

  return (
    <div className="topbar" style={{ direction: dir }}>

      <div>
        <h1>{title}</h1>
        {subtitle && <div className="sub">{subtitle}</div>}
      </div>

      {action && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {action.variant === 'primary'
            ? <button className="btn primary">{action.label}</button>
            : <button className="btn mini" onClick={() => window.location.href = action.path}>
              {action.label}
            </button>}
          {action.variant === 'mini' && (
            <Link href={action.path} className="btn mini" style={{ padding: '3px 8px', fontSize: '11.5px' }}>
              {action.label}
            </Link>
          )}
        </div>
      )}

      {showDivider && <div style={{ borderTop: '1px solid var(--line)', margin: '8px 0', width: '100%' }} />}
    </div>
  );
}