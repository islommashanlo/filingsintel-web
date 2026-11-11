import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  label: string;
  /** Server sort field. Omit for unsortable columns. */
  sort?: string;
  num?: boolean;
  render: (row: T) => ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  /** Current sort in API form: `field` ascending, `-field` descending. */
  sort?: string;
  onSort?: (sort: string) => void;
  minWidth?: number;
  caption: string;
}

/**
 * Sortable table that collapses to labeled cards under 860px (CSS `.tbl.rt`).
 * Sorting is server-side: the header only reports the requested sort.
 */
export function DataTable<T>({ columns, rows, rowKey, sort, onSort, minWidth, caption }: Props<T>) {
  const field = sort?.replace(/^-/, "");
  const desc = sort?.startsWith("-");
  return (
    <div className="tbl-wrap">
      <table className="tbl rt" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = !!c.sort && c.sort === field;
              return (
                <th key={c.key} scope="col" className={c.num ? "num" : undefined} aria-sort={active ? (desc ? "descending" : "ascending") : c.sort ? "none" : undefined}>
                  {c.sort && onSort ? (
                    <button type="button" onClick={() => onSort(active && desc ? c.sort! : `-${c.sort}`)}>
                      {c.label}
                      {active ? (desc ? " ↓" : " ↑") : ""}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c, i) => (
                <td key={c.key} className={c.num ? "num" : undefined} data-label={i === 0 ? undefined : c.label}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
