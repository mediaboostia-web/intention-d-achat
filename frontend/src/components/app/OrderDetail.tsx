'use client';

// /app/commandes/[id] (lot 7, spec §5.5.1): one order and its next moves
// (ORDER_TRANSITIONS; « Annuler » asks first), « payé » apart from the
// status, the price and the quantity editable until the order is confirmed,
// the note, and WhatsApp with the confirmation message (on Free, the plans).
// OrderScreen loads and saves; OrderDetailView draws from its props.
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Badge, Button, DataList, Icon, Input, Notice, Switch, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import { formatDateFr } from '@/lib/tamani/dates';
import { parseCount, parseFcfa } from '@/lib/tamani/fcfa-input';
import { BUYER_TYPE_LABELS } from '@/lib/tamani/labels';
import { ORDER_MAX_QUANTITY } from '@/lib/tamani/order-form';
import {
  fulfillmentText,
  orderActions,
  orderWhatsappMessage,
  productQuantity,
  type OrderRow,
  type OrderStatus,
} from '@/lib/tamani/orders-view';
import { frenchSpacing } from '@/lib/tamani/typography';
import { waChatLink } from '@/lib/tamani/wa';
import { formatPrice } from '@/lib/utils';
import { clientName } from './ClientList';
import { OrderStatusBadge, PaidMark } from './OrderList';
import { useShop } from './ShopProvider';

export interface OrderPatch {
  unitPrice?: number;
  quantity?: number;
  notes?: string | null;
}

const NOTE_MAX = 500;

/** Price and quantity, before confirmation only (the server refuses them after). */
function PriceEditor({
  order,
  busy,
  onSave,
}: {
  order: OrderRow;
  busy: boolean;
  onSave: (patch: OrderPatch) => Promise<void>;
}) {
  const [price, setPrice] = useState(formatPrice(order.unitPrice));
  const [quantity, setQuantity] = useState(String(order.quantity));
  const [errors, setErrors] = useState<{ price?: string; quantity?: string }>({});
  const unitPrice = parseFcfa(price);
  const parsedQty = parseCount(quantity, 1);
  const qty = parsedQty !== null && parsedQty <= ORDER_MAX_QUANTITY ? parsedQty : null;
  const changed =
    (unitPrice !== null && unitPrice !== order.unitPrice) ||
    (qty !== null && qty !== order.quantity);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (unitPrice === null || qty === null) {
      setErrors({
        ...(unitPrice === null && { price: 'Écris un prix en FCFA, sans virgule.' }),
        ...(qty === null && { quantity: 'Écris une quantité entre 1 et 100 000.' }),
      });
      return;
    }
    setErrors({});
    await onSave({
      ...(unitPrice !== order.unitPrice && { unitPrice }),
      ...(qty !== order.quantity && { quantity: qty }),
    });
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      noValidate
      aria-labelledby="order-price-title"
      className="mt-8 flex flex-col gap-4"
    >
      <div>
        <h2 id="order-price-title" className="font-hand text-2xl font-bold text-primary">
          Prix et quantité
        </h2>
        <p className="text-sm text-ink-soft">Tu peux les corriger jusqu&apos;à la confirmation.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="order-unit-price"
          label="Prix à l'unité (FCFA)"
          inputMode="numeric"
          value={price}
          error={errors.price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <Input
          id="order-quantity"
          label="Quantité"
          inputMode="numeric"
          value={quantity}
          error={errors.quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>
      {changed && unitPrice !== null && qty !== null && (
        <p className="font-hand text-lg text-ink-muted">
          {frenchSpacing(
            `Nouveau total : ${qty} × ${formatPrice(unitPrice, 'FCFA')} = ${formatPrice(unitPrice * qty, 'FCFA')}`,
          )}
        </p>
      )}
      <Button type="submit" variant="secondary" className="self-start" disabled={busy || !changed}>
        Enregistrer
      </Button>
    </form>
  );
}

function NoteEditor({
  order,
  busy,
  onSave,
}: {
  order: OrderRow;
  busy: boolean;
  onSave: (patch: OrderPatch) => Promise<void>;
}) {
  const [note, setNote] = useState(order.notes ?? '');
  const changed = note.trim() !== (order.notes ?? '');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({ notes: note.trim() || null });
      }}
      className="mt-8 flex flex-col gap-3"
    >
      <Textarea
        id="order-notes"
        label="Note"
        hint="Visible par ta boutique seulement. L'adresse précise, un rappel…"
        rows={3}
        maxLength={NOTE_MAX}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button type="submit" variant="secondary" className="self-start" disabled={busy || !changed}>
        Enregistrer la note
      </Button>
    </form>
  );
}

