'use client';

// /app/produits: the catalogue, newest first, searched by name. "En
// campagne" keeps the products with an open campaign; "Archivés" lists
// those taken out of sale (kept because past campaigns point to them).
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchField } from '@/components/app/SearchField';
import { useListLayout } from '@/components/app/use-list-layout';
import { useShop } from '@/components/app/ShopProvider';
import {
  Button,
  EmptyState,
  Fab,
  FilterBar,
  LayoutSwitch,
  Notice,
  PageHeader,
  ProductCard,
} from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import { cn } from '@/lib/utils';
import type { ShopProduct } from '@/lib/tamani/product-form';

type View = 'sale' | 'campaign' | 'archived';
type Counts = Record<View, number>;

const VIEWS: Record<string, View> = { campagne: 'campaign', archives: 'archived' };

interface Listing {
  items: ShopProduct[];
  next: string | null;
  counts: Counts | null;
  loading: boolean;
  error: string | null;
}

const EMPTY: Listing = { items: [], next: null, counts: null, loading: true, error: null };

function ProductList() {
  const { shop } = useShop();
  const params = useSearchParams();
  const view: View = VIEWS[params.get('vue') ?? ''] ?? 'sale';
  const q = (params.get('q') ?? '').trim();
  const [list, setList] = useState<Listing>(EMPTY);
  const [layout, setLayout] = useListLayout('produits');

  const fetchPage = useCallback(
    (cursor: string | null) => {
      const query = new URLSearchParams();
      // ?archived=1 returns every product; the "Archivés" view keeps the archived ones.
      if (view === 'archived') query.set('archived', '1');
      if (view === 'campaign') query.set('inCampaign', '1');
      if (q) query.set('q', q);
      if (cursor) query.set('cursor', cursor);
      const qs = query.toString();
      return api<{ items: ShopProduct[]; nextCursor: string | null; counts: Counts | null }>(
        `/api/shops/${shop.id}/products${qs ? `?${qs}` : ''}`,
      );
    },
    [shop.id, view, q],
  );

  const load = useCallback(
    async (cursor: string | null, keep: ShopProduct[]) => {
      setList((l) => ({ ...l, loading: true, error: null }));
      try {
        const page = await fetchPage(cursor);
        const items = view === 'archived' ? page.items.filter((p) => p.archivedAt) : page.items;
        setList((l) => ({
          items: [...keep, ...items],
          next: page.nextCursor,
          counts: page.counts ?? l.counts,
          loading: false,
          error: null,
        }));
      } catch (err) {
        setList((l) => ({ ...l, loading: false, error: errorMessage(err) }));
      }
    },
    [fetchPage, view],
  );

  useEffect(() => {
    setList((l) => ({ ...EMPTY, counts: l.counts }));
    void load(null, []);
  }, [load]);

  const empty = !list.loading && !list.error && list.items.length === 0;
  const href = (vue: string | null) => {
    const next = new URLSearchParams();
    if (vue) next.set('vue', vue);
    if (q) next.set('q', q);
    const qs = next.toString();
    return qs ? `/app/produits?${qs}` : '/app/produits';
  };

  return (
    <>
      <PageHeader
        title="Produits"
        action={
          <Button href="/app/produits/nouveau" className="hidden shadow-press lg:inline-flex">
            Ajouter un produit
          </Button>
        }
      />
      <div className="mt-6">
        <SearchField placeholder="Rechercher un produit" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <FilterBar
          className="min-w-0 flex-1"
          label="Afficher"
          items={[
            { id: 'sale', label: 'Tous', href: href(null), active: view === 'sale' },
            {
              id: 'campaign',
              label: 'En campagne',
              icon: 'megaphone',
              href: href('campagne'),
              active: view === 'campaign',
              count: list.counts?.campaign ?? 0,
            },
            {
              id: 'archived',
              label: 'Archivés',
              icon: 'archive',
              href: href('archives'),
              active: view === 'archived',
              count: list.counts?.archived ?? 0,
            },
          ]}
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
          {list.items.map((p) => (
            <li key={p.id} className="min-w-0">
              <ProductCard product={p} layout={layout} href={`/app/produits/${p.id}`} />
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

      {empty && view === 'sale' && !q && (
        <EmptyState
          className="mt-6"
          title="Ajoute ton premier produit"
          action={<Button href="/app/produits/nouveau">Ajouter un produit</Button>}
        >
          Un nom, une photo et un prix suffisent. Tu le mets ensuite en campagne.
        </EmptyState>
      )}
      {empty && q && <p className="mt-6 text-ink-soft">Aucun produit ne correspond à « {q} ».</p>}
      {empty && !q && view === 'campaign' && (
        <p className="mt-6 text-ink-soft">Aucun produit en campagne.</p>
      )}
      {empty && !q && view === 'archived' && (
        <p className="mt-6 text-ink-soft">Aucun produit archivé.</p>
      )}

      {list.next && !list.loading && (
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => void load(list.next, list.items)}
        >
          Voir plus
        </Button>
      )}
      <Fab href="/app/produits/nouveau" label="Ajouter un produit" />
    </>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductList />
    </Suspense>
  );
}
