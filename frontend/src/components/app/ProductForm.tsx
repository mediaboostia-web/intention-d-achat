'use client';

// A product, field by field in the spec's order (§5.2). The wholesale offers
// (many since 2026-11-18) and the options stay folded until the wholesaler switches them on; values
// are kept as typed and checked by productFormToBody on submit.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, Input, Notice, Select, Switch, Textarea } from '@/components/ui';
import { currencyLabel } from '@/lib/tamani/currency';
import { parseCount, parseAmount } from '@/lib/tamani/fcfa-input';
import type { Offer } from '@/lib/tamani/offers';
import {
  emptyOfferRow,
  emptyProductForm,
  productFormToBody,
  type ProductBody,
  type ProductFormErrors,
  type ProductFormValues,
} from '@/lib/tamani/product-form';
import { formatPriceLine } from '@/lib/tamani/share-message';
import { CUSTOM_UNIT, unitChoices, unitSelectValue } from '@/lib/tamani/units';
import { cn } from '@/lib/utils';
import { ChipsInput } from './ChipsInput';
import { OffersInput, offerFieldId } from './OffersInput';
import { PhotoPicker } from './PhotoPicker';

const FIELD_IDS: Record<keyof ProductFormValues, string> = {
  name: 'product-name',
  photos: 'product-photos',
  unitPrice: 'product-unit-price',
  unitLabel: 'product-unit',
  offers: offerFieldId(0, 'qty'),
  costPrice: 'product-cost',
  optionLabel: 'product-option-label',
  options: 'product-options',
  description: 'product-description',
};

const UNIT_CUSTOM_ID = 'product-unit-custom';

const used = (s: string) => s.trim() !== '';

/** How the price will read in the WhatsApp message, once the unit price parses. */
function pricePreview(v: ProductFormValues, wholesale: boolean, currency: string): string | null {
  const unitPrice = parseAmount(v.unitPrice);
  if (unitPrice === null) return null;
  const offers = wholesale
    ? v.offers.flatMap((r): Offer[] => {
        const qty = parseCount(r.qty, 2);
        const price = parseAmount(r.price);
        if (qty === null || price === null) return [];
        return [
          { kind: r.kind, qty, price, name: r.kind === 'PACK' ? r.name.trim() || null : null },
        ];
      })
    : [];
  return formatPriceLine({ unitPrice, offers }, currency);
}

