'use client';

// A product, field by field in the spec's order (§5.2). The wholesale price
// and the options stay folded until the wholesaler switches them on; values
// are kept as typed and checked by productFormToBody on submit.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, Input, Notice, Switch, Textarea } from '@/components/ui';
import { parseCount, parseFcfa } from '@/lib/tamani/fcfa-input';
import {
  emptyProductForm,
  productFormToBody,
  type ProductBody,
  type ProductFormErrors,
  type ProductFormValues,
} from '@/lib/tamani/product-form';
import { formatPriceLine } from '@/lib/tamani/share-message';
import { unitChoices } from '@/lib/tamani/units';
import { cn } from '@/lib/utils';
import { ChipsInput } from './ChipsInput';
import { PhotoPicker } from './PhotoPicker';

const FIELD_IDS: Record<keyof ProductFormValues, string> = {
  name: 'product-name',
  photos: 'product-photos',
  unitPrice: 'product-unit-price',
  unitLabel: 'product-unit',
  wholesalePrice: 'product-wholesale-price',
  wholesaleMinQty: 'product-wholesale-min',
  costPrice: 'product-cost',
  optionLabel: 'product-option-label',
  options: 'product-options',
  description: 'product-description',
};

const used = (s: string) => s.trim() !== '';

/** How the price will read in the WhatsApp message, once the unit price parses. */
function pricePreview(v: ProductFormValues, wholesale: boolean): string | null {
  const unitPrice = parseFcfa(v.unitPrice);
  if (unitPrice === null) return null;
  return formatPriceLine({
    unitPrice,
    wholesalePrice: wholesale ? parseFcfa(v.wholesalePrice) : null,
    wholesaleMinQty: wholesale ? parseCount(v.wholesaleMinQty, 2) : null,
  });
}

export function ProductForm({
  initial = emptyProductForm,
  submitLabel,
  submittingLabel = 'Enregistrement…',
  onSubmit,
  error,
  errors: serverErrors,
  units = [],
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
  className?: string | undefined;
}) {
  const [v, setV] = useState(initial);
  const [wholesale, setWholesale] = useState(
    used(initial.wholesalePrice) || used(initial.wholesaleMinQty),
  );
  const [hasOptions, setHasOptions] = useState(
    used(initial.optionLabel) || initial.options.length > 0,
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
      ...(wholesale ? {} : { wholesalePrice: '', wholesaleMinQty: '' }),
      ...(hasOptions ? {} : { optionLabel: '', options: [] }),
    };
    const result = productFormToBody(values);
    if (!result.ok) {
      setLocal(result.errors);
      const first = (Object.keys(FIELD_IDS) as Array<keyof ProductFormValues>).find(
        (f) => result.errors[f],
      );
      if (first) requestAnimationFrame(() => document.getElementById(FIELD_IDS[first])?.focus());
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

  const preview = pricePreview(v, wholesale);

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
          label="Prix à l'unité (FCFA)"
          inputMode="numeric"
          placeholder="7 500"
          value={v.unitPrice}
          error={errors.unitPrice}
          onChange={(e) => set('unitPrice', e.target.value)}
        />
        <div>
          <Input
            id={FIELD_IDS.unitLabel}
            label="Unité"
            hint="Touche une unité, ou écris la tienne."
            maxLength={30}
            value={v.unitLabel}
            error={errors.unitLabel}
            onChange={(e) => set('unitLabel', e.target.value)}
          />
          <ul aria-label="Unités" className="mt-3 flex flex-wrap gap-2">
            {unitChoices(units).map((u) => {
              const on = v.unitLabel.trim().toLocaleLowerCase('fr') === u.toLocaleLowerCase('fr');
              return (
                <li key={u}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => set('unitLabel', u)}
                    className={cn(
                      'min-h-10 rounded-full border-2 px-3 text-sm font-bold',
                      on
                        ? 'border-ink bg-accent text-accent-ink'
                        : 'border-grid bg-surface text-ink hover:border-ink',
                    )}
                  >
                    {u}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Switch
          id="product-wholesale"
          label="Je vends aussi en gros"
          checked={wholesale}
          onChange={setWholesale}
        />
        {wholesale && (
          <div className="grid gap-6 sm:grid-cols-2">
            <Input
              id={FIELD_IDS.wholesalePrice}
              label="Prix de gros (FCFA)"
              inputMode="numeric"
              placeholder="6 000"
              value={v.wholesalePrice}
              error={errors.wholesalePrice}
              onChange={(e) => set('wholesalePrice', e.target.value)}
            />
            <Input
              id={FIELD_IDS.wholesaleMinQty}
              label="À partir de (articles)"
              inputMode="numeric"
              placeholder="12"
              value={v.wholesaleMinQty}
              error={errors.wholesaleMinQty}
              onChange={(e) => set('wholesaleMinQty', e.target.value)}
            />
          </div>
        )}
        {preview && <p className="font-hand text-lg text-ink-muted">Sur WhatsApp : {preview}</p>}
      </div>

      <Input
        id={FIELD_IDS.costPrice}
        label="Prix d'achat (FCFA)"
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
