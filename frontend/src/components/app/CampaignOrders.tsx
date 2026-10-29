'use client';

// The Commandes tab of a campaign (lot 7, spec §5.5.1): the stock left, the
// quantities confirmed, delivered and to confirm, then the campaign's
// orders, newest first. The stock left is a display, never a block: past
// the stock it reads 0 and says by how much. On Free the numbers come
// masked from the server. CampaignOrdersTab loads; CampaignOrdersView draws.
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, DataList, EmptyState, Notice } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import { NO_ORDER_FILTERS, type OrderRow } from '@/lib/tamani/orders-view';
import {
  orderQuantityRows,
  stockLeftDisplay,
  type CampaignOrderSummary,
  type CampaignOrdersPage,
} from '@/lib/tamani/results-view';
import { OrderLines, ordersHref } from './OrderList';

export function campaignOrdersPath(shopId: string, campaignId: string, cursor: string | null) {
  const path = `/api/shops/${shopId}/campaigns/${encodeURIComponent(campaignId)}/orders`;
  return cursor ? `${path}?cursor=${encodeURIComponent(cursor)}` : path;
}

function StockLeft({
  summary,
  unitLabel,
}: {
  summary: CampaignOrderSummary & { stockLeft: number };
  unitLabel: string;
}) {
  const d = stockLeftDisplay(summary, unitLabel);
  return (
    <Card as="section" className="flex flex-col gap-1">
      <h2 className="text-sm font-bold text-ink-soft">Stock restant&nbsp;:</h2>
      <p className="flex items-baseline gap-2">
        <span className="font-sign text-5xl text-primary">{d.figure}</span>
        <span className="text-lg font-bold text-ink">{d.unit}</span>
      </p>
      <p className="font-hand text-lg leading-snug text-ink-muted">{d.calc}</p>
      {d.over && <p className="font-bold text-warning">{d.over}</p>}
    </Card>
  );
}

export function CampaignOrdersView({
  campaignId,
  unitLabel,
  summary,
  rows,
  hasMore,
  loading,
  error,
  onMore,
  onRetry,
}: {
  campaignId: string;
  unitLabel: string;
  summary: CampaignOrderSummary;
  rows: readonly OrderRow[];
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  onMore: () => void;
  onRetry: () => void;
}) {
  const { stockLeft } = summary;
  const ordered = summary.confirmed + summary.fulfilled + summary.toConfirm > 0;
  const empty = !loading && !error && rows.length === 0;

  return (
    <div className="flex flex-col gap-5">
      {stockLeft !== null && (
        <StockLeft summary={{ ...summary, stockLeft }} unitLabel={unitLabel} />
      )}
      {ordered && (
        <DataList
          className="frame rounded-card bg-surface px-4 py-2"
          items={orderQuantityRows(summary, unitLabel)}
        />
      )}

      {rows.length > 0 && (
        <div className="frame overflow-hidden rounded-card bg-surface">
          <OrderLines rows={rows} label="Commandes de la campagne" />
        </div>
      )}

      {loading && (
        <div aria-hidden="true" className="flex flex-col gap-2 motion-safe:animate-pulse">
          <span className="h-[72px] rounded-card bg-grid/70" />
          <span className="h-[72px] rounded-card bg-grid/70" />
        </div>
      )}
      {error && (
        <Notice
          tone="danger"
          action={
            <Button variant="secondary" onClick={onRetry}>
              Réessayer
            </Button>
          }
        >
          {error}
        </Notice>
      )}

      {empty && (
        <EmptyState
          title="Pas encore de commande pour cette campagne"
          action={
            <Button
              href={`/app/campagnes/${campaignId}?onglet=interesses`}
              variant="secondary"
              className="mt-2"
            >
              Voir les intéressés
            </Button>
          }
        >
          Transforme un intéressé en commande depuis l&apos;onglet Intéressés : elle apparaîtra ici,
          face à ton stock.
        </EmptyState>
      )}

      {hasMore && !loading && (
        <Button variant="secondary" onClick={onMore}>
          Voir plus
        </Button>
      )}
      {rows.length > 0 && (
        <Button
          href={ordersHref({ ...NO_ORDER_FILTERS, campaignId })}
          variant="ghost"
          className="self-start"
        >
          Voir dans Commandes
        </Button>
      )}
    </div>
  );
}

interface Listing {
  items: OrderRow[];
  next: string | null;
  summary: CampaignOrderSummary | null;
  loading: boolean;
  error: string | null;
}

const EMPTY: Listing = { items: [], next: null, summary: null, loading: true, error: null };

/** Loads the campaign's orders page by page; each page brings the summary again. */
export function CampaignOrdersTab({
  shopId,
  campaignId,
  unitLabel,
}: {
  shopId: string;
  campaignId: string;
  unitLabel: string;
}) {
  const [list, setList] = useState<Listing>(EMPTY);

  const load = useCallback(
    async (cursor: string | null, keep: OrderRow[]) => {
      setList((l) => ({ ...l, loading: true, error: null }));
      try {
        const page = await api<CampaignOrdersPage>(campaignOrdersPath(shopId, campaignId, cursor));
        setList({
          items: [...keep, ...page.items],
          next: page.nextCursor,
          summary: page.summary,
          loading: false,
          error: null,
        });
      } catch (err) {
        setList((l) => ({ ...l, loading: false, error: errorMessage(err) }));
      }
    },
    [shopId, campaignId],
  );

  useEffect(() => {
    setList(EMPTY);
    void load(null, []);
  }, [load]);

  if (!list.summary) {
    if (list.error) {
      return (
        <Notice
          tone="danger"
          action={
            <Button variant="secondary" onClick={() => void load(null, [])}>
              Réessayer
            </Button>
          }
        >
          {list.error}
        </Notice>
      );
    }
    return (
      <div role="status" className="flex flex-col gap-4 motion-safe:animate-pulse">
        <span className="sr-only">Chargement des commandes…</span>
        <span aria-hidden="true" className="h-32 rounded-card bg-grid/70" />
        <span aria-hidden="true" className="h-[72px] rounded-card bg-grid/70" />
      </div>
    );
  }
  return (
    <CampaignOrdersView
      campaignId={campaignId}
      unitLabel={unitLabel}
      summary={list.summary}
      rows={list.items}
      hasMore={list.next !== null}
      loading={list.loading}
      error={list.error}
      onMore={() => void load(list.next, list.items)}
      onRetry={() => void load(null, [])}
    />
  );
}
