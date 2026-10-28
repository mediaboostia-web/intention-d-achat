import { describe, it, expect } from 'vitest';
import { NO_CLIENT_FILTERS } from './client-filters';
import {
  DEFAULT_EXPORT,
  clientsExportHref,
  exportHref,
  exportSearch,
  parseExportSearch,
} from './export-view';

const parse = (qs: string) => parseExportSearch(new URLSearchParams(qs));

describe('parseExportSearch', () => {
  it('reads the answers to export and their filters', () => {
    expect(
      parse(
        'quoi=reponses&reponse=non&campagne=c1&periode=2026-10&quartier=autre&echeance=THIS_WEEK&type=revendeurs&pays=BJ',
      ),
    ).toEqual({
      what: 'responses',
      answer: 'no',
      campaignId: 'c1',
      period: '2026-10',
      zone: 'OTHER',
      timing: 'THIS_WEEK',
      buyerType: 'RESELLER',
      country: 'BJ',
    });
    expect(parse('reponse=toutes')).toMatchObject({ what: 'responses', answer: 'all' });
  });

  it('opens on the interested answers without any filter', () => {
    expect(parse('')).toEqual(DEFAULT_EXPORT);
    expect(DEFAULT_EXPORT).toMatchObject({ what: 'responses', answer: 'yes', campaignId: null });
  });

  it('reads the clients with the filters of the client book', () => {
    expect(parse('quoi=clients&reponse=oui&pays=SN')).toEqual({
      what: 'clients',
      filters: { ...NO_CLIENT_FILTERS, answer: 'yes', country: 'SN' },
    });
  });

  it('refuses what it does not know', () => {
    expect(parse('quoi=tout')).toBeNull();
    expect(parse('reponse=peut-etre')).toBeNull();
    expect(parse('echeance=DEMAIN')).toBeNull();
    expect(parse('echeance=toString')).toBeNull();
    expect(parse('periode=2026-13')).toBeNull();
    expect(parse('pays=XX')).toBeNull();
    expect(parse('quoi=clients&reponse=toutes')).toBeNull();
  });
});

describe('exportSearch', () => {
  it('writes an address the parser reads back', () => {
    const q = parse('quoi=reponses&reponse=oui&campagne=c1&echeance=LATER&quartier=z1');
    expect(q).not.toBeNull();
    expect(exportSearch(q!)).toBe(
      'quoi=reponses&reponse=oui&campagne=c1&quartier=z1&echeance=LATER',
    );
    expect(parse(exportSearch(q!))).toEqual(q);
    const c = { what: 'clients' as const, filters: { ...NO_CLIENT_FILTERS, period: 'ce-mois' } };
    expect(exportSearch(c)).toBe('quoi=clients&periode=ce-mois');
    expect(parse(exportSearch(c))).toEqual(c);
  });
});

describe('clientsExportHref', () => {
  it('carries the client filters but not the search, which the export page cannot show', () => {
    expect(clientsExportHref({ ...NO_CLIENT_FILTERS, q: 'Awa', country: 'SN' })).toBe(
      '/app/exporter?quoi=clients&pays=SN',
    );
  });
});

describe('exportHref', () => {
  it('opens the export page on the query', () => {
    expect(exportHref({ ...DEFAULT_EXPORT, campaignId: 'c1' })).toBe(
      '/app/exporter?quoi=reponses&reponse=oui&campagne=c1',
    );
    expect(exportHref({ what: 'clients', filters: NO_CLIENT_FILTERS })).toBe(
      '/app/exporter?quoi=clients',
    );
  });
});