export function OrderDetailView({
  order,
  shopName,
  now,
  busy,
  error,
  askingCancel,
  onMove,
  onAskCancel,
  onKeep,
  onPaid,
  onSave,
}: {
  order: OrderRow;
  shopName: string;
  now: Date;
  busy: boolean;
  error: string | null;
  /** « Annuler » was tapped once: the confirmation shows. */
  askingCancel: boolean;
  onMove: (to: OrderStatus) => void;
  onAskCancel: () => void;
  onKeep: () => void;
  onPaid: (paid: boolean) => void;
  onSave: (patch: OrderPatch) => Promise<void>;
}) {
  const { client } = order;
  const name = clientName(client.firstName);
  const actions = orderActions(order.status, order.fulfillment);
  const forward = actions.filter((a) => a.to !== 'CANCELLED');
  const cancellable = actions.some((a) => a.to === 'CANCELLED');
  // The prepared text says « est confirmée »: before that, or once cancelled,
  // WhatsApp opens without it.
  const message =
    order.status === 'CONFIRMED'
      ? orderWhatsappMessage({
          firstName: client.firstName,
          shopName,
          productName: order.productName,
          unitLabel: order.unitLabel,
          quantity: order.quantity,
          totalAmount: order.totalAmount,
          fulfillment: order.fulfillment,
          zoneName: order.zoneName,
        })
      : undefined;

  return (
    <>
      <Link
        href="/app/commandes"
        className="inline-flex min-h-12 items-center gap-1 font-bold text-primary hover:underline"
      >
        <Icon name="chevron-left" className="size-5" />
        Commandes
      </Link>
      <header className="mt-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-hand text-3xl leading-tight font-bold break-words text-primary">
            {client.phone ? (
              <Link href={`/app/clients/${client.id}`} className="hover:underline">
                {name}
              </Link>
            ) : (
              name
            )}
          </h1>
          <OrderStatusBadge order={order} />
          {order.paid && <PaidMark />}
        </div>
        {client.phone && <p className="mt-1 text-ink-soft">{client.phone}</p>}
        <p className="text-sm text-ink-muted">
          Commande du {formatDateFr(new Date(order.createdAt), now)}
        </p>
      </header>

      <div className="mt-6">
        <p className="font-sign text-4xl leading-tight text-ink">
          {formatPrice(order.totalAmount, 'FCFA')}
        </p>
        <p className="mt-1 text-ink-soft">{productQuantity(order)}</p>
        <p className="font-hand text-lg text-ink-muted">
          {order.quantity} × {formatPrice(order.unitPrice, 'FCFA')}
        </p>
      </div>

      {error && (
        <Notice tone="danger" className="mt-6">
          {error}
        </Notice>
      )}

      {(forward.length > 0 || (cancellable && !askingCancel)) && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {forward.map((a) => (
            <Button key={a.to} disabled={busy} onClick={() => onMove(a.to)}>
              {a.label}
            </Button>
          ))}
          {cancellable && !askingCancel && (
            <Button variant="ghost" disabled={busy} onClick={onAskCancel}>
              Annuler
            </Button>
          )}
        </div>
      )}
      {cancellable && askingCancel && (
        <Notice
          tone="warning"
          className="mt-4"
          title={frenchSpacing('Annuler cette commande ?')}
          action={
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" disabled={busy} onClick={() => onMove('CANCELLED')}>
                Oui, annuler la commande
              </Button>
              <Button variant="ghost" disabled={busy} onClick={onKeep}>
                Garder la commande
              </Button>
            </div>
          }
        >
          C&apos;est définitif&nbsp;: elle reste dans ta liste, marquée « Annulée », et ne pourra
          plus être confirmée ni livrée.
        </Notice>
      )}

      <div className="mt-6">
        {client.phoneE164 ? (
          <Button
            variant="whatsapp"
            href={waChatLink(client.phoneE164, message)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Écrire sur WhatsApp
          </Button>
        ) : (
          client.phone && (
            <Button href="/app/plus#forfait" variant="secondary">
              Écrire sur WhatsApp
              <Badge tone="accent">Pro</Badge>
            </Button>
          )
        )}
      </div>

      <DataList
        className="mt-6"
        items={[
          { id: 'buyer', label: 'Type de client', value: BUYER_TYPE_LABELS[order.buyerType] },
          {
            id: 'where',
            label: 'Remise',
            value: fulfillmentText(order.fulfillment, order.zoneName),
          },
          {
            id: 'campaign',
            label: 'Campagne',
            value: order.campaignId ? (
              <Link href={`/app/campagnes/${order.campaignId}`} className="hover:underline">
                {order.campaignTitle ?? 'Voir la campagne'}
              </Link>
            ) : (
              'Aucune'
            ),
          },
        ]}
      />

      <Switch
        id="order-paid"
        className="mt-6"
        label="Payé"
        hint={
          order.paid && order.paidAt
            ? `Payé le ${formatDateFr(new Date(order.paidAt), now)}`
            : 'Pas encore payé.'
        }
        checked={order.paid}
        disabled={busy}
        onChange={(on) => onPaid(on)}
      />

      {order.status === 'TO_CONFIRM' && (
        <PriceEditor
          key={`${order.unitPrice}:${order.quantity}`}
          order={order}
          busy={busy}
          onSave={onSave}
        />
      )}
      <NoteEditor key={order.notes ?? ''} order={order} busy={busy} onSave={onSave} />
    </>
  );
}

