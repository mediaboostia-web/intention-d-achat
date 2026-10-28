import { describe, it, expect } from 'vitest';
import {
  NO_CLIENT_FILTERS,
  clientFilterSearch,
  filterChips,
  parseClientSearch,
  periodLabel,
  periodRange,
  recentMonths,
} from './client-filters';

const now = new Date('2026-10-28T12:00:00Z');
const parse = (qs: string) => parseClientSearch(new URLSearchParams(qs));

describe('parseClientSearch', () => {
  it('reads every filter of the address', () => {
    expect(
      parse(
        'type=revendeurs&reponse=oui&campagne=c1&quartier=autre&periode=2026-10&pays=BJ&q=%20Awa%20',
      ),
    ).toEqual({
      type: 'RESELLER',
      answer: 'yes',
      campaignId: 'c1',
      zone: 'OTHER',
      period: '2026-10',
      country: 'BJ',
      q: 'Awa',
    });
    expect(parse('')).toEqual(NO_CLIENT_FILTERS);
    expect(parse('quartier=z1&periode=3-mois&reponse=non')).toMatchObject({
      zone: 'z1',
      period: '3-mois',
      answer: 'no',
    });
  });

  it('refuses a value it does not know', () => {
    for (const qs of [
      'type=toString',
      'reponse=peut-etre',
      'periode=2026-13',
      'periode=hier',
      'pays=ZZ',
      'campagne=a%20b',
      `q=${'a'.repeat(61)}`,
    ]) {
      expect(parse(qs), qs).toBeNull();
    }
  });
});

describe('clientFilterSearch', () => {
  it('writes the filters back in a stable order, without the empty ones', () => {
    const state = parse('pays=BJ&q=Awa&type=usagers&reponse=oui')!;
    expect(clientFilterSearch(state)).toBe('type=usagers&reponse=oui&pays=BJ&q=Awa');
    expect(clientFilterSearch(NO_CLIENT_FILTERS)).toBe('');
  });
});

describe('periodRange', () => {
  it('reads the periods in UTC months', () => {
    expect(periodRange('ce-mois', now)).toEqual({
      gte: new Date('2026-10-01T00:00:00Z'),
      lt: new Date('2026-11-01T00:00:00Z'),
    });
    expect(periodRange('mois-dernier', now)).toEqual({
      gte: new Date('2026-09-01T00:00:00Z'),
      lt: new Date('2026-10-01T00:00:00Z'),
    });
    expect(periodRange('3-mois', now)).toEqual({
      gte: new Date('2026-08-01T00:00:00Z'),
      lt: new Date('2026-11-01T00:00:00Z'),
    });
    expect(periodRange('2026-01', now)).toEqual({
      gte: new Date('2026-01-01T00:00:00Z'),
      lt: new Date('2026-02-01T00:00:00Z'),
    });
    expect(periodRange('mois-dernier', new Date('2026-01-15T00:00:00Z')).gte).toEqual(
      new Date('2025-12-01T00:00:00Z'),
    );
  });

  it('names the periods and lists the last twelve months', () => {
    expect(periodLabel('ce-mois')).toBe('Ce mois-ci');
    expect(periodLabel('2026-10')).toBe('octobre 2026');
    const months = recentMonths(now);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe('2026-10');
    expect(months[11]).toBe('2025-11');
  });
});

describe('filterChips', () => {
  it('gives one chip per active filter, each removing only itself', () => {
    const state = parse('type=revendeurs&campagne=c1&quartier=autre&pays=FR&q=Awa')!;
    const chips = filterChips(state, {
      campaigns: new Map([['c1', 'Riz parfumé']]),
      zones: new Map(),
    });
    expect(chips.map((c) => c.label)).toEqual([
      'Revendeurs',
      'Riz parfumé',
      'Autre endroit',
      'France',
    ]);
    expect(chips[1]!.href).toBe('/app/clients?type=revendeurs&quartier=autre&pays=FR&q=Awa');
    expect(filterChips(NO_CLIENT_FILTERS, { campaigns: new Map(), zones: new Map() })).toEqual([]);
  });
});
