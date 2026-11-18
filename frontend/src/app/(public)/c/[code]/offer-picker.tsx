'use client';

// A reseller's offers (porteur, 2026-11-18): each offer can be taken one or
// more times, mixed with the unit price; the total in pieces and money
// follows. « Continuer » waits for at least one piece, every « dès N » offer
// at N or more, and no more than the stock left.
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { PublicCampaign } from '@/lib/server/tamani/public-campaign';
import { CURRENCY_LABEL, formatMoney } from '@/lib/tamani/currency';
import { freezePicks, offerLabel, picksTotal, type PickInput } from '@/lib/tamani/offers';
import type { PopupAction, PopupAnswers } from '@/lib/tamani/popup-machine';
import { pluralizeUnit } from '@/lib/tamani/verdict-display';
import { Stepper } from './stepper';

type Key = number | 'UNIT';

const CURRENCIES = [...new Set(Object.values(CURRENCY_LABEL))].join('|');
const MONEY = new RegExp(String.raw`(\d[\d\s]*\s(?:${CURRENCIES}))`);

/** « Lot de 85 · 350 000 » + currency: an amount never breaks between its digits and its currency. */
function NoBreakPrices({ text }: { text: string }) {
  return text.split(MONEY).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function OfferPickerStep({
  c,
  answers,
  onAction,
}: {
  c: PublicCampaign;
  answers: PopupAnswers;
  onAction: (action: PopupAction) => void;
}) {
  const { product } = c;
  const currency = c.shop.currency;
  const [counts, setCounts] = useState<Map<Key, number>>(
    () => new Map((answers.offerPicks ?? []).map((p) => [p.offer, p.count])),
  );
  const set = (key: Key, n: number) => setCounts((cur) => new Map(cur).set(key, n));

  const rows: Array<{ key: Key; label: string; hint: string | null }> = [
    ...product.offers.map((o, i) => ({
      key: i as Key,
      label: offerLabel(o, currency),
      hint: o.kind === 'PACK' ? 'Nombre de lots' : `Pièces (${o.qty} au moins)`,
    })),
    {
      key: 'UNIT',
      label: `À l'unité · ${formatMoney(product.unitPrice, currency)}`,
      hint: 'Pièces',
    },
  ];
  const picks: PickInput[] = rows.flatMap(({ key }) => {
    const count = counts.get(key) ?? 0;
    return count > 0 ? [{ offer: key, count }] : [];
  });
  const frozen = picks.length > 0 ? freezePicks(product.offers, product.unitPrice, picks) : null;
  const total = frozen?.ok ? picksTotal(frozen.picks) : { pieces: 0, amount: 0 };
  const left = c.stock.total;
  const tooMany = left !== null && total.pieces > left;
  const ready = frozen?.ok === true && total.pieces > 0 && !tooMany;

  return (
    <>
      <h2 className="mt-5 mb-3.5 font-hand text-[34px] leading-none font-bold text-primary">
        Combien ?
      </h2>
      <p className="mb-2 text-sm font-bold text-ink-soft">
        Choisis une ou plusieurs offres, autant de fois que tu veux.
      </p>
      <ul className="frame divide-y-2 divide-grid overflow-hidden rounded-card bg-surface">
        {rows.map(({ key, label, hint }) => (
          <li key={String(key)} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0 break-words text-ink">
              <span className="block font-bold">
                <NoBreakPrices text={label} />
              </span>
              {hint && <span className="block text-sm text-ink-soft">{hint}</span>}
            </span>
            <Stepper
              id={`popup-offer-${String(key)}`}
              label={label}
              value={counts.get(key) ?? 0}
              onChange={(n) => set(key, n)}
            />
          </li>
        ))}
      </ul>
      <p className="mt-3 font-bold text-ink" aria-live="polite">
        Total : {total.pieces} {pluralizeUnit(product.unitLabel, total.pieces)} ·{' '}
        {formatMoney(total.amount, currency)}
      </p>
      {frozen && !frozen.ok && (
        <p className="mt-1 text-sm font-bold text-danger" role="status">
          {frozen.message}
        </p>
      )}
      {tooMany && (
        <p className="mt-1 text-sm font-bold text-danger" role="status">
          Il n&apos;en reste que {left}.
        </p>
      )}
      <Button
        size="lg"
        className="mt-3 w-full"
        disabled={!ready}
        onClick={() => onAction({ type: 'offers', picks, pieces: total.pieces })}
      >
        Continuer
      </Button>
    </>
  );
}
