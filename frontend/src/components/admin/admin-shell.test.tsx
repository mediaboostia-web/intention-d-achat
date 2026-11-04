import { describe, expect, it, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import { AdminShell } from './AdminShell';
import AdminRedirect from '@/app/(admin)/admin/page';
import { mockNextNavigation } from '@/test-utils/next-navigation';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

describe('AdminShell', () => {
  const shell = (pathname: string) => {
    mockNextNavigation({ pathname });
    return (
      <AdminShell email="hullys@example.com" role="SUPERADMIN">
        <p>contenu</p>
      </AdminShell>
    );
  };

  it('names the place, the admin and their role, then the page', () => {
    const t = text(shell('/support-admin'));
    expect(t).toContain('Support-admin');
    expect(t).toContain('hullys@example.com');
    expect(t).toContain('Super-admin');
    expect(t).toContain('contenu');
  });

  it('marks the current section only', () => {
    const out = html(shell('/support-admin/boutiques/org_1'));
    const current = [...out.matchAll(/<a [^>]*aria-current="page"[^>]*>/g)].map((m) => m[0]);
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="/support-admin/boutiques"');
  });
});

describe('/admin', () => {
  it('sends the old address to /support-admin', () => {
    expect(() => AdminRedirect()).toThrow('NEXT_REDIRECT /support-admin');
  });
});
