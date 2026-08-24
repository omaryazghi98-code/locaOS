'use client';

type FilterField = {
  key: string;
  label: string;
  placeholder?: string;
  operator?: 'contains' | 'equals';
};

type FilterBarProps = {
  fields: FilterField[];
  onFilterChange: (filters: Record<string, string>) => void;
};

export function FilterBar({ fields, onFilterChange }: FilterBarProps) {
  const handleChange = (key: string, value: string) => {
    const filters: Record<string, string> = {};
    fields.forEach((f) => {
      filters[f.key] = f.operator === 'equals' ? (value || '') : (value ?? '');
    });
    onFilterChange(filters);
  };

  return (
    <div style={{ display: 'flex', gap: 12, margin: '0 0 12px', flexWrap: 'wrap' }}>
      {fields.map((field) => (
        <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label
            style={{
              fontSize: '11px',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '.4px',
            }}
          >
            {field.label}
          </label>
          <input
            type="text"
            placeholder={field.placeholder ?? field.label}
            value=""
            onChange={(e) => handleChange(field.key, e.target.value)}
            style={{
              background: 'var(--bg)',
              color: 'var(--text)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              padding: '7px 9px',
              fontSize: '13px',
              width: '100%',
            }}
            aria-label={field.label}
          />
        </div>
      ))}

      {fields.length > 0 && (
        <button
          className="btn mini"
          style={{
            marginTop: '4px',
            fontSize: '11px',
            padding: '4px 8px',
          }}
          onClick={() => {
            const emptyFilters: Record<string, string> = {};
            fields.forEach(() => { emptyFilters[''] = ''; });
            onFilterChange(emptyFilters);
          }}
        >
          Effacer
        </button>
      )}
    </div>
  );
}