// Tamani's back-office (lot 11). The porteur asked for « Support-admin » in
// place of the kit's /admin (2026-10-30); /admin now sends here.
export const ADMIN_HOME = '/support-admin';
/** The back-office's own sign-in page (lot 11c): password, then a code by e-mail. */
export const ADMIN_DOOR = `${ADMIN_HOME}/connexion`;

export const ADMIN_NAV = [
  { href: ADMIN_HOME, label: 'Tableau de bord', icon: 'grid' },
  { href: `${ADMIN_HOME}/liste-attente`, label: "Liste d'attente", icon: 'rows' },
  { href: `${ADMIN_HOME}/boutiques`, label: 'Boutiques', icon: 'home' },
  { href: `${ADMIN_HOME}/utilisateurs`, label: 'Utilisateurs', icon: 'people' },
  { href: `${ADMIN_HOME}/journal`, label: 'Journal', icon: 'clock' },
] as const;

/** The dashboard is active on its own page only; a section on its sub-pages too. */
export function isAdminLinkActive(href: string, pathname: string): boolean {
  if (href === ADMIN_HOME) return pathname === ADMIN_HOME;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * What the back-office layout does with requireAdmin's answer and the door:
 * no session, or an admin who has not entered the e-mailed code on this
 * browser → the door; signed in without the role → not found.
 */
export function adminGate(status: 401 | 403 | 'ok', doorOpen = true): 'login' | 'hidden' | 'ok' {
  if (status === 401) return 'login';
  if (status === 403) return 'hidden';
  return doorOpen ? 'ok' : 'login';
}

/** « hu•••@gmail.com »: enough to recognise one's own address on the door. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return '•••';
  return `${email.slice(0, Math.min(2, at))}•••${email.slice(at)}`;
}

export function adminRoleLabel(role: string): string {
  return role === 'SUPERADMIN' ? 'Super-admin' : 'Admin';
}
