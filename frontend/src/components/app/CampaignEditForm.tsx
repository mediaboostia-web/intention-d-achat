'use client';

// The "Modifier" tab of a campaign: what can change once it is shared.
// The product and its availability stay as launched.
import { useState, type FormEvent } from 'react';
import { Button, Input, Notice, Switch, Textarea } from '@/components/ui';
import { previewMessage, type ShopCampaign } from '@/lib/tamani/campaign-view';
import { parseCount } from '@/lib/tamani/fcfa-input';
import { optionStockFromForm, optionStockToForm, type OptionStock } from '@/lib/tamani/stock';
import { cn } from '@/lib/utils';
import { OptionStockFields } from './OptionStockFields';
import { WhatsAppBubble } from './ShareCard';

export interface CampaignPatchBody {
  title: string;
  endsAt: string | null;
  stockQuantity: number | null;
  plannedQuantity: number | null;
  showStock: boolean;
  deliveryEnabled: boolean;
  shippingEnabled: boolean;
  optionStock: OptionStock[] | null;
  showLiveCounter: boolean;
  shareTemplate: string;
}

type Errors = Partial<Record<'title' | 'stock' | 'planned' | 'optionStock' | 'message', string>>;

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const count = (n: number | null) => (n === null ? '' : String(n));
const COUNT_HINT = 'Écris un nombre entier, par exemple 120.';

export function CampaignEditForm({
  campaign,
  currency,
  onSave,
  error,
  className,
}: {
  campaign: ShopCampaign;
  /** The shop's currency (lot 7b). */
  currency: string;
  onSave: (body: CampaignPatchBody) => Promise<void>;
  error?: string | null | undefined;
  className?: string | undefined;
}) {
  const [title, setTitle] = useState(campaign.title);
  const [ends, setEnds] = useState(day(campaign.endsAt));
  const [stock, setStock] = useState(count(campaign.stockQuantity));
  const [planned, setPlanned] = useState(count(campaign.plannedQuantity));
  const [showStock, setShowStock] = useState(campaign.showStock);
  const [delivery, setDelivery] = useState(campaign.deliveryEnabled);
  const [shipping, setShipping] = useState(campaign.shippingEnabled);
  const options = campaign.product.options;
  const inStock = campaign.availability === 'IN_STOCK';
  const [optionCounts, setOptionCounts] = useState(() =>
    optionStockToForm(options, campaign.optionStock),
  );
  const [counter, setCounter] = useState(campaign.showLiveCounter);
  const [message, setMessage] = useState(campaign.shareTemplate);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const now = new Date();
  const hasStock =
    options.length > 0
      ? inStock && Object.values(optionCounts).some((c) => c.trim() !== '')
      : stock.trim() !== '';

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found: Errors = {};
    if (!title.trim()) found.title = 'Donne un titre à ta campagne.';
    const typed = optionStockFromForm(options, optionCounts);
    if (!typed.ok) found.optionStock = `${typed.option} : ${COUNT_HINT}`;
    const optionStock = typed.ok ? typed.stock : null;
    // With counts per option, their sum is the stock (or the plan when incoming).
    const sum = optionStock ? optionStock.reduce((total, o) => total + o.count, 0) : null;
    const stockQuantity =
      options.length > 0
        ? inStock
          ? sum
          : null
        : stock.trim() === ''
          ? null
          : parseCount(stock, 0);
    if (options.length === 0 && stock.trim() !== '' && stockQuantity === null)
      found.stock = COUNT_HINT;
    const plannedQuantity =
      options.length > 0 && !inStock
        ? sum || null
        : planned.trim() === ''
          ? null
          : parseCount(planned, 1);
    if (planned.trim() !== '' && plannedQuantity === null) found.planned = COUNT_HINT;
    if (!message.trim()) found.message = 'Écris le message à partager.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        // Noon UTC keeps the chosen day whatever the reader's time zone.
        endsAt: ends ? new Date(`${ends}T12:00:00.000Z`).toISOString() : null,
        stockQuantity,
        plannedQuantity,
        showStock: showStock && stockQuantity !== null,
        deliveryEnabled: delivery,
        shippingEnabled: shipping,
        optionStock,
        showLiveCounter: counter,
        shareTemplate: message.trim(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      noValidate
      className={cn('flex flex-col gap-6', className)}
    >
      <Input
        id="edit-title"
        label="Titre"
        maxLength={80}
        value={title}
        error={errors.title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Input
        id="edit-ends"
        type="date"
        label="Fin des réponses"
        hint="Laisse vide pour ne pas fixer de fin."
        value={ends}
        onChange={(e) => setEnds(e.target.value)}
      />
      {options.length > 0 && (
        <OptionStockFields
          idPrefix="edit-option-stock"
          optionLabel={campaign.product.optionLabel}
          options={options}
          values={optionCounts}
          onChange={setOptionCounts}
          inStock={inStock}
          error={errors.optionStock}
        />
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        {options.length === 0 && (
          <Input
            id="edit-stock"
            label="Stock (facultatif)"
            inputMode="numeric"
            value={stock}
            error={errors.stock}
            onChange={(e) => setStock(e.target.value)}
          />
        )}
        {(options.length === 0 || inStock) && (
          <Input
            id="edit-planned"
            label="Quantité prévue (facultatif)"
            inputMode="numeric"
            value={planned}
            error={errors.planned}
            onChange={(e) => setPlanned(e.target.value)}
          />
        )}
      </div>
      <Switch
        id="edit-show-stock"
        label="Montrer le stock à tes clients"
        checked={showStock && hasStock}
        disabled={!hasStock}
        onChange={setShowStock}
      />
      <Switch id="edit-delivery" label="Je livre" checked={delivery} onChange={setDelivery} />
      <Switch
        id="edit-shipping"
        label="J'expédie aussi"
        hint="Dans une autre ville ou un autre pays. Le client écrit sa ville et son pays."
        checked={shipping}
        onChange={setShipping}
      />
      <Switch
        id="edit-counter"
        label="Afficher le nombre d'intéressés"
        checked={counter}
        onChange={setCounter}
      />
      <Textarea
        id="edit-message"
        label="Message à partager"
        hint="{produit}, {prix}, {disponibilite} et {lien} sont remplacés par ceux de ta campagne."
        rows={4}
        maxLength={1000}
        value={message}
        error={errors.message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <div>
        <p className="font-hand text-lg text-ink-muted">Aperçu</p>
        <WhatsAppBubble
          className="mt-2"
          text={previewMessage(
            message,
            campaign.product,
            {
              availability: campaign.availability,
              availableAt: campaign.availableAt ? new Date(campaign.availableAt) : null,
            },
            now,
            currency,
            campaign.defaultLink?.url,
          )}
        />
      </div>
      {error && <Notice tone="danger">{error}</Notice>}
      <Button type="submit" size="lg" disabled={saving} className="w-full shadow-press">
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  );
}
