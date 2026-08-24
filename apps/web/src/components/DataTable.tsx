'use client';

import type { CSSProperties, ComponentType, ReactNode } from 'react';

type Column<T = unknown> = {
  key: string;
  header: string;
  className?: string;
  format?: (val: T, row: T) => string | ReactNode;
  Component?: ComponentType<{ value: T; row: T }>;
  hideIfDetailed?: boolean;
};

type DataTableProps<T extends { id?: string } = { id?: string }> = {
  columns: Column<T>[];
  rows: T[];
  dense?: 'compact' | 'comfortable' | 'detailed';
  selectableRowIds?: Set<string>;
  onRowSelect?: (id: string, selected: boolean) => void;
  selectAllLabel?: string;
  rowLabel?: string;
};

function getDensityStyle(dense: 'compact' | 'comfortable' | 'detailed'): CSSProperties {
  const base: CSSProperties = {
    lineHeight: '1.4',
    padding: '8px 10px',
    fontSize: '13.5px',
  };
  switch (dense) {
    case 'compact':
      return { ...base, lineHeight: '1.2', padding: '6px 8px', fontSize: '12px' };
    case 'detailed':
      return { ...base, lineHeight: '1.5', padding: '10px 12px', fontSize: '15px' };
    case 'comfortable':
      return base;
  }
}

export function DataTable<T extends { id?: string }>({
  columns,
  rows,
  dense = 'comfortable',
  selectableRowIds,
  onRowSelect,
  selectAllLabel = 'Sélectionner tout',
  rowLabel = 'Sélectionner cette ligne',
}: DataTableProps<T>) {
  const densityStyles = getDensityStyle(dense);
  const isSelectable = !!selectableRowIds && !!onRowSelect;

  const getRowId = (row: T, index: number) => row.id ?? String(index);

  const handleToggleAll = (checked: boolean) => {
    if (!selectableRowIds || !onRowSelect) return;
    for (const id of rows.map((row, index) => getRowId(row, index))) {
      onRowSelect(id, checked);
    }
  };

  return (
    <div className="table-wrap" style={{ overflowX: 'auto', maxWidth: '100%' }}>
      <table className="tbl" style={{ width: '100%' }}>
        <thead>
          <tr>
            {isSelectable && (
              <th scope="col" style={{ width: '48px', padding: densityStyles.padding }}>
                <input
                  type="checkbox"
                  onChange={(e) => handleToggleAll(e.target.checked)}
                  aria-label={selectAllLabel}
                  style={{ cursor: 'pointer' }}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                scope="col"
                key={col.key}
                className={col.className}
                style={{ ...densityStyles, height: dense === 'compact' ? '32px' : dense === 'detailed' ? '48px' : '40px' }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowId = getRowId(row, index);
            const selected = selectableRowIds?.has(rowId) ?? false;
            return (
              <tr key={rowId}>
                {isSelectable && (
                  <td style={{ width: '48px', padding: densityStyles.padding }}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) => onRowSelect?.(rowId, e.target.checked)}
                      aria-label={`${rowLabel}: ${rowId}`}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                )}
                {columns.map((col) => {
                  if (dense !== 'detailed' && col.hideIfDetailed) return null;
                  const val = row[col.key as keyof T];
                  return (
                    <td key={col.key} className={col.className} style={densityStyles}>
                      {col.Component ? (
                        <col.Component value={val as T} row={row} />
                      ) : col.format ? (
                        col.format(val as T, row)
                      ) : (
                        String(val ?? '')
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
