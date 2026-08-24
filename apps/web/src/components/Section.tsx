'use client';

export function Section({ title, description, children }: { title?: string; description?: string; children: React.ReactNode }) {
  return (
    <div>
      {title && (
        <h2 style={{ textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--muted)', margin: '0 0 8px' }}>
          {title}
        </h2>
      )}
      {description && (
        <p style={{ color: 'var(--muted)', fontSize: '12px', margin: '0 0 16px' }}>
          {description}
        </p>
      )}
      <hr style={{ borderColor: 'var(--line)', margin: '12px 0' }} />
      {children}
    </div>
  );
}