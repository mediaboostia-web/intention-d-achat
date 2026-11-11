import { describe, expect, it, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import { AuthProvider } from '@/contexts/AuthContext';
import { AdminShell } from './AdminShell';
import AdminRedirect from '@/app/(admin)/admin/page';
import { mockNextNavigation } from '@/test-utils/next-navigation';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

describe('AdminShell', () => {
  const shell = (pathname: string) => {
    mockNextNavigation({ pathname });
    return (
      <AuthProvider>
        <AdminShell email="hullys@example.com" role="SUPERADMIN">
          <p>contenu</p>
        </AdminShell>
      </AuthProvider>
    );
  };

  it('names the place, the admin and their role, then the page', () => {
    const t = text(shell('/support-admin'));
    expect(t).toContain('Support-admin');
    expect(t).toContain('hullys@example.com');
    expect(t).toContain('Super-admin');
    expect(t).toContain('contenu');
    expect(t).toContain('Se déconnecter');
    // The search goes to the shops list.
    expect(html(shell('/support-admin'))).toContain('action="/support-admin/boutiques"');
  });

  it('marks the current section only', () => {
    const out = html(shell('/support-admin/boutiques/org_1'));
    const current = [...out.matchAll(/<a [^>]*aria-current="page"[^>]*>/g)].map((m) => m[0]);
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="/support-admin/boutiques"');
  });
});

describe('the notifications badge (lot 13a)', () => {
  const nav = (unread: number) => {
    mockNextNavigation({ pathname: '/support-admin' });
    return html(
      <AuthProvider>
        <AdminShell email="hullys@example.com" role="SUPERADMIN" unread={unread}>
          <p>contenu</p>
        </AdminShell>
      </AuthProvider>,
    );
  };
  const link = (out: string) =>
    out.match(/<a [^>]*href="\/support-admin\/notifications"[^>]*>[\s\S]*?<\/a>/)?.[0] ?? '';

  it('shows how many are new on the Notifications link, with a spoken name', () => {
    const a = link(nav(3));
    expect(a).toContain('data-unread="3"');
    expect(a).toContain('3 nouvelles notifications');
  });

  it('shows no badge when nothing is new', () => {
    const a = link(nav(0));
    expect(a).not.toContain('data-unread');
    expect(a).not.toContain('nouvelle');
  });
});

describe('/admin', () => {
  it('sends the old address to /support-admin', () => {
    expect(() => AdminRedirect()).toThrow('NEXT_REDIRECT /support-admin');
  });
});
