'use client';

// The wholesale offers of a product (porteur, 2026-11-18): as many rows as the
// wholesaler wants, up to 10, each « Prix dès » (a price per piece from N) or
// « Lot » (N pieces for one price, with an optional name like « Demi-lot »).
// Values stay as typed; productFormToBody checks them on submit.
import { Button, Input, Notice, Select } from '@/components/ui';
import { currencyLabel } from '@/lib/tamani/currency';
import { OFFER_NAME_MAX, OFFERS_MAX, type OfferKind } from '@/lib/tamani/offers';
import { emptyOfferRow, type OfferRow } from '@/lib/tamani/product-form';

const KIND_OPTIONS: ReadonlyArray<{ value: OfferKind; label: string }> = [
  { value: 'FROM', label: 'Prix par pièce dès une quantité' },
  { value: 'PACK', label: 'Lot à prix fixe' },
];

export const offerFieldId = (index: number, field: keyof OfferRow) =>
  `product-offer-${index}-${field}`;

export function OffersInput({
  rows,
  onChange,
  currency,
  error,
}: {
  rows: readonly OfferRow[];
  onChange: (rows: OfferRow[]) => void;
  currency: string;
  error?: string | undefined;
}) {
  const money = currencyLabel(currency);
  const update = (index: number, patch: Partial<OfferRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div className="flex flex-col gap-4">
      <ol aria-label="Offres de gros" className="flex flex-col gap-4">
        {rows.map((row, index) => (
          <li key={index} className="frame flex flex-col gap-4 rounded-card bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">Offre {index + 1}</p>
              <Button
                variant="ghost"
                aria-label={`Retirer l'offre ${index + 1}`}
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
              >
                Retirer
              </Button>
            </div>
            <Select
              id={offerFieldId(index, 'kind')}
              label="Type d'offre"
              options={KIND_OPTIONS}
              value={row.kind}
              onChange={(e) => update(index, { kind: e.target.value === 'PACK' ? 'PACK' : 'FROM' })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id={offerFieldId(index, 'qty')}
                label={row.kind === 'PACK' ? 'Pièces dans le lot' : 'À partir de (pièces)'}
                inputMode="numeric"
                placeholder={row.kind === 'PACK' ? '45' : '12'}
                value={row.qty}
                onChange={(e) => update(index, { qty: e.target.value })}
              />
              <Input
                id={offerFieldId(index, 'price')}
                label={row.kind === 'PACK' ? `Prix du lot (${money})` : `Prix par pièce (${money})`}
                inputMode="numeric"
                placeholder={row.kind === 'PACK' ? '175 000' : '6 000'}
                value={row.price}
                onChange={(e) => update(index, { price: e.target.value })}
              />
            </div>
            {row.kind === 'PACK' && (
              <Input
                id={offerFieldId(index, 'name')}
                label="Nom du lot (facultatif)"
                placeholder="Demi-lot"
                maxLength={OFFER_NAME_MAX}
                value={row.name}
                onChange={(e) => update(index, { name: e.target.value })}
              />
            )}
          </li>
        ))}
      </ol>
      {error && <Notice tone="danger">{error}</Notice>}
      {rows.length < OFFERS_MAX && (
        <Button
          variant="secondary"
          className="self-start"
          onClick={() => onChange([...rows, emptyOfferRow(rows.at(-1)?.kind)])}
        >
          Ajouter une offre
        </Button>
      )}
    </div>
  );
}
