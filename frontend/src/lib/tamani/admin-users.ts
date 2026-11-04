// Support-admin accounts (lot 11): the list, one account's card, and the
// list's address (?q=&page=).
import { ADMIN_HOME } from './admin-nav';

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  verified: boolean;
  createdAt: string;
  /** The shop the account owns, with its plan in force. */
  shop: { id: string; name: string; plan: string } | null;
}

export interface AdminUserList {
  items: AdminUserRow[];
  total: number;
  page: number;
  pages: number;
}

export interface UserQuery {
  q: string;
  page: number;
}

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

export function parseUserQuery(search: Search): UserQuery {
  const page = Number.parseInt(one(search.page), 10);
  return {
    q: one(search.q).trim().slice(0, 100),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function usersHref(query: Partial<UserQuery>): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  const search = params.toString();
  return `${ADMIN_HOME}/utilisateurs${search ? `?${search}` : ''}`;
}

const ROLES: Record<string, string> = {
  USER: 'Utilisateur',
  ADMIN: 'Admin',
  SUPERADMIN: 'Super-admin',
};

export function userRoleLabel(role: string): string {
  return ROLES[role] ?? role;
}

export function userStatusLabel(status: string): string {
  return status === 'SUSPENDED' ? 'Suspendu' : 'Actif';
}
