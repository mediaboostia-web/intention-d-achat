import { describe, expect, it, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import type { AdminUserList, AdminUserRow } from '@/lib/tamani/admin-users';
import { UserDetailView } from './UserDetailView';
import { UsersView } from './UsersView';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const AWA: AdminUserRow = {
  id: 'u_1',
  email: 'awa@test.local',
  name: 'Awa',
  role: 'USER',
  status: 'ACTIVE',
  verified: true,
  createdAt: '2026-11-01T10:00:00.000Z',
  shop: { id: 'org_1', name: 'Diallo Import', plan: 'WEEK' },
};

const LIST: AdminUserList = {
  items: [
    AWA,
    { ...AWA, id: 'u_2', email: 'sans@test.local', name: null, verified: false, shop: null },
  ],
  total: 2,
  page: 1,
  pages: 1,
};

describe('UsersView', () => {
  const view = (canCreate: boolean) => (
    <UsersView list={LIST} query={{ q: '', page: 1 }} canCreate={canCreate} />
  );

  it('lists each account with its role, status, shop and plan', () => {
    const t = text(view(false));
    expect(t).toContain('2 comptes');
    expect(t).toContain('awa@test.local');
    expect(t).toContain('Utilisateur');
    expect(t).toContain('Actif');
    expect(t).toContain('Diallo Import');
    expect(t).toContain('Pass Semaine');
    expect(t).toContain('Non vérifié');
    const out = html(view(false));
    expect(out).toContain('href="/support-admin/utilisateurs/u_1"');
    expect(out).toContain('href="/support-admin/boutiques/org_1"');
  });

  it('offers account creation to a super-admin only', () => {
    expect(html(view(false))).not.toContain('id="create-user"');
    expect(html(view(true))).toContain('id="create-user"');
  });
});

describe('UserDetailView', () => {
  const viewer = (role: string, id = 'admin_1') => ({ id, role });

  it('shows the account and its shop', () => {
    const t = text(<UserDetailView user={AWA} viewer={viewer('ADMIN')} />);
    expect(t).toContain('awa@test.local');
    expect(t).toContain('Diallo Import');
    expect(t).toContain('Renommer');
  });

  it('lets only a super-admin change a role', () => {
    expect(html(<UserDetailView user={AWA} viewer={viewer('ADMIN')} />)).not.toContain(
      'id="user-role"',
    );
    expect(html(<UserDetailView user={AWA} viewer={viewer('SUPERADMIN')} />)).toContain(
      'id="user-role"',
    );
  });

  it('suspends an active account, restores a suspended one (a super-admin’s call)', () => {
    expect(text(<UserDetailView user={AWA} viewer={viewer('ADMIN')} />)).toContain(
      'Suspendre le compte',
    );
    const suspended = { ...AWA, status: 'SUSPENDED' };
    expect(text(<UserDetailView user={suspended} viewer={viewer('SUPERADMIN')} />)).toContain(
      'Rétablir le compte',
    );
    expect(text(<UserDetailView user={suspended} viewer={viewer('ADMIN')} />)).not.toContain(
      'Rétablir le compte',
    );
  });

  it('never offers to suspend one’s own account', () => {
    expect(
      text(<UserDetailView user={{ ...AWA, id: 'admin_1' }} viewer={viewer('ADMIN')} />),
    ).not.toContain('Suspendre le compte');
  });
});
