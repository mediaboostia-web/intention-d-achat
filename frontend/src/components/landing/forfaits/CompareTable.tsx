import { Icon } from '@/components/ui';
import { compareColumns, compareRows } from '@/lib/tamani/landing-forfaits';

function CellValue({ value }: { value: string | boolean }) {
  if (value === true)
    return (
      <span>
        <Icon name="check" />
        <span className="sr-only">Oui</span>
      </span>
    );
  if (value === false) return <span className="text-ink-muted">Non</span>;
  return <>{value}</>;
}

/**
 * Every detail of the seven offers (spec §6.4). On a phone the table scrolls
 * inside its own frame, its first column pinned; the page never scrolls sideways.
 */
export function CompareTable() {
  const columns = compareColumns();
  return (
    <div className="lp-compare">
      <div
        className="lp-compare__scroll"
        tabIndex={0}
        role="region"
        aria-labelledby="lp-compare-caption"
      >
        <table>
          <caption id="lp-compare-caption">Ce que comprend chaque offre</caption>
          <thead>
            <tr>
              <th scope="col">Ce que tu as</th>
              {columns.map((c) => (
                <th key={c.id} scope="col">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {compareRows().map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                {r.cells.map((cell, i) => (
                  <td key={columns[i]?.id ?? i}>
                    <CellValue value={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
