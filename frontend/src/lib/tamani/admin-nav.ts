// Tamani's back-office (lot 11). The porteur asked for « Support-admin » in
// place of the kit's /admin (2026-10-30); /admin now sends here.
export const ADMIN_HOME = '/support-admin';

export const ADMIN_NAV = [
  { href: ADMIN_HOME, label: 'Tableau de bord', icon: 'grid' },
  { href: `${ADMIN_HOME}/notifications`, label: 'Notifications', icon: 'bell' },
  { href: `${ADMIN_HOME}/boutiques`, label: 'Boutiques', icon: 'home' },
  { href: `${ADMIN_HOME}/utilisateurs`, label: 'Utilisateurs', icon: 'people' },
  { href: `${ADMIN_HOME}/journal`, label: 'Journal', icon: 'clock' },
  { href: `${ADMIN_HOME}/parametres`, label: 'Paramètres', icon: 'gear' },
] as const;

/** The dashboard is active on its own page only; a section on its sub-pages too. */
export function isAdminLinkActive(href: string, pathname: string): boolean {
  if (href === ADMIN_HOME) return pathname === ADMIN_HOME;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * What the back-office layout does with requireAdmin's answer: no session →
 * sign in; signed in without the role → not found, so nobody learns it exists.
 */
export function adminGate(status: 401 | 403 | 'ok'): 'login' | 'hidden' | 'ok' {
  if (status === 401) return 'login';
  if (status === 403) return 'hidden';
  return 'ok';
}

export function adminRoleLabel(role: string): string {
  return role === 'SUPERADMIN' ? 'Super-admin' : 'Admin';
}
