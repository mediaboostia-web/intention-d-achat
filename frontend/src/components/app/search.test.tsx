import { describe, it, expect, vi, afterEach } from 'vitest';
import { html } from '@/components/ui/test-html';
import { debounce, searchHref } from '@/lib/tamani/search-query';
import { mockNextNavigation } from '@/test-utils/next-navigation';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const { SearchField } = await import('./SearchField');

afterEach(() => {
  vi.useRealTimers();
});

describe('search', () => {
  it('waits 300 ms then replaces the query', () => {
    vi.useFakeTimers();
    const replace = vi.fn();
    const type = debounce((value: string) => {
      replace(searchHref('/app/campagnes', 'statut=ACTIVE&cursor=x', value));
    }, 300);
    type('r');
    type('ri');
    type('riz');
    vi.advanceTimersByTime(299);
    expect(replace).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/app/campagnes?statut=ACTIVE&q=riz');
  });

  it('a cancelled search never runs', () => {
    vi.useFakeTimers();
    const replace = vi.fn();
    const type = debounce(replace, 300);
    type('riz');
    type.cancel();
    vi.advanceTimersByTime(1000);
    expect(replace).not.toHaveBeenCalled();
  });

  it('clearing removes q', () => {
    expect(searchHref('/app/campagnes', 'statut=ACTIVE&q=riz', '')).toBe(
      '/app/campagnes?statut=ACTIVE',
    );
    expect(searchHref('/app/campagnes', 'q=riz', '   ')).toBe('/app/campagnes');
    expect(searchHref('/app/clients', '', ' Awa ')).toBe('/app/clients?q=Awa');
  });

  it('starts from the q in the URL', () => {
    mockNextNavigation({ pathname: '/app/campagnes', search: 'q=riz' });
    const out = html(<SearchField placeholder="Rechercher une campagne" />);
    expect(out).toMatch(/<form[^>]*role="search"/);
    expect(out).toMatch(/<input[^>]*type="search"/);
    expect(out).toMatch(/<input[^>]*value="riz"/);
    expect(out).toContain('aria-label="Rechercher une campagne"');
    expect(out).toContain('aria-label="Effacer"');
  });

  it('shows no clear button while empty', () => {
    mockNextNavigation({ pathname: '/app/campagnes' });
    expect(html(<SearchField placeholder="Rechercher une campagne" />)).not.toContain(
      'aria-label="Effacer"',
    );
  });
});
