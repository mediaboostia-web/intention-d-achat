// The top bar's search (lot 7a), shared by the route and the screen: what
// the server answers, and the flat list of options the combobox walks.
import { CAMPAIGN_STATUS_LABELS, type CampaignStatus } from './campaign-actions';

/** Below this length the field waits; the route refuses it (400). */
export const SEARCH_MIN = 2;

export interface SearchResults {
  campaigns: Array<{ id: string; title: string; status: CampaignStatus; photo: string | null }>;
  products: Array<{ id: string; name: string; archived: boolean; photo: string | null }>;
  /** `phone` is null on a plan without contacts: the number never leaves the server. */
  clients: Array<{ id: string; firstName: string | null; phone: string | null }>;
}

export type SearchGroup = 'Campagnes' | 'Produits' | 'Clients';

export interface SearchOption {
  /** Unique in the list, for aria-activedescendant. */
  id: string;
  group: SearchGroup;
  label: string;
  detail: string;
  href: string;
  photo: string | null;
  icon: 'megaphone' | 'box' | 'user';
}

/** Campaigns, then products, then clients, in the server's order. */
export function searchOptions(r: SearchResults): SearchOption[] {
  return [
    ...r.campaigns.map(
      (c): SearchOption => ({
        id: `search-campaign-${c.id}`,
        group: 'Campagnes',
        label: c.title,
        detail: CAMPAIGN_STATUS_LABELS[c.status],
        href: `/app/campagnes/${c.id}`,
        photo: c.photo,
        icon: 'megaphone',
      }),
    ),
    ...r.products.map(
      (p): SearchOption => ({
        id: `search-product-${p.id}`,
        group: 'Produits',
        label: p.name,
        detail: p.archived ? 'Archivé' : 'Produit',
        href: `/app/produits/${p.id}`,
        photo: p.photo,
        icon: 'box',
      }),
    ),
    ...r.clients.map(
      (c): SearchOption => ({
        id: `search-client-${c.id}`,
        group: 'Clients',
        label: c.firstName ?? 'Client sans prénom',
        detail: c.phone ?? 'Client',
        href: `/app/clients/${c.id}`,
        photo: null,
        icon: 'user',
      }),
    ),
  ];
}
