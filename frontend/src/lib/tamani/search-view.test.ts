import { describe, expect, it } from 'vitest';
import { searchOptions, type SearchResults } from './search-view';

const results: SearchResults = {
  campaigns: [{ id: 'c1', title: 'Riz parfumé', status: 'ACTIVE', photo: null }],
  products: [
    { id: 'p1', name: 'Riz 25 kg', archived: false, photo: null },
    { id: 'p2', name: 'Riz brisé', archived: true, photo: null },
  ],
  clients: [
    { id: 'r1', firstName: 'Awa', phone: '+221 77 123 45 67' },
    { id: 'r2', firstName: null, phone: null },
  ],
};

describe('searchOptions', () => {
  it('lists campaigns, then products, then clients, each with its page', () => {
    expect(searchOptions(results).map((o) => [o.group, o.href])).toEqual([
      ['Campagnes', '/app/campagnes/c1'],
      ['Produits', '/app/produits/p1'],
      ['Produits', '/app/produits/p2'],
      ['Clients', '/app/clients/r1'],
      ['Clients', '/app/clients/r2'],
    ]);
  });

  it('says what each result is', () => {
    const [campaign, product, archived, client, unnamed] = searchOptions(results);
    expect(campaign).toMatchObject({ label: 'Riz parfumé', detail: 'En cours' });
    expect(product).toMatchObject({ label: 'Riz 25 kg', detail: 'Produit' });
    expect(archived).toMatchObject({ detail: 'Archivé' });
    expect(client).toMatchObject({ label: 'Awa', detail: '+221 77 123 45 67' });
    expect(unnamed).toMatchObject({ label: 'Client sans prénom', detail: 'Client' });
  });

  it('gives each option a unique id for aria-activedescendant', () => {
    const ids = searchOptions(results).map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is empty when nothing matches', () => {
    expect(searchOptions({ campaigns: [], products: [], clients: [] })).toEqual([]);
  });
});