export function ProductForm({
  initial = emptyProductForm,
  submitLabel,
  submittingLabel = 'Enregistrement…',
  onSubmit,
  error,
  errors: serverErrors,
  units = [],
  currency,
  className,
}: {
  initial?: ProductFormValues;
  submitLabel: string;
  submittingLabel?: string;
  onSubmit: (body: ProductBody) => Promise<void>;
  error?: string | null | undefined;
  errors?: ProductFormErrors | undefined;
  /** Units the shop already uses, shown after the common ones. */
  units?: readonly string[];
  /** The shop's currency (lot 7b): the labels, the hints and the preview. */
  currency: string;
  className?: string | undefined;
}) {
  const [v, setV] = useState(initial);
  const [wholesale, setWholesale] = useState(initial.offers.length > 0);
  const [hasOptions, setHasOptions] = useState(
    used(initial.optionLabel) || initial.options.length > 0,
  );
  const choices = unitChoices(units);
  const unitOptions = [
    ...choices.map((u) => ({ value: u, label: u })),
    { value: CUSTOM_UNIT, label: 'Personnalisé…' },
  ];
  const [customUnit, setCustomUnit] = useState(
    unitSelectValue(initial.unitLabel, choices) === CUSTOM_UNIT,
  );
  const [local, setLocal] = useState<ProductFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const notice = useRef<HTMLDivElement>(null);
  const errors = { ...serverErrors, ...local };

  // The API error sits at the top; on a phone the button is far below it.
  useEffect(() => {
    if (error) notice.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [error]);

  function set<K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]) {
    setV((current) => ({ ...current, [field]: value }));
    setLocal((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values: ProductFormValues = {
      ...v,
      ...(wholesale ? {} : { offers: [] }),
      ...(hasOptions ? {} : { optionLabel: '', options: [] }),
    };
    const result = productFormToBody(values, currency);
    if (!result.ok) {
      setLocal(result.errors);
      const first = (Object.keys(FIELD_IDS) as Array<keyof ProductFormValues>).find(
        (f) => result.errors[f],
      );
      const target =
        first === 'unitLabel' && customUnit ? UNIT_CUSTOM_ID : first && FIELD_IDS[first];
      if (target) requestAnimationFrame(() => document.getElementById(target)?.focus());
      return;
    }
    setLocal({});
    setSubmitting(true);
    try {
      await onSubmit(result.body);
    } finally {
      setSubmitting(false);
    }
  }

  const preview = pricePreview(v, wholesale, currency);
  const money = currencyLabel(currency);

  return (
    <form
      onSubmit={(e) => void submit(e)}
      noValidate
      className={cn('flex flex-col gap-6', className)}
    >
      {error && (
        <div ref={notice}>
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <Input
        id={FIELD_IDS.name}
        label="Nom du produit"
        placeholder="Marmites inox 5 L"
        maxLength={80}
        value={v.name}
        error={errors.name}
        onChange={(e) => set('name', e.target.value)}
      />
      <PhotoPicker
        id={FIELD_IDS.photos}
        label="Photos"
        hint="6 au plus. La première sert de vignette."
        max={6}
        value={v.photos}
        onChange={(photos) => set('photos', photos)}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          id={FIELD_IDS.unitPrice}
          label={`Prix à l'unité (${money})`}
          inputMode="numeric"
          placeholder="7 500"
          value={v.unitPrice}
          error={errors.unitPrice}
          onChange={(e) => set('unitPrice', e.target.value)}
        />
        <div className="flex flex-col gap-3">
          <Select
            id={FIELD_IDS.unitLabel}
            label="Unité"
            options={unitOptions}
            value={customUnit ? CUSTOM_UNIT : unitSelectValue(v.unitLabel, choices)}
            error={customUnit ? undefined : errors.unitLabel}
            onChange={(e) => {
              const picked = e.target.value;
              setCustomUnit(picked === CUSTOM_UNIT);
              set('unitLabel', picked === CUSTOM_UNIT ? '' : picked);
            }}
          />
          {customUnit && (
            <Input
              id={UNIT_CUSTOM_ID}
              label="Ton unité"
              placeholder="bassine, rouleau…"
              maxLength={30}
              value={v.unitLabel}
              error={errors.unitLabel}
              onChange={(e) => set('unitLabel', e.target.value)}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Switch
          id="product-wholesale"
          label="Je vends aussi en gros"
          checked={wholesale}
          onChange={(on) => {
            setWholesale(on);
            if (on && v.offers.length === 0) set('offers', [emptyOfferRow()]);
          }}
        />
        {wholesale && (
          <OffersInput
            rows={v.offers}
            onChange={(offers) => set('offers', offers)}
            currency={currency}
            error={errors.offers}
          />
        )}
        {preview && <p className="font-hand text-lg text-ink-muted">Sur WhatsApp : {preview}</p>}
      </div>

      <Input
        id={FIELD_IDS.costPrice}
        label={`Prix d'achat (${money})`}
        hint="Pour calculer ton bénéfice. Jamais montré à tes clients."
        inputMode="numeric"
        placeholder="5 000"
        value={v.costPrice}
        error={errors.costPrice}
        onChange={(e) => set('costPrice', e.target.value)}
      />

      <div className="flex flex-col gap-4">
        <Switch
          id="product-has-options"
          label="Ce produit a des options"
          hint="Une couleur, une taille, un parfum…"
          checked={hasOptions}
          onChange={setHasOptions}
        />
        {hasOptions && (
          <>
            <Input
              id={FIELD_IDS.optionLabel}
              label="Nom de l'option"
              placeholder="Couleur"
              maxLength={30}
              value={v.optionLabel}
              error={errors.optionLabel}
              onChange={(e) => set('optionLabel', e.target.value)}
            />
            <ChipsInput
              id={FIELD_IDS.options}
              label="Choix proposés"
              error={errors.options}
              value={v.options}
              onChange={(options) => set('options', options)}
              max={12}
              maxLength={30}
              placeholder="Rouge, Noir…"
              addLabel="Nouveau choix"
            />
          </>
        )}
      </div>

      <Textarea
        id={FIELD_IDS.description}
        label="Description (facultatif)"
        rows={4}
        maxLength={1000}
        value={v.description}
        error={errors.description}
        onChange={(e) => set('description', e.target.value)}
      />

      <Button type="submit" size="lg" disabled={submitting} className="w-full shadow-press">
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
