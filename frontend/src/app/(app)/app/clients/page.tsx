'use client';

// /app/clients: the client book, most recently seen first, searched by
// first name (and number on Pro) and filtered by type, answer, campaign,
// zone, period and country (lot 6b), all kept in the address. The orders
// filter (« Ont commandé ») arrives with lot 7.
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ClientFilterChips,
  ClientFilterSheet,
  type FilterChoices,
} from '@/components/app/ClientFilters';
import { ClientList } from '@/components/app/ClientList';
import { SearchField } from '@/components/app/SearchField';
import { useShop } from '@/components/app/ShopProvider';
import { Button, FilterBar, Notice, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import {
  NO_CLIENT_FILTERS,
  clientFilterSearch,
  filterChips,
  parseClientSearch,
  recentMonths,
  type ClientFilterState,
} from '@/lib/tamani/client-filters';
import type { ClientCounts, ClientRow } from '@/lib/tamani/client-view';
import { clientsExportHref } from '@/lib/tamani/export-view';
import { phoneCountryChoices } from '@/lib/tamani/phone-countries';
import { PLANS } from '@/lib/tamani/plans';

const NO_CHOICES: FilterChoices = { campaigns: [], zones: [], countries: [], months: [] };
const at = (state: ClientFilterState) => {
  const qs = clientFilterSearch(state);
  return qs ? `/app/clients?${qs}` : '/app/clients';
};

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
  const router = useRouter();
  const search = params.toString();
  // An address the parser refuses shows the whole book, not an error.
  const state = useMemo(
    () => parseClientSearch(new URLSearchParams(search)) ?? NO_CLIENT_FILTERS,
    [search],
  );
  const query = clientFilterSearch(state);
  const q = state.q ?? '';
  const [list, setList] = useState<Listing>(EMPTY);
  const [choices, setChoices] = useState<FilterChoices>(NO_CHOICES);
  const [choicesLoaded, setChoicesLoaded] = useState(false);

  const load = useCallback(
    async (cursor: string | null, keep: ClientRow[]) => {
      setList((l) => ({ ...l, loading: true, error: null }));
      const next = new URLSearchParams(query);
      if (cursor) next.set('cursor', cursor);
      const qs = next.toString();
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
    [shop.id, query],
  );

  useEffect(() => {
    setList((l) => ({ ...EMPTY, counts: l.counts }));
    void load(null, []);
  }, [load]);

  // The campaigns and zones load once, when the sheet first opens.
  const loadChoices = useCallback(async () => {
    if (choicesLoaded) return;
    setChoicesLoaded(true);
    try {
      const [campaigns, zones] = await Promise.all([
        api<{ items: Array<{ id: string; title: string }> }>(
          `/api/shops/${shop.id}/campaigns?limit=50`,
        ),
        api<{ items: Array<{ id: string; name: string }> }>(`/api/shops/${shop.id}/zones`),
      ]);
      setChoices((c) => ({ ...c, campaigns: campaigns.items, zones: zones.items }));
    } catch {
      setChoicesLoaded(false);
    }
  }, [choicesLoaded, shop.id]);
  useEffect(() => {
    setChoices((c) => ({
      ...c,
      countries: phoneCountryChoices(shop.country),
      months: recentMonths(new Date()),
    }));
  }, [shop.country]);

  const chips = filterChips(state, {
    campaigns: new Map(choices.campaigns.map((c) => [c.id, c.title])),
    zones: new Map(choices.zones.map((z) => [z.id, z.name])),
  });
  const filtered = query !== '';
  const empty = !list.loading && !list.error && list.items.length === 0;
  const contacts = PLANS[shop.plan.id].features.respondentContacts;

  return (
    <>
      <PageHeader
        title="Clients"
        action={
          <Button href={clientsExportHref(state)} variant="secondary">
            Exporter
          </Button>
        }
      />
      <div className="mt-6">
        <SearchField
          placeholder={contacts ? 'Rechercher un prénom ou un numéro' : 'Rechercher un prénom'}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <FilterBar
          label="Afficher"
          items={[
            { id: 'all', label: 'Tous', href: at({ ...state, type: null }), active: !state.type },
            {
              id: 'resellers',
              label: 'Revendeurs',
              icon: 'box',
              href: at({ ...state, type: 'RESELLER' }),
              active: state.type === 'RESELLER',
              count: list.counts?.RESELLER ?? 0,
            },
            {
              id: 'consumers',
              label: 'Usagers',
              icon: 'user',
              href: at({ ...state, type: 'CONSUMER' }),
              active: state.type === 'CONSUMER',
              count: list.counts?.CONSUMER ?? 0,
            },
          ]}
        />
        <ClientFilterSheet
          state={state}
          choices={choices}
          active={chips.filter((c) => c.key !== 'type').length}
          onOpen={() => void loadChoices()}
          onApply={(next) => router.replace(at({ ...next, q: state.q }))}
        />
      </div>
      <ClientFilterChips
        chips={chips.filter((c) => c.key !== 'type')}
        clearHref={at({ ...NO_CLIENT_FILTERS, q: state.q })}
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
      {empty && !q && filtered && (
        <p className="mt-6 text-ink-soft">Aucun client avec ces filtres.</p>
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
