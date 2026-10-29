'use client';

// An order typed by hand (lot 7, spec §5.5.1): the product, the client (first
// name and WhatsApp number, found in the book by the server or added to it),
// who buys, how many, pickup or delivery and the zone, and an optional
// campaign of that product. The price shows as the server will freeze it.
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Button, ChoiceButton, Input, Notice, PhoneInput, Select } from '@/components/ui';
import { dialCodeFor } from '@/lib/tamani/countries';
import { BUYER_TYPE_LABELS, BUYER_TYPES } from '@/lib/tamani/labels';
import {
  ORDER_FIRST_NAME_MAX,
  emptyOrderForm,
  orderFormToBody,
  orderPricePreview,
  orderPriceText,
  submitOnce,
  type OrderBody,
  type OrderFormErrors,
  type OrderFormValues,
  type PricedProduct,
} from '@/lib/tamani/order-form';
import { frenchSpacing } from '@/lib/tamani/typography';
import { pluralizeUnit } from '@/lib/tamani/verdict-display';
import { cn } from '@/lib/utils';

export interface OrderProductChoice extends PricedProduct {
  id: string;
  name: string;
  unitLabel: string;
}

const FIELD_IDS: Record<keyof OrderFormErrors, string> = {
  productId: 'order-product',
  firstName: 'order-first-name',
  phone: 'order-phone',
  quantity: 'order-quantity',
};

function Choices({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-bold text-ink">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function OrderForm({
  products,
  campaigns,
  zones,
  country,
  initial,
  error,
  onSubmit,
  className,
}: {
  products: readonly OrderProductChoice[];
  campaigns: ReadonlyArray<{ id: string; title: string; productId: string }>;
  zones: ReadonlyArray<{ id: string; name: string }>;
  /** The shop's country: its dial code is shown before the number. */
  country: string;
  initial?: Partial<OrderFormValues>;
  error: string | null;
  /** True once the order is made (the page then moves on), false on a failure. */
  onSubmit: (body: OrderBody) => Promise<boolean>;
  className?: string | undefined;
}) {
  const [v, setV] = useState<OrderFormValues>(() => ({
    ...emptyOrderForm,
    // A shop with one product does not have to pick it.
    productId: products.length === 1 ? (products[0]?.id ?? '') : '',
    ...initial,
  }));
  const [errors, setErrors] = useState<OrderFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const notice = useRef<HTMLDivElement>(null);

  // The API error sits at the top; on a phone the button is far below it.
  useEffect(() => {
    if (error) notice.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [error]);

  const product = products.find((p) => p.id === v.productId) ?? null;
  const ownCampaigns = campaigns.filter((c) => c.productId === v.productId);
  const preview = orderPricePreview(product, v.buyerType, v.quantity);

  function set<K extends keyof OrderFormValues>(field: K, value: OrderFormValues[K]) {
    setV((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field as keyof OrderFormErrors];
      return next;
    });
  }

  function pickProduct(productId: string) {
    set('productId', productId);
    // A campaign of another product would be refused (404): it is let go.
    setV((current) =>
      campaigns.some((c) => c.id === current.campaignId && c.productId === productId)
        ? current
        : { ...current, campaignId: '' },
    );
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = orderFormToBody(v);
    if (!result.ok) {
      setErrors(result.errors);
      const first = (Object.keys(FIELD_IDS) as Array<keyof OrderFormErrors>).find(
        (f) => result.errors[f],
      );
      if (first) requestAnimationFrame(() => document.getElementById(FIELD_IDS[first])?.focus());
      return;
    }
    setErrors({});
    await submitOnce(() => onSubmit(result.body), setSubmitting);
  }

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
      <Select
        id={FIELD_IDS.productId}
        label="Produit"
        value={v.productId}
        error={errors.productId}
        onChange={(e) => pickProduct(e.target.value)}
        options={[
          { value: '', label: 'Choisis un produit' },
          ...products.map((p) => ({ value: p.id, label: p.name })),
        ]}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          id={FIELD_IDS.firstName}
          label="Prénom du client"
          autoComplete="off"
          maxLength={ORDER_FIRST_NAME_MAX}
          value={v.firstName}
          error={errors.firstName}
          onChange={(e) => set('firstName', e.target.value)}
        />
        <PhoneInput
          id={FIELD_IDS.phone}
          label="Son numéro WhatsApp"
          hint="Un numéro d'un autre pays s'écrit avec son indicatif."
          dialCode={dialCodeFor(country)}
          value={v.phone}
          error={errors.phone}
          onChange={(e) => set('phone', e.target.value)}
        />
      </div>

      <Choices legend="Type de client">
        {BUYER_TYPES.map((t) => (
          <ChoiceButton key={t} selected={v.buyerType === t} onClick={() => set('buyerType', t)}>
            {BUYER_TYPE_LABELS[t]}
          </ChoiceButton>
        ))}
      </Choices>

      <div className="flex flex-col gap-3">
        <Input
          id={FIELD_IDS.quantity}
          label="Quantité"
          hint={product ? `En ${pluralizeUnit(product.unitLabel, 2)}.` : undefined}
          inputMode="numeric"
          value={v.quantity}
          error={errors.quantity}
          onChange={(e) => set('quantity', e.target.value)}
        />
        {preview && (
          <div aria-live="polite">
            <p className="font-hand text-xl text-primary">
              {frenchSpacing(orderPriceText(preview))}
            </p>
            {preview.wholesaleFrom !== null && product && (
              <p className="text-sm text-ink-soft">
                Prix de gros à partir de {preview.wholesaleFrom}{' '}
                {pluralizeUnit(product.unitLabel, preview.wholesaleFrom)}.
              </p>
            )}
          </div>
        )}
      </div>

      <Choices legend="Retrait ou livraison">
        <ChoiceButton
          selected={v.fulfillment === 'PICKUP'}
          onClick={() => set('fulfillment', 'PICKUP')}
        >
          Retrait à la boutique
        </ChoiceButton>
        <ChoiceButton
          selected={v.fulfillment === 'DELIVERY'}
          onClick={() => set('fulfillment', 'DELIVERY')}
        >
          Livraison
        </ChoiceButton>
      </Choices>
      {v.fulfillment === 'DELIVERY' &&
        (zones.length > 0 ? (
          <Select
            id="order-zone"
            label="Quartier"
            value={v.zoneId}
            onChange={(e) => set('zoneId', e.target.value)}
            options={[
              { value: '', label: 'Sans quartier' },
              ...zones.map((z) => ({ value: z.id, label: z.name })),
            ]}
          />
        ) : (
          <p className="text-sm text-ink-soft">
            Tes quartiers de livraison s&apos;ajoutent dans{' '}
            <Link href="/app/reglages" className="font-bold text-primary underline">
              Réglages
            </Link>
            .
          </p>
        ))}

      {ownCampaigns.length > 0 && (
        <Select
          id="order-campaign"
          label="Campagne (facultatif)"
          value={v.campaignId}
          onChange={(e) => set('campaignId', e.target.value)}
          options={[
            { value: '', label: 'Aucune' },
            ...ownCampaigns.map((c) => ({ value: c.id, label: c.title })),
          ]}
        />
      )}

      <Button type="submit" size="lg" className="self-start" disabled={submitting}>
        {submitting ? 'Création…' : 'Créer la commande'}
      </Button>
    </form>
  );
}
