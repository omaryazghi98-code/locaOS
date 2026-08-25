'use client';

import { useEffect, useState } from 'react';

type FilterField = {
  key: string;
  label: string;
  placeholder?: string;
  operator?: 'contains' | 'equals';
};

type FilterBarProps = {
  fields: FilterField[];
  values?: Record<string, string>;
  onFilterChange: (filters: Record<string, string>) => void;
  clearLabel?: string;
  ariaLabel?: string;
};

export function FilterBar({ fields, values, onFilterChange, clearLabel = 'Effacer', ariaLabel = 'Filtres' }: FilterBarProps) {
  const [internal, setInternal] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((field) => [field.key, values?.[field.key] ?? ''])));

  useEffect(() => {
    if (values) setInternal(Object.fromEntries(fields.map((field) => [field.key, values[field.key] ?? ''])));
  }, [fields, values]);

  const update = (key: string, value: string) => {
    const next = { ...internal, [key]: value };
    setInternal(next);
    onFilterChange(next);
  };

  const clear = () => {
    const empty = Object.fromEntries(fields.map((field) => [field.key, '']));
    setInternal(empty);
    onFilterChange(empty);
  };

  return (
    <div
      className="filter-bar"
      role="search"
      aria-label={ariaLabel}
      style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}
    >
      {fields.map((field) => (
        <div key={field.key} className="filter-field" style={{ flex: '1 1 180px', minWidth: 'min(100%, 180px)' }}>
          <label htmlFor={`filter-${field.key}`}>{field.label}</label>
          <input
            id={`filter-${field.key}`}
            type="text"
            placeholder={field.placeholder ?? field.label}
            value={internal[field.key] ?? ''}
            onChange={(e) => update(field.key, e.target.value)}
            aria-label={field.label}
            inputMode={field.operator === 'equals' ? 'text' : 'search'}
          />
        </div>
      ))}
      {fields.length > 0 && (
        <button type="button" className="btn mini filter-clear" onClick={clear} style={{ flex: '0 0 auto' }}>
          {clearLabel}
        </button>
      )}
    </div>
  );
}
