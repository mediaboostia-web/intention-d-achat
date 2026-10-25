'use client';

// /app/clients: the client book, most recently seen first, searched by
// first name (and number on Pro) and filtered by resellers or consumers.
// The orders filter (« Ont commandé ») arrives with lot 7.
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClientList } from '@/components/app/ClientList';
import { SearchField } from '@/components/app/SearchField';
import { useShop } from '@/components/app/ShopProvider';
import { Button, FilterBar, Notice, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import type { ClientCounts, ClientRow } from '@/lib/tamani/client-view';
import { PLANS } from '@/lib/tamani/plans';

const TYPES = ['revendeurs', 'usagers'] as const;
type Type = (typeof TYPES)[number];

interface Listing {
  items: ClientRow[];
  next: string | null;
  counts: ClientCounts | null;
  loading: boolean;
  error: string | null;
}

const EMPTY: Listing = { items: [], next: null, counts: null, loading: true, error: null };

function Clients() {
  const { shop } = useShop();
  const params = useSearchParams();
  const raw = params.get('type');
  const type = TYPES.find((t) => t === raw) ?? null;
  const q = (params.get('q') ?? '').trim();
  const [list, setList] = useState<Listing>(EMPTY);

  const load = useCallback(
    async (cursor: string | null, keep: ClientRow[]) => {
      setList((l) => ({ ...l, loading: true, error: null }));
      const query = new URLSearchParams();
      if (type) query.set('type', type);
      if (q) query.set('q', q);
      if (cursor) query.set('cursor', cursor);
      const qs = query.toString();
      try {
        const page = await api<{
          items: ClientRow[];
          nextCursor: string | null;
          counts: ClientCounts | null;
        }>(`/api/shops/${shop.id}/clients${qs ? `?${qs}` : ''}`);
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
    [shop.id, type, q],
  );

  useEffect(() => {
    setList((l) => ({ ...EMPTY, counts: l.counts }));
    void load(null, []);
  }, [load]);

  const href = (t: Type | null) => {
    const next = new URLSearchParams();
    if (t) next.set('type', t);
    if (q) next.set('q', q);
    const qs = next.toString();
    return qs ? `/app/clients?${qs}` : '/app/clients';
  };
  const filtered = type !== null || q !== '';
  const empty = !list.loading && !list.error && list.items.length === 0;
  const contacts = PLANS[shop.plan.id].features.respondentContacts;

  return (
    <>
      <PageHeader title="Clients" />
      <div className="mt-6">
        <SearchField
          placeholder={contacts ? 'Rechercher un prénom ou un numéro' : 'Rechercher un prénom'}
        />
      </div>
      <FilterBar
        className="mt-3"
        label="Afficher"
        items={[
          { id: 'all', label: 'Tous', href: href(null), active: type === null },
          {
            id: 'resellers',
            label: 'Revendeurs',
            icon: 'box',
            href: href('revendeurs'),
            active: type === 'revendeurs',
            count: list.counts?.RESELLER ?? 0,
          },
          {
            id: 'consumers',
            label: 'Usagers',
            icon: 'user',
            href: href('usagers'),
            active: type === 'usagers',
            count: list.counts?.CONSUMER ?? 0,
          },
        ]}
      />

      {list.items.length > 0 && (
        <ClientList rows={list.items} shopName={shop.name} now={new Date()} />
      )}
      {list.loading && (
        <div aria-hidden="true" className="mt-4 flex flex-col gap-2 motion-safe:animate-pulse">
          <span className="h-[72px] rounded-card bg-grid/70" />
          <span className="h-[72px] rounded-card bg-grid/70" />
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
      {empty && !filtered && <ClientList rows={[]} shopName={shop.name} now={new Date()} />}
      {empty && q && <p className="mt-6 text-ink-soft">Aucun client ne correspond à « {q} ».</p>}
      {empty && !q && type && <p className="mt-6 text-ink-soft">Aucun client ici.</p>}
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

export default function ClientsPage() {
  return (
    <Suspense fallback={null}>
      <Clients />
    </Suspense>
  );
}
