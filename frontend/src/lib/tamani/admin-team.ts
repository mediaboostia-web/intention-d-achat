// The support-admin team (lot 13a): who holds the ADMIN or SUPERADMIN role.
// Shared with the browser: the rows the Paramètres page lists.

export type AdminRole = 'ADMIN' | 'SUPERADMIN';

export interface AdminRow {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  /** When the account was opened (ISO); the last sign-in is not kept. */
  createdAt: string;
}

export const ADMIN_ROLES: readonly AdminRole[] = ['ADMIN', 'SUPERADMIN'];

export function isAdminRole(role: string): role is AdminRole {
  return role === 'ADMIN' || role === 'SUPERADMIN';
}
