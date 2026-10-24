'use client';

// /app/campagnes: every campaign, newest first, filtered by effective status.
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useShop } from '@/components/app/ShopProvider';
import { Button, CampaignCard, EmptyState, FilterBar, Notice, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import type { CampaignStatus } from '@/lib/tamani/campaign-actions';
import type { ShopCampaign } from '@/lib/tamani/campaign-view';

const FILTERS: ReadonlyArray<{ status: CampaignStatus | null; label: string }> = [
  { status: 'ACTIVE', label: 'En cours' },
  { status: 'DRAFT', label: 'Brouillons' },
  { status: 'CLOSED', label: 'Terminées' },
  { status: 'ARRIVED', label: 'Arrivées' },
  { status: null, label: 'Toutes' },
];

interface Listing {
  items: ShopCampaign[];
  next: string | null;
  loading: boolean;
  error: string | null;
}

function CampaignList() {
  const { shop } = useShop();
  const raw = useSearchParams().get('statut');
  // An unknown or empty ?statut= means "Toutes": the API refuses an empty status.
  const status = FILTERS.find((f) => f.status !== null && f.status === raw)?.status ?? null;
  const [list, setList] = useState<Listing>({ items: [], next: null, loading: true, error: null });

  const load = useCallback(
    async (cursor: string | null, keep: ShopCampaign[]) => {
      setList((l) => ({ ...l, loading: true, error: null }));
      const q = new URLSearchParams();
      if (status) q.set('status', status);
      if (cursor) q.set('cursor', cursor);
      const qs = q.toString();
      try {
        const page = await api<{ items: ShopCampaign[]; nextCursor: string | null }>(
          `/api/shops/${shop.id}/campaigns${qs ? `?${qs}` : ''}`,
        );
        setList({
          items: [...keep, ...page.items],
          next: page.nextCursor,
          loading: false,
          error: null,
        });
      } catch (err) {
        setList((l) => ({ ...l, loading: false, error: errorMessage(err) }));
      }
    },
    [shop.id, status],
  );

  useEffect(() => {
    setList({ items: [], next: null, loading: true, error: null });
    void load(null, []);
  }, [load]);

  const empty = !list.loading && !list.error && list.items.length === 0;
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Campagnes"
        action={
          <Button href="/app/campagnes/nouvelle" className="shadow-press">
            Créer une campagne
          </Button>
        }
      />
      <FilterBar
        className="mt-6"
        label="Afficher"
        items={FILTERS.map((f) => ({
          id: f.status ?? 'all',
          label: f.label,
          href: f.status ? `/app/campagnes?statut=${f.status}` : '/app/campagnes',
          active: f.status === status,
        }))}
      />

      {list.items.length > 0 && (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {list.items.map((c) => (
            <li key={c.id}>
              <CampaignCard
                campaign={c}
                now={now}
                href={`/app/campagnes/${c.id}`}
                className="h-full"
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

      {empty && status === null && (
        <EmptyState
          className="mt-6"
          title="Lance ta première campagne"
          action={<Button href="/app/campagnes/nouvelle">Créer une campagne</Button>}
        >
          Choisis un produit, partage le lien sur WhatsApp : ta communauté te dit combien en
          commander.
        </EmptyState>
      )}
      {empty && status !== null && <p className="mt-6 text-ink-soft">Aucune campagne ici.</p>}

      {list.next && !list.loading && (
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => void load(list.next, list.items)}
        >
          Voir plus
        </Button>
      )}
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
