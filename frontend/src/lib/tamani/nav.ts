// Navigation of the shop space: five entries in the bottom bar on a phone,
// the same plus Produits and Réglages in the desktop sidebar.

export type NavIcon = 'home' | 'megaphone' | 'receipt' | 'people' | 'more' | 'box' | 'gear';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: NavIcon;
}

export const APP_NAV: readonly NavItem[] = [
  { id: 'home', label: 'Accueil', href: '/app', icon: 'home' },
  { id: 'campaigns', label: 'Campagnes', href: '/app/campagnes', icon: 'megaphone' },
  { id: 'orders', label: 'Commandes', href: '/app/commandes', icon: 'receipt' },
  { id: 'clients', label: 'Clients', href: '/app/clients', icon: 'people' },
  { id: 'more', label: 'Plus', href: '/app/plus', icon: 'more' },
];

export const DESKTOP_EXTRA_NAV: readonly NavItem[] = [
  { id: 'products', label: 'Produits', href: '/app/produits', icon: 'box' },
  { id: 'settings', label: 'Réglages', href: '/app/reglages', icon: 'gear' },
];

/** "/app" is the home page only; any other entry covers its sub-pages. */
export function isNavActive(href: string, pathname: string): boolean {
  if (href === '/app') return pathname === '/app';
  return pathname === href || pathname.startsWith(`${href}/`);
}
