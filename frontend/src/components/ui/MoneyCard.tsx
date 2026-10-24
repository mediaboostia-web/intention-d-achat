import { cn, formatPrice } from '@/lib/utils';
import { DataList } from './DataList';

/**
 * Money avoided and profit expected (spec §5.4.0). Only shown when the
 * product has a cost price; otherwise an invitation to add one.
 */
export function MoneyCard({
  avoidedDeadStock,
  expectedProfit,
  reference,
  addCostPriceHref,
  className,
}: {
  avoidedDeadStock: number | null;
  expectedProfit: number | null;
  reference?: number;
  addCostPriceHref?: string;
  className?: string;
}) {
  if (avoidedDeadStock === null && expectedProfit === null) {
    return (
      <div
        className={cn(
          'rounded-card border-2 border-dashed border-ink-muted/60 p-4 text-ink-soft',
          className,
        )}
      >
        <p>Ajoute ton prix d&apos;achat pour voir l&apos;argent que tu évites.</p>
        {addCostPriceHref && (
          <a
            href={addCostPriceHref}
            className="mt-2 inline-block font-bold text-primary underline decoration-2 underline-offset-4"
          >
            Ajouter le prix d&apos;achat
          </a>
        )}
      </div>
    );
  }

  return (
    <section aria-label="Argent" className={className}>
      <h3 className="font-hand text-2xl font-bold text-primary">Argent sauvé</h3>
      {avoidedDeadStock !== null && (
        <>
          <p className="mt-1 font-sign text-3xl leading-snug whitespace-nowrap">
            <span className="highlight">
              {formatPrice(avoidedDeadStock)} <small className="text-[0.5em]">FCFA</small>
            </span>
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {reference === undefined
              ? 'de stock qui aurait dormi au dépôt.'
              : `de stock qui aurait dormi au dépôt si tu commandais ${reference}.`}
          </p>
        </>
      )}
      {expectedProfit !== null && (
        <DataList
          className="mt-1.5"
          items={[
            {
              id: 'profit',
              label: 'Bénéfice attendu',
              value: `~${formatPrice(expectedProfit, 'FCFA')}`,
            },
          ]}
        />
      )}
    </section>
  );
}
