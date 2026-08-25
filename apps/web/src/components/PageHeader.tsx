'use client';

import Link from 'next/link';
import { useId } from 'react';

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
  const titleId = useId();
  return (
    <header className="topbar" aria-labelledby={titleId}>
      <div className="page-header-copy" style={{ minWidth: 0, flex: '1 1 auto' }}>
        <h1 id={titleId}>{title}</h1>
        {subtitle && <div className="sub">{subtitle}</div>}
      </div>
      {action && (
        <Link href={action.path} className={`btn ${action.variant === 'primary' ? 'primary' : 'mini'}`}>
          {action.label}
        </Link>
      )}
      {showDivider && <div className="page-header-divider" aria-hidden="true" style={{ flexBasis: '100%', borderTop: '1px solid var(--line)', margin: '4px 0 0' }} />}
    </header>
  );
}
