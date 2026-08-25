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
    <header className="topbar" aria-labelledby={`page-title-${title}`}>
      <div className="page-header-copy">
        <h1 id={`page-title-${title}`}>{title}</h1>
        {subtitle && <div className="sub">{subtitle}</div>}
      </div>
      {action && (
        <Link href={action.path} className={`btn ${action.variant === 'primary' ? 'primary' : 'mini'}`}>
          {action.label}
        </Link>
      )}
      {showDivider && <div className="page-header-divider" aria-hidden="true" />}
    </header>
  );
}
