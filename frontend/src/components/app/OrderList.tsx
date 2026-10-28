'use client';

// /app/commandes (lot 7, spec §5.5.1): every order, newest first, filtered
// by status (with the shop's counts), campaign and product, all kept in the
// address; or « À livrer par quartier », the confirmed deliveries grouped by
// zone with the pieces to prepare per product, for the rounds. On Free the
// numbers come masked from the server. OrdersScreen loads; OrderListView
// draws from its props.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Fab,
  FilterBar,
  Icon,
  Notice,
  PageHeader,
  Select,
  Tabs,
} from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import {
  NO_ORDER_FILTERS,
  ORDER_STATUSES,
  orderSearch,
  orderStatusLabel,
  parseOrderSearch,
  productQuantity,
  type OrderFilters,
  type OrderRow,
  type OrderStatus,
  type ToDeliverGroup,
} from '@/lib/tamani/orders-view';
import { formatPrice } from '@/lib/utils';
import { clientName } from './ClientList';
import { useShop } from './ShopProvider';

export type OrderCounts = Record<OrderStatus, number>;

export interface OrderChoices {
  campaigns: ReadonlyArray<{ id: string; title: string }>;
  products: ReadonlyArray<{ id: string; name: string }>;
}

const NEW_ORDER = '/app/commandes/nouvelle';

const STATUS_TONES = {
  TO_CONFIRM: 'warning',
  CONFIRMED: 'primary',
  FULFILLED: 'success',
  CANCELLED: 'neutral',
} as const satisfies Record<OrderStatus, string>;

const STATUS_CHIPS: Readonly<Record<OrderStatus, string>> = {
  TO_CONFIRM: 'À confirmer',
  CONFIRMED: 'Confirmées',
  FULFILLED: 'Livrées',
  CANCELLED: 'Annulées',
};

export function ordersHref(f: OrderFilters): string {
  const qs = orderSearch(f);
  return qs ? `/app/commandes?${qs}` : '/app/commandes';
}

export function OrderStatusBadge({ order }: { order: Pick<OrderRow, 'status' | 'fulfillment'> }) {
  return (
    <Badge tone={STATUS_TONES[order.status]}>
      {orderStatusLabel(order.status, order.fulfillment)}
    </Badge>
  );
}

export function PaidMark() {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-bold text-success">
      <Icon name="check" className="size-4" />
      Payé
    </span>
  );
}

export function OrderLine({ order }: { order: OrderRow }) {
  return (
    <li>
      <Link
        href={`/app/commandes/${order.id}`}
        className="flex min-h-18 items-center gap-3 px-4 py-3 hover:bg-bg"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-ink">
            {clientName(order.client.firstName)}
          </span>
          {order.client.phone && (
            <span className="block text-xs text-ink-muted">{order.client.phone}</span>
          )}
          <span className="block text-sm text-ink-soft">{productQuantity(order)}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-bold text-ink tabular-nums">
            {formatPrice(order.totalAmount, 'FCFA')}
          </span>
          <span className="flex flex-wrap items-center justify-end gap-2">
            {order.paid && <PaidMark />}
            <OrderStatusBadge order={order} />
          </span>
        </span>
      </Link>
    </li>
  );
}

export function OrderLines({ rows, label }: { rows: readonly OrderRow[]; label: string }) {
  return (
    <ul aria-label={label} className="divide-y-2 divide-grid">
      {rows.map((o) => (
        <OrderLine key={o.id} order={o} />
      ))}
    </ul>
  );
}

