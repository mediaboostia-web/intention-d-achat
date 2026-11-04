import { describe, expect, it, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import type { AdminShop, AdminShopList } from '@/lib/tamani/admin-shops';
import { ShopDetailView } from './ShopDetailView';
import { ShopsView } from './ShopsView';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const LIST: AdminShopList = {
  items: [
    {
      id: 'org_1',
      name: 'Diallo Import',
      country: 'GN',
      ownerEmail: 'awa@test.local',
      businessType: 'IMPORTER',
      salesChannel: 'BOTH',
      plan: 'WEEK',
      inGrace: true,
      endsAt: '2026-11-20T00:00:00.000Z',
      createdAt: '2026-11-01T10:00:00.000Z',
    },
  ],
  total: 61,
  page: 1,
  pages: 2,
};

const SHOP: AdminShop = {
  id: 'org_1',
  name: 'Diallo Import',
  slug: 'diallo-import',
  country: 'GN',
  businessType: null,
  salesChannel: 'ONLINE',
  createdAt: '2026-11-01T10:00:00.000Z',
  members: [{ email: 'awa@test.local', name: 'Awa', role: 'OWNER' }],
  pass: {
    plan: 'WEEK',
    inGrace: false,
    endsAt: '2026-11-20T00:00:00.000Z',
    used: 40,
    included: 150,
    pending: 3,
  },
  campaigns: { running: 2, drafts: 1, finished: 4, archived: 1 },
  purchases: [
    {
      id: 'ord_1',
      offer: 'WEEK',
      amount: 3900,
      currency: 'XOF',
      status: 'PAID',
      provider: 'saspay',
      at: '2026-11-13T08:01:00.000Z',
    },
    {
      id: 'ord_2',
      offer: 'UNLIMITED',
      amount: 0,
      currency: 'XOF',
      status: 'PAID',
      provider: 'manual',
      at: '2026-11-02T08:01:00.000Z',
    },
  ],
};

describe('ShopsView', () => {
  const view = () => <ShopsView list={LIST} query={{ q: 'awa', plan: null, page: 1 }} />;

  it('lists each shop with its owner, profile and plan in force', () => {
    const t = text(view());
    expect(t).toContain('61 boutiques');
    expect(t).toContain('Diallo Import');
    expect(t).toContain('awa@test.local');
    expect(t).toContain('Guinée');
    expect(t).toContain('Importateur');
    expect(t).toContain('En ligne et en boutique');
    expect(t).toContain('Pass Semaine (grâce)');
    expect(html(view())).toContain('href="/support-admin/boutiques/org_1"');
  });

  it('searches and filters through the address, keeping what was typed', () => {
    const out = html(view());
    expect(out).toMatch(/<form[^>]*action="\/support-admin\/boutiques"[^>]*>/);
    expect(out).toMatch(/name="q"[^>]*value="awa"|value="awa"[^>]*name="q"/);
    expect(out).toContain('name="forfait"');
  });

  it('pages, keeping the search', () => {
    expect(text(view())).toContain('Page 1 sur 2');
    expect(html(view())).toContain('href="/support-admin/boutiques?q=awa&amp;page=2"');
  });

  it('says so when nothing matches', () => {
    const empty = { items: [], total: 0, page: 1, pages: 1 };
    expect(text(<ShopsView list={empty} query={{ q: 'zzz', plan: null, page: 1 }} />)).toContain(
      'Aucune boutique ne correspond.',
    );
  });
});

describe('ShopDetailView', () => {
  it('shows the pass, its answers, the campaigns, the members and the purchases', () => {
    const t = text(<ShopDetailView shop={SHOP} canEdit={false} />);
    expect(t).toContain('Diallo Import');
    expect(t).toContain('Pass Semaine');
    expect(t).toContain('40 / 150 réponses');
    expect(t).toContain('3 en attente');
    expect(t).toMatch(/En cours\s*2/);
    expect(t).toContain('awa@test.local');
    expect(t).toContain('Propriétaire');
    expect(t).toContain('3 900 FCFA');
    expect(t).toContain('SasPay');
    expect(t).toContain('Pass Illimité');
    expect(t).toContain('Manuel');
    expect(t).toContain('Non renseigné');
  });

  it('lets a super-admin only grant or end a pass', () => {
    const viewer = html(<ShopDetailView shop={SHOP} canEdit={false} />);
    expect(viewer).not.toContain('id="grant-pass"');
    expect(viewer).not.toContain('Retirer le pass');
    const editor = html(<ShopDetailView shop={SHOP} canEdit />);
    expect(editor).toContain('id="grant-pass"');
    expect(editor).toContain('Retirer le pass');
  });

  it('has nothing to end for a shop without a pass', () => {
    const free = { ...SHOP, pass: { ...SHOP.pass, plan: 'FREE', endsAt: null } };
    expect(html(<ShopDetailView shop={free} canEdit />)).not.toContain('Retirer le pass');
  });
});
