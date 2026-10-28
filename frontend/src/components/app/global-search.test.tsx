import { describe, expect, it, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import { mockNextNavigation } from '@/test-utils/next-navigation';
import { ShopTestProvider } from '@/test-utils/shop-context';
import { searchOptions } from '@/lib/tamani/search-view';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const { GlobalSearch, SearchList } = await import('./GlobalSearch');

const options = searchOptions({
  campaigns: [{ id: 'c1', title: 'Riz parfumé', status: 'ACTIVE', photo: null }],
  products: [{ id: 'p1', name: 'Riz 25 kg', archived: false, photo: null }],
  clients: [{ id: 'r1', firstName: 'Awa', phone: null }],
});

describe('GlobalSearch', () => {
  it('is a labelled combobox, closed until something is typed', () => {
    mockNextNavigation({ pathname: '/app' });
    const out = html(
      <ShopTestProvider>
        <GlobalSearch />
      </ShopTestProvider>,
    );
    const input = out.match(/<input [^>]*>/)?.[0] ?? '';
    expect(input).toContain('role="combobox"');
    expect(input).toContain('aria-expanded="false"');
    expect(input).toContain('aria-autocomplete="list"');
    expect(input).toMatch(/maxLength="60"|maxlength="60"/);
    expect(out).toMatch(
      /<label[^>]*class="sr-only"[^>]*>Rechercher une campagne, un produit ou un client<\/label>/,
    );
    expect(out).toContain('Ctrl K');
  });
});

describe('SearchList', () => {
  const list = (activeId: string | null) =>
    html(
      <SearchList
        id="res"
        q="riz"
        options={options}
        activeId={activeId}
        loading={false}
        error={false}
        onPick={() => {}}
        onHover={() => {}}
      />,
    );

  it('groups the options under Campagnes, Produits and Clients', () => {
    const out = list(null);
    expect(out).toMatch(/role="listbox"/);
    expect(out.match(/role="group"/g)).toHaveLength(3);
    expect(out.match(/role="option"/g)).toHaveLength(3);
    const t = text(<div dangerouslySetInnerHTML={{ __html: out }} />);
    expect(t.indexOf('Campagnes')).toBeLessThan(t.indexOf('Produits'));
    expect(t.indexOf('Produits')).toBeLessThan(t.indexOf('Clients'));
  });

  it('marks the active option for aria-activedescendant', () => {
    const out = list('search-product-p1');
    const option = (out.match(/<div [^>]*role="option"[^>]*>/g) ?? []).find((t) =>
      t.includes('id="search-product-p1"'),
    );
    expect(option).toContain('aria-selected="true"');
    expect(out.match(/aria-selected="true"/g)).toHaveLength(1);
  });

  it('says when nothing matches, and while it looks', () => {
    const empty = (loading: boolean) =>
      text(
        <SearchList
          id="res"
          q="zz"
          options={[]}
          activeId={null}
          loading={loading}
          error={false}
          onPick={() => {}}
          onHover={() => {}}
        />,
      );
    expect(empty(false)).toContain('Aucun résultat pour « zz »');
    expect(empty(true)).toContain('Recherche…');
  });

  it('cuts a long name instead of pushing the page', () => {
    const long = searchOptions({
      campaigns: [{ id: 'c1', title: 'R'.repeat(140), status: 'DRAFT', photo: null }],
      products: [],
      clients: [],
    });
    const out = html(
      <SearchList
        id="res"
        q="rr"
        options={long}
        activeId={null}
        loading={false}
        error={false}
        onPick={() => {}}
        onHover={() => {}}
      />,
    );
    expect(out).toMatch(/class="[^"]*truncate[^"]*">R{140}</);
  });
});
