import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AdminColumn {
  label: string;
  /** Figures line up on the right. */
  numeric?: boolean;
}

/** A back-office table: it scrolls sideways inside its frame, never the page. */
export function AdminTable({
  caption,
  columns,
  rows,
  footer,
}: {
  caption: string;
  columns: readonly AdminColumn[];
  rows: readonly (readonly ReactNode[])[];
  footer?: readonly ReactNode[];
}) {
  const cell = (numeric: boolean | undefined) =>
    cn('px-3 py-2 whitespace-nowrap', numeric && 'text-right tabular-nums');
  return (
    <div className="frame overflow-x-auto rounded-card bg-surface">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.label}
                scope="col"
                className={cn(cell(c.numeric), 'border-b-2 border-grid font-bold text-ink')}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-grid last:border-b-0">
              {row.map((value, j) => (
                <td key={j} className={cn(cell(columns[j]?.numeric), 'text-ink')}>
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot>
            <tr className="border-t-2 border-grid">
              {footer.map((value, j) => (
                <td key={j} className={cn(cell(columns[j]?.numeric), 'font-bold text-ink')}>
                  {value}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
