import { describe, it, expect } from 'vitest';
import { APP_NAV, DESKTOP_EXTRA_NAV, isNavActive } from './nav';

describe('app navigation', () => {
  it('lists the five mobile entries in order', () => {
    expect(APP_NAV.map((n) => [n.label, n.href])).toEqual([
      ['Accueil', '/app'],
      ['Campagnes', '/app/campagnes'],
      ['Commandes', '/app/commandes'],
      ['Clients', '/app/clients'],
      ['Plus', '/app/plus'],
    ]);
    expect(DESKTOP_EXTRA_NAV.map((n) => n.href)).toEqual(['/app/produits', '/app/reglages']);
  });

  it('marks /app active on /app only, sections on their sub-pages', () => {
    expect(isNavActive('/app', '/app')).toBe(true);
    expect(isNavActive('/app', '/app/campagnes')).toBe(false);
    expect(isNavActive('/app/campagnes', '/app/campagnes/abc')).toBe(true);
    expect(isNavActive('/app/campagnes', '/app/campagnes-x')).toBe(false);
  });
});
