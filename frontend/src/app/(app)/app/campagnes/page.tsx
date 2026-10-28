'use client';

// /app/campagnes: every campaign, newest first, searched by name and
// filtered by effective status. As on WhatsApp, a chip shows only when it
// has campaigns to show, and the "+" creates one on a phone.
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchField } from '@/components/app/SearchField';
import { useListLayout } from '@/components/app/use-list-layout';
import { useShop } from '@/components/app/ShopProvider';
import {
  Button,
  CampaignCard,
  EmptyState,
  Fab,
  FilterBar,
  LayoutSwitch,
  Notice,
  PageHeader,
  type IconName,
} from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import { cn } from '@/lib/utils';
import type { CampaignStatus } from '@/lib/tamani/campaign-actions';
import type { ShopCampaign } from '@/lib/tamani/campaign-view';

const FILTERS: ReadonlyArray<{ status: CampaignStatus | null; label: string; icon?: IconName }> = [
  // The default view comes first: a phone shows the start of the strip.
  { status: null, label: 'Toutes' },
  { status: 'ACTIVE', label: 'En cours', icon: 'megaphone' },
  { status: 'DRAFT', label: 'Brouillons', icon: 'pencil' },
  { status: 'CLOSED', label: 'Terminées', icon: 'stop' },
  { status: 'ARRIVED', label: 'Arrivées', icon: 'truck' },
];

type Counts = { all: number } & Record<CampaignStatus, number>;

interface Listing {
  items: ShopCampaign[];
  next: string | null;
  counts: Counts | null;
  loading: boolean;
  error: string | null;
}

const EMPTY: Listing = { items: [], next: null, counts: null, loading: true, error: null };

function CampaignList() {
  const { shop } = useShop();
  const params = useSearchParams();
  const raw = params.get('statut');
  const q = (params.get('q') ?? '').trim();
  // An unknown or empty ?statut= means "Toutes": the API refuses an empty status.
  const status = FILTERS.find((f) => f.status !== null && f.status === raw)?.status ?? null;
  const [list, setList] = useState<Listing>(EMPTY);
  const [layout, setLayout] = useListLayout('campagnes');

  const load = useCallback(
    async (cursor: string | null, keep: ShopCampaign[]) => {
      setList((l) => ({ ...l, loading: true, error: null }));
      const query = new URLSearchParams();
      if (status) query.set('status', status);
      if (q) query.set('q', q);
      if (cursor) query.set('cursor', cursor);
      const qs = query.toString();
      try {
        const page = await api<{
          items: ShopCampaign[];
          nextCursor: string | null;
          counts: Counts | null;
        }>(`/api/shops/${shop.id}/campaigns${qs ? `?${qs}` : ''}`);
        setList((l) => ({
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
    [shop.id, status, q],
  );

  useEffect(() => {
    setList((l) => ({ ...EMPTY, counts: l.counts }));
    void load(null, []);
  }, [load]);

  const empty = !list.loading && !list.error && list.items.length === 0;
  const now = new Date();
  const href = (s: CampaignStatus | null) => {
    const next = new URLSearchParams();
    if (s) next.set('statut', s);
    if (q) next.set('q', q);
    const qs = next.toString();
    return qs ? `/app/campagnes?${qs}` : '/app/campagnes';
  };

  return (
    <>
      <PageHeader
        title="Campagnes"
        action={
          <Button href="/app/campagnes/nouvelle" className="hidden shadow-press lg:inline-flex">
            Créer une campagne
          </Button>
        }
      />
      <div className="mt-6">
        <SearchField placeholder="Rechercher une campagne" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <FilterBar
          className="min-w-0 flex-1"
          label="Afficher"
          items={FILTERS.map((f) => ({
            id: f.status ?? 'all',
            label: f.label,
            href: href(f.status),
            active: f.status === status,
            // Until the counts arrive, only "Toutes" and the open chip show.
            ...(f.status ? { count: list.counts?.[f.status] ?? 0 } : {}),
            ...(f.icon ? { icon: f.icon } : {}),
          }))}
        />
        <LayoutSwitch value={layout} onChange={setLayout} />
      </div>

      {list.items.length > 0 && (
        <ul
          className={cn(
            'mt-6',
            layout === 'card'
              ? 'grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:gap-4'
              : 'frame divide-y-2 divide-grid overflow-hidden rounded-card bg-surface',
          )}
        >
          {list.items.map((c) => (
            <li key={c.id} className="min-w-0">
              <CampaignCard
                campaign={c}
                layout={layout}
                now={now}
                href={`/app/campagnes/${c.id}`}
              />
            </li>
          ))}
        </ul>
      )}

      {list.loading && (
        <div
          aria-hidden="true"
          className="mt-6 grid gap-3 motion-safe:animate-pulse sm:grid-cols-2"
        >
          <span className="h-[94px] rounded-card bg-grid/70" />
          <span className="h-[94px] rounded-card bg-grid/70" />
        </div>
      )}

      {list.error && (
        <Notice
          tone="danger"
          className="mt-6"
          action={
            <Button variant="secondary" onClick={() => void load(null, [])}>
              Réessayer
            </Button>
          }
        >
          {list.error}
        </Notice>
      )}

      {empty && status === null && !q && (
        <EmptyState
          className="mt-6"
          title="Lance ta première campagne"
          action={<Button href="/app/campagnes/nouvelle">Créer une campagne</Button>}
        >
          Choisis un produit, partage le lien sur WhatsApp : ta communauté te dit combien en
          commander.
        </EmptyState>
      )}
      {empty && q && <p className="mt-6 text-ink-soft">Aucune campagne ne correspond à « {q} ».</p>}
      {empty && !q && status !== null && <p className="mt-6 text-ink-soft">Aucune campagne ici.</p>}

      {list.next && !list.loading && (
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => void load(list.next, list.items)}
        >
          Voir plus
        </Button>
      )}
      <Fab href="/app/campagnes/nouvelle" label="Créer une campagne" />
    </>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={null}>
      <CampaignList />
    </Suspense>
  );
}
