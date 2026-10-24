import { cn } from '@/lib/utils';

const coef = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/**
 * "Comment c'est calculé ?" written out like a ledger: announced quantity ×
 * coefficient = realistic, per buyer type. An estimate always shows its basis.
 */
export function CalcTable({
  rows,
  total,
  footnote,
  className,
}: {
  rows: ReadonlyArray<{
    label: string;
    count?: number;
    announced: number;
    coef: number;
    realistic: number;
  }>;
  total: { announced: number; realistic: number };
  footnote?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <table className="w-full border-collapse text-[15px]">
        <caption className="sr-only">Calcul de l&apos;estimation réaliste</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Qui</th>
            <th scope="col">Quantité annoncée</th>
            <th scope="col">Coefficient</th>
            <th scope="col">Quantité réaliste</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="h-9">
              <th scope="row" className="text-left font-bold">
                {row.label}
                {row.count !== undefined && (
                  <span className="ml-1 text-sm font-normal text-ink-muted">({row.count})</span>
                )}
              </th>
              <td className="text-right text-ink-soft tabular-nums">{row.announced}</td>
              <td className="pl-1.5 text-right whitespace-nowrap text-ink-muted">
                × {coef.format(row.coef)}
              </td>
              <td className="w-16 text-right font-sign">{row.realistic}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="h-9 border-t-2 border-ink">
            <th scope="row" className="text-left font-bold">
              Total
            </th>
            <td className="text-right text-ink-soft tabular-nums">{total.announced}</td>
            <td />
            <td className={cn('text-right font-sign text-xl text-primary')}>≈ {total.realistic}</td>
          </tr>
        </tfoot>
      </table>
      {footnote && (
        <p className="mt-1.5 font-hand text-lg leading-snug text-ink-muted">{footnote}</p>
      )}
    </div>
  );
}