/** Loads one order and sends each change (PATCH), then shows the order the server returns. */
export function OrderScreen({ id }: { id: string }) {
  const { shop } = useShop();
  const path = `/api/shops/${shop.id}/orders/${encodeURIComponent(id)}`;
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [askingCancel, setAskingCancel] = useState(false);

  useEffect(() => {
    let live = true;
    api<{ order: OrderRow }>(path)
      .then((res) => live && setOrder(res.order))
      .catch((err: unknown) => live && setLoadError(errorMessage(err)));
    return () => {
      live = false;
    };
  }, [path]);

  async function send(body: OrderPatch | { status: OrderStatus } | { paid: boolean }) {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ order: OrderRow }>(path, { method: 'PATCH', body });
      setOrder(res.order);
      setAskingCancel(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <Notice
        tone="danger"
        action={
          <Button href="/app/commandes" variant="secondary">
            Retour aux commandes
          </Button>
        }
      >
        {loadError}
      </Notice>
    );
  }
  if (!order) {
    return (
      <div role="status" aria-label="Chargement de la commande">
        <div aria-hidden="true" className="flex flex-col gap-4 motion-safe:animate-pulse">
          <span className="h-12 w-2/3 rounded-card bg-grid/70" />
          <span className="h-14 w-48 rounded-card bg-grid/70" />
          <span className="h-40 rounded-card bg-grid/70" />
        </div>
      </div>
    );
  }
  return (
    <OrderDetailView
      order={order}
      shopName={shop.name}
      now={new Date()}
      busy={busy}
      error={error}
      askingCancel={askingCancel}
      onMove={(status) => void send({ status })}
      onAskCancel={() => setAskingCancel(true)}
      onKeep={() => setAskingCancel(false)}
      onPaid={(paid) => void send({ paid })}
      onSave={send}
    />
  );
}