function ZoneCard({ group }: { group: ToDeliverGroup }) {
  const title = group.zoneName ?? 'Sans quartier';
  const n = group.orders.length;
  return (
    <Card as="section" className="overflow-hidden p-0">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-hand text-2xl font-bold break-words text-primary">{title}</h2>
          <span className="shrink-0 text-sm text-ink-muted">
            {n} commande{n > 1 ? 's' : ''}
          </span>
        </div>
        <ul aria-label={`À préparer pour ${title}`} className="mt-2 flex flex-col gap-1">
          {group.totals.map((t) => (
            <li key={t.productId} className="text-lg font-bold text-ink">
              {productQuantity(t)}
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t-2 border-grid">
        <OrderLines rows={group.orders} label={`Commandes à livrer, ${title}`} />
      </div>
    </Card>
  );
}

/** The selected id stays a choice even before the lists load. */
function withSelected(
  options: Array<{ value: string; label: string }>,
  selected: string | null,
  fallback: string,
) {
  if (!selected || options.some((o) => o.value === selected)) return options;
  return [...options, { value: selected, label: fallback }];
}

export function OrderListView({
  filters,
  rows,
  counts,
  groups,
  choices,
  loading,
  error,
  hasMore,
  onMore,
  onRetry,
  onFilter,
}: {
  filters: OrderFilters;
  rows: readonly OrderRow[];
  /** For the whole shop, from the first page; null until it arrives. */
  counts: OrderCounts | null;
  groups: readonly ToDeliverGroup[];
  choices: OrderChoices;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  onMore: () => void;
  onRetry: () => void;
  onFilter: (next: OrderFilters) => void;
}) {
  const toDeliver = filters.view === 'to-deliver';
  const filtered =
    filters.status !== null ||
    filters.campaignId !== null ||
    filters.productId !== null ||
    filters.zoneId !== null;
  const empty = !loading && !error && (toDeliver ? groups.length === 0 : rows.length === 0);
  const value = (e: { target: { value: string } }) => e.target.value || null;

  return (
    <>
      <PageHeader
        title="Commandes"
        action={
          <Button href={NEW_ORDER} className="hidden shadow-press lg:inline-flex">
            Nouvelle commande
          </Button>
        }
      />
      <Tabs
        className="mt-6"
        label="Vues des commandes"
        items={[
          {
            id: 'list',
            label: 'Toutes',
            href: ordersHref({ ...filters, view: 'list' }),
            active: !toDeliver,
          },
          {
            id: 'to-deliver',
            label: 'À livrer par quartier',
            href: ordersHref({ ...NO_ORDER_FILTERS, view: 'to-deliver' }),
            active: toDeliver,
          },
        ]}
      />

      {!toDeliver && (
        <div className="mt-5 flex flex-col gap-4">
          <FilterBar
            label="Statut"
            items={[
              {
                id: 'all',
                label: 'Toutes',
                href: ordersHref({ ...filters, status: null }),
                active: filters.status === null,
              },
              ...ORDER_STATUSES.map((s) => ({
                id: s,
                label: STATUS_CHIPS[s],
                href: ordersHref({ ...filters, status: s }),
                active: filters.status === s,
                count: counts?.[s] ?? 0,
              })),
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="orders-campaign"
              label="Campagne"
              value={filters.campaignId ?? ''}
              onChange={(e) => onFilter({ ...filters, campaignId: value(e) })}
              options={withSelected(
                [
                  { value: '', label: 'Toutes les campagnes' },
                  ...choices.campaigns.map((c) => ({ value: c.id, label: c.title })),
                ],
                filters.campaignId,
                'Cette campagne',
              )}
            />
            <Select
              id="orders-product"
              label="Produit"
              value={filters.productId ?? ''}
              onChange={(e) => onFilter({ ...filters, productId: value(e) })}
              options={withSelected(
                [
                  { value: '', label: 'Tous les produits' },
                  ...choices.products.map((p) => ({ value: p.id, label: p.name })),
                ],
                filters.productId,
                'Ce produit',
              )}
            />
          </div>
        </div>
      )}

      {!toDeliver && rows.length > 0 && (
        <div className="frame mt-5 overflow-hidden rounded-card bg-surface">
          <OrderLines rows={rows} label="Commandes" />
        </div>
      )}
      {toDeliver && groups.length > 0 && (
        <div className="mt-5 flex flex-col gap-5">
          {groups.map((g) => (
            <ZoneCard key={g.zoneId ?? 'none'} group={g} />
          ))}
        </div>
      )}

      {loading && (
        <div aria-hidden="true" className="mt-5 flex flex-col gap-2 motion-safe:animate-pulse">
          <span className="h-[72px] rounded-card bg-grid/70" />
          <span className="h-[72px] rounded-card bg-grid/70" />
        </div>
      )}
      {error && (
        <Notice
          tone="danger"
          className="mt-6"
          action={
            <Button variant="secondary" onClick={onRetry}>
              Réessayer
            </Button>
          }
        >
          {error}
        </Notice>
      )}

      {empty && toDeliver && (
        <EmptyState className="mt-6" title="Rien à livrer pour le moment">
          Les commandes confirmées à livrer apparaissent ici, groupées par quartier, avec le total à
          préparer pour chaque produit.
        </EmptyState>
      )}
      {empty && !toDeliver && !filtered && (
        <EmptyState
          className="mt-6"
          title="Pas encore de commande"
          action={
            <Button href={NEW_ORDER} className="mt-2">
              Nouvelle commande
            </Button>
          }
        >
          Transforme un intéressé en commande depuis l&apos;onglet Intéressés d&apos;une campagne,
          ou crée-la ici.
        </EmptyState>
      )}
      {empty && !toDeliver && filtered && (
        <p className="mt-6 text-ink-soft">Aucune commande avec ces filtres.</p>
      )}

      {!toDeliver && hasMore && !loading && (
        <Button variant="secondary" className="mt-6" onClick={onMore}>
          Voir plus
        </Button>
      )}
      <Fab href={NEW_ORDER} label="Nouvelle commande" />
    </>
  );
}

interface Listing {
  items: OrderRow[];
  groups: ToDeliverGroup[];
  next: string | null;
  counts: OrderCounts | null;
  loading: boolean;
  error: string | null;
}

const EMPTY: Listing = {
  items: [],
  groups: [],
  next: null,
  counts: null,
  loading: true,
  error: null,
};
const NO_CHOICES: OrderChoices = { campaigns: [], products: [] };

/** Reads the filters in the address, loads the page (or the zones) and the filter choices. */
export function OrdersScreen() {
  const { shop } = useShop();
  const params = useSearchParams();
  const router = useRouter();
  const search = params.toString();
  // An address the parser refuses shows every order, not an error.
  const filters = useMemo(
    () => parseOrderSearch(new URLSearchParams(search)) ?? NO_ORDER_FILTERS,
    [search],
  );
  const query = orderSearch(filters);
  const toDeliver = filters.view === 'to-deliver';
  const base = `/api/shops/${shop.id}/orders`;
  const [list, setList] = useState<Listing>(EMPTY);
  const [choices, setChoices] = useState<OrderChoices>(NO_CHOICES);

  const load = useCallback(
    async (cursor: string | null, keep: OrderRow[]) => {
      setList((l) => ({ ...l, loading: true, error: null }));
      const next = new URLSearchParams(query);
      if (cursor) next.set('cursor', cursor);
      const qs = next.toString();
      const url = qs ? `${base}?${qs}` : base;
      try {
        if (toDeliver) {
          const res = await api<{ groups: ToDeliverGroup[] }>(url);
          setList((l) => ({ ...l, groups: res.groups, loading: false, error: null }));
          return;
        }
        const page = await api<{
          items: OrderRow[];
          nextCursor: string | null;
          counts: OrderCounts | null;
        }>(url);
        setList((l) => ({
          ...l,
          items: [...keep, ...page.items],
          next: page.nextCursor,
          counts: page.counts ?? l.counts,
          loading: false,
          error: null,
        }));
      } catch (err) {
        setList((l) => ({ ...l, loading: false, error: errorMessage(err) }));
      }
    },
    [base, query, toDeliver],
  );

  useEffect(() => {
    setList((l) => ({ ...EMPTY, counts: l.counts }));
    void load(null, []);
  }, [load]);

  // The selects' campaigns and products (archived ones too: their orders stay).
  useEffect(() => {
    let live = true;
    Promise.all([
      api<{ items: Array<{ id: string; title: string }> }>(
        `/api/shops/${shop.id}/campaigns?limit=50`,
      ),
      api<{ items: Array<{ id: string; name: string }> }>(
        `/api/shops/${shop.id}/products?limit=50&archived=1`,
      ),
    ])
      .then(
        ([campaigns, products]) =>
          live &&
          setChoices({
            campaigns: campaigns.items.map(({ id, title }) => ({ id, title })),
            products: products.items.map(({ id, name }) => ({ id, name })),
          }),
      )
      .catch(() => live && setChoices(NO_CHOICES));
    return () => {
      live = false;
    };
  }, [shop.id]);

  return (
    <OrderListView
      filters={filters}
      rows={list.items}
      counts={list.counts}
      groups={list.groups}
      choices={choices}
      loading={list.loading}
      error={list.error}
      hasMore={list.next !== null}
      onMore={() => void load(list.next, list.items)}
      onRetry={() => void load(null, [])}
      onFilter={(next) => router.replace(ordersHref(next))}
    />
  );
}
