'use client';

// /app/produits: the catalogue, newest first. "Archivés" lists the products
// taken out of sale (kept because past campaigns point to them).
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useShop } from '@/components/app/ShopProvider';
import { Button, EmptyState, FilterBar, Notice, PageHeader, ProductCard } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import type { ShopProduct } from '@/lib/tamani/product-form';

interface Listing {
  items: ShopProduct[];
  next: string | null;
  loading: boolean;
  error: string | null;
}

function ProductList() {
  const { shop } = useShop();
  const archivedView = useSearchParams().get('vue') === 'archives';
  const [list, setList] = useState<Listing>({ items: [], next: null, loading: true, error: null });

  const fetchPage = useCallback(
    (cursor: string | null) => {
      const q = new URLSearchParams();
      // ?archived=1 returns every product; the "Archivés" view keeps the archived ones.
      if (archivedView) q.set('archived', '1');
      if (cursor) q.set('cursor', cursor);
      const qs = q.toString();
      return api<{ items: ShopProduct[]; nextCursor: string | null }>(
        `/api/shops/${shop.id}/products${qs ? `?${qs}` : ''}`,
      );
    },
    [shop.id, archivedView],
  );

  const load = useCallback(
    async (cursor: string | null, keep: ShopProduct[]) => {
      setList((l) => ({ ...l, loading: true, error: null }));
      try {
        const page = await fetchPage(cursor);
        const items = archivedView ? page.items.filter((p) => p.archivedAt) : page.items;
        setList({ items: [...keep, ...items], next: page.nextCursor, loading: false, error: null });
      } catch (err) {
        setList((l) => ({ ...l, loading: false, error: errorMessage(err) }));
      }
    },
    [fetchPage, archivedView],
  );

  useEffect(() => {
    setList({ items: [], next: null, loading: true, error: null });
    void load(null, []);
  }, [load]);

  const empty = !list.loading && !list.error && list.items.length === 0;

  return (
    <>
      <PageHeader
        title="Produits"
        action={
          <Button href="/app/produits/nouveau" className="shadow-press">
            Ajouter un produit
          </Button>
        }
      />
      <FilterBar
        className="mt-6"
        label="Afficher"
        items={[
          { id: 'sale', label: 'En vente', href: '/app/produits', active: !archivedView },
          {
            id: 'archived',
            label: 'Archivés',
            href: '/app/produits?vue=archives',
            active: archivedView,
          },
        ]}
      />

      {list.items.length > 0 && (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {list.items.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} href={`/app/produits/${p.id}`} className="h-full" />
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

      {empty && !archivedView && (
        <EmptyState
          className="mt-6"
          title="Ajoute ton premier produit"
          action={<Button href="/app/produits/nouveau">Ajouter un produit</Button>}
        >
          Un nom, une photo et un prix suffisent. Tu le mets ensuite en campagne.
        </EmptyState>
      )}
      {empty && archivedView && <p className="mt-6 text-ink-soft">Aucun produit archivé.</p>}

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

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductList />
    </Suspense>
  );
}
