'use client';

type Column<T = unknown> = {
  key: string;
  header: string;
  className?: string;
  format?: (val: T, row: T) => string | React.ReactNode;
  Component?: React.ComponentType<{value: T; row: T}>; // if provided, renders this component in the cell instead of format
  hideIfDetailed?: boolean; // if true, hide in compact/comfortable, show only in detailed
};

type DataTableProps<T = unknown> = {
  columns: Column<T>[];
  rows: T[];
  dense?: 'compact' | 'comfortable' | 'detailed';
  selectableRowIds?: Set<string>;
  onRowSelect?: (id: string) => void;
  selectAllLabel?: string;
};

function getDensityStyle(dense: 'compact' | 'comfortable' | 'detailed'): React.CSSProperties {
  const base: React.CSSProperties = {
    lineHeight: '1.4',
    padding: '8px 10px',
    fontSize: '13.5px',
  };
  switch (dense) {
    case 'compact':
      return {
        ...base,
        lineHeight: '1.2',
        padding: '6px 8px',
        fontSize: '12px',
      };
    case 'detailed':
      return {
        ...base,
        lineHeight: '1.5',
        padding: '10px 12px',
        fontSize: '15px',
      };
    case 'comfortable':
      return base;
  }
}

export function DataTable<T = unknown>({
  columns,
  rows,
  dense = 'comfortable',
  selectableRowIds,
  onRowSelect,
  selectAllLabel = 'Sélectionner tout',
}: DataTableProps<T>) {
  const densityStyles = getDensityStyle(dense);
  const isSelectable = !!selectableRowIds && !!onRowSelect;

  // Build header row
  const headerCells = columns.map((col) => (
    <th
      scope="col"
      key={col.key}
      style={{ height: densityStyles.lineHeight === '1.2' ? '32px' : densityStyles.lineHeight === '1.5' ? '48px' : '40px', padding: densityStyles.padding }}
    >
      {col.header}
    </th>
  ));

  // Build row cells
  const rowCells = (row: T, rowId: string) => columns.map((col) => {
    const val = row[col.key as keyof T] ?? '';
    const formatted = col.format ? col.format(val as unknown as T, row) : String(val);
    const cellStyle: React.CSSProperties = {
      lineHeight: densityStyles.lineHeight,
      padding: densityStyles.padding,
    };
    // In compact mode, hide secondary metadata-like columns; in detailed, show more
    if (dense === 'compact' && col.hideIfDetailed) return null;
    if (col.Component) {
      return (
        <td key={col.key} style={cellStyle}>
          <col.Component value={val as T} row={row} />
        </td>
      );
    }
    return (
      <td key={col.key} style={cellStyle}>
        {formatted}
      </td>
    );
  });

  return (
    <table className="tbl" style={{ width: '100%' }}>
      <thead>
      <tr style={{ height: densityStyles.lineHeight === '1.2' ? '32px' : densityStyles.lineHeight === '1.5' ? '48px' : '40px' }}>
        {headerCells}
        {isSelectable && <th
          style={{ width: '48px', padding: densityStyles.padding }}
          aria-label={selectAllLabel}
        >
          <input
            type="checkbox"
            defaultChecked
            onChange={(e) => {
              const allChecked = e.target.checked;
              selectableRowIds.forEach((id) => onRowSelect(id, allChecked));
            }}
            aria-label={selectAllLabel}
            style={{ width: '100%', height: '100%', cursor: 'pointer' }}
          />
        </th>}
      </tr>
      </thead>
      <tbody>
      {rows.map((row, i) => (
        <tr
          key={row.id || i}
          style={{ lineHeight: densityStyles.lineHeight }}
          onClick={(e) => {
            if (onRowSelect && !e.target?.closest('input')) {
              onRowSelect(row.id || String(i), false);
            }
          }}
          onMouseDown={(e) => e?.preventDefault()}
        >
          {isSelectable && (
            <td
              style={{ width: '48px', padding: densityStyles.padding }}
              aria-label="Sélectionner cette ligne"
            >
              <input
                type="checkbox"
                checked={selectableRowIds.has(row.id || String(i))}
                onChange={(e) => onRowSelect(row.id || String(i), e.target.checked)}
                style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                aria-label="Sélectionner cette ligne"
              />
            </td>
          )}
          {columns.map((col, ci) => rowCells(row, row.id || String(i))[ci])}
        </tr>
      ))}
      </tbody>
    </table>
  );
}