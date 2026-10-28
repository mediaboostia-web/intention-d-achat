// The client book's filters (lot 6b, retours §5), kept in the address:
// type, answer, campaign, zone (or « Autre endroit »), period, the
// number's country and, since lot 7, whether the client has ordered. Pure and shared: the page writes them, the API reads
// them with the same parser, and the export (lot 6b, §6) reuses both.
import type { BuyerType } from './labels';
import { countryName, isPhoneCountry } from './phone-countries';

export interface ClientFilterState {
  type: BuyerType | null;
  answer: 'yes' | 'no' | null;
  campaignId: string | null;
  /** A zone id, or OTHER for « Autre endroit ». */
  zone: string | null;
  /** ce-mois | mois-dernier | 3-mois | AAAA-MM */
  period: string | null;
  /** Two letters: the country of the number. */
  country: string | null;
  /** True: at least one order not cancelled (lot 7). A client filter, not an answer one. */
  ordered: boolean | null;
  q: string | null;
}

export const NO_CLIENT_FILTERS: ClientFilterState = {
  type: null,
  answer: null,
  campaignId: null,
  zone: null,
  period: null,
  country: null,
  ordered: null,
  q: null,
};

/** The search field's limit, the same as the server's SEARCH_MAX. */
export const CLIENT_SEARCH_MAX = 60;

const TYPES: Readonly<Record<string, BuyerType>> = { revendeurs: 'RESELLER', usagers: 'CONSUMER' };
const ANSWERS: Readonly<Record<string, 'yes' | 'no'>> = { oui: 'yes', non: 'no' };
const ORDERED: Readonly<Record<string, boolean>> = { oui: true, non: false };
const NAMED_PERIODS = ['ce-mois', 'mois-dernier', '3-mois'] as const;
const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const ID = /^[A-Za-z0-9_-]{1,40}$/;

export function isPeriod(value: string): boolean {
  return (NAMED_PERIODS as readonly string[]).includes(value) || MONTH.test(value);
}

/** The filters of an address; null when one is unknown (the API answers 400). */
export function parseClientSearch(params: URLSearchParams): ClientFilterState | null {
  const type = params.get('type');
  const answer = params.get('reponse');
  const campaignId = params.get('campagne');
  const zone = params.get('quartier');
  const period = params.get('periode');
  const country = params.get('pays');
  const ordered = params.get('commande');
  const q = (params.get('q') ?? '').trim();
  if (type !== null && !Object.hasOwn(TYPES, type)) return null;
  if (answer !== null && !Object.hasOwn(ANSWERS, answer)) return null;
  if (ordered !== null && !Object.hasOwn(ORDERED, ordered)) return null;
  if (campaignId !== null && !ID.test(campaignId)) return null;
  if (zone !== null && zone !== 'autre' && !ID.test(zone)) return null;
  if (period !== null && !isPeriod(period)) return null;
  if (country !== null && !isPhoneCountry(country)) return null;
  if (q.length > CLIENT_SEARCH_MAX) return null;
  return {
    type: type === null ? null : (TYPES[type] ?? null),
    answer: answer === null ? null : (ANSWERS[answer] ?? null),
    campaignId,
    zone: zone === 'autre' ? 'OTHER' : zone,
    period,
    country,
    ordered: ordered === null ? null : (ORDERED[ordered] ?? null),
    q: q || null,
  };
}

/** The filters as an address query, in a stable order, without the cursor. */
export function clientFilterSearch(state: ClientFilterState): string {
  const out = new URLSearchParams();
  if (state.type) out.set('type', state.type === 'RESELLER' ? 'revendeurs' : 'usagers');
  if (state.answer) out.set('reponse', state.answer === 'yes' ? 'oui' : 'non');
  if (state.campaignId) out.set('campagne', state.campaignId);
  if (state.zone) out.set('quartier', state.zone === 'OTHER' ? 'autre' : state.zone);
  if (state.period) out.set('periode', state.period);
  if (state.country) out.set('pays', state.country);
  if (state.ordered !== null) out.set('commande', state.ordered ? 'oui' : 'non');
  if (state.q) out.set('q', state.q);
  return out.toString();
}

const monthStart = (year: number, month: number) => new Date(Date.UTC(year, month, 1));

/** The answers' dates a period keeps, in UTC (Dakar time). */
export function periodRange(period: string, now: Date): { gte: Date; lt: Date } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  if (period === 'ce-mois') return { gte: monthStart(y, m), lt: monthStart(y, m + 1) };
  if (period === 'mois-dernier') return { gte: monthStart(y, m - 1), lt: monthStart(y, m) };
  if (period === '3-mois') return { gte: monthStart(y, m - 2), lt: monthStart(y, m + 1) };
  const [, year = '0', month = '1'] = MONTH.exec(period) ?? [];
  return {
    gte: monthStart(Number(year), Number(month) - 1),
    lt: monthStart(Number(year), Number(month)),
  };
}

const MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

export function periodLabel(period: string): string {
  if (period === 'ce-mois') return 'Ce mois-ci';
  if (period === 'mois-dernier') return 'Le mois dernier';
  if (period === '3-mois') return '3 derniers mois';
  const [, year = '', month = '1'] = MONTH.exec(period) ?? [];
  return `${MONTH_NAMES[Number(month) - 1] ?? ''} ${year}`;
}

/** The current month and the eleven before it, as AAAA-MM. */
export function recentMonths(now: Date): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    const d = monthStart(now.getUTCFullYear(), now.getUTCMonth() - i);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

export interface FilterChip {
  key: keyof ClientFilterState;
  label: string;
  /** The address without this filter. */
  href: string;
}

/** One chip per active filter (the search has its own field). */
export function filterChips(
  state: ClientFilterState,
  names: { campaigns: ReadonlyMap<string, string>; zones: ReadonlyMap<string, string> },
  base = '/app/clients',
): FilterChip[] {
  const without = (key: keyof ClientFilterState) => {
    const qs = clientFilterSearch({ ...state, [key]: null });
    return qs ? `${base}?${qs}` : base;
  };
  const chips: FilterChip[] = [];
  if (state.type) {
    chips.push({
      key: 'type',
      label: state.type === 'RESELLER' ? 'Revendeurs' : 'Usagers',
      href: without('type'),
    });
  }
  if (state.answer) {
    chips.push({
      key: 'answer',
      label: state.answer === 'yes' ? 'Intéressés' : 'Pas intéressés',
      href: without('answer'),
    });
  }
  if (state.campaignId) {
    chips.push({
      key: 'campaignId',
      label: names.campaigns.get(state.campaignId) ?? 'Une campagne',
      href: without('campaignId'),
    });
  }
  if (state.zone) {
    chips.push({
      key: 'zone',
      label:
        state.zone === 'OTHER' ? 'Autre endroit' : (names.zones.get(state.zone) ?? 'Un quartier'),
      href: without('zone'),
    });
  }
  if (state.period) {
    chips.push({ key: 'period', label: periodLabel(state.period), href: without('period') });
  }
  if (state.country) {
    chips.push({ key: 'country', label: countryName(state.country), href: without('country') });
  }
  if (state.ordered !== null) {
    chips.push({
      key: 'ordered',
      label: state.ordered ? 'A commandé' : 'Pas encore commandé',
      href: without('ordered'),
    });
  }
  return chips;
}
