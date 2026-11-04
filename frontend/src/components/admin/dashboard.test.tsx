import { describe, expect, it, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import type { AdminDashboard } from '@/lib/tamani/admin-dashboard';
import { DashboardView } from './DashboardView';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const DATA: AdminDashboard = {
  month: '2026-11',
  revenue: {
    total: 13_800,
    last30Days: 17_700,
    byPass: [
      { offer: 'WEEK', count: 1, amount: 3900 },
      { offer: 'MONTH', count: 1, amount: 9900 },
    ],
    payments: [
      {
        id: 'o2',
        shopName: 'Diallo Import',
        offer: 'MONTH',
        amount: 9900,
        provider: 'manual',
        at: '2026-11-03T09:00:00.000Z',
      },
      {
        id: 'o1',
        shopName: 'Sow & Fils',
        offer: 'WEEK',
        amount: 3900,
        provider: 'saspay',
        at: '2026-11-02T09:00:00.000Z',
      },
    ],
  },
  mrr: 26_614,
  churn: { atStart: 8, churned: 1, rate: 0.125 },
  cac: { spend: 50_000, payers: 4, value: 12_500 },
  shops: {
    total: 10,
    active: 6,
    byPlan: { TRIAL: 2, WEEK: 3, MONTH: 1, FREE: 4 },
    byType: { WHOLESALER: 4, NONE: 2 },
    byChannel: { STORE: 5, BOTH: 1 },
  },
  campaigns: { running: 4, drafts: 3, finished: 3, archived: 2 },
  users: { total: 12, suspended: 1 },
};

const view = (over: Partial<Parameters<typeof DashboardView>[0]> = {}) => (
  <DashboardView data={DATA} prevMonth="2026-10" nextMonth={null} canEdit={false} {...over} />
);

describe('DashboardView', () => {
  it('shows the month’s figures, each with its calculation', () => {
    const t = text(view());
    expect(t).toContain('Encaissé en novembre 2026');
    expect(t).toContain('13 800 FCFA');
    expect(t).toContain('30 derniers jours : 17 700 FCFA');
    expect(t).toContain('MRR');
    expect(t).toContain('26 614 FCFA');
    // text() folds the no-break space before « % » into a plain one.
    expect(t).toContain('12,5 %');
    expect(t).toContain('1 boutique partie sur 8 qui avaient un pass le 1er novembre 2026');
    expect(t).toContain('12 500 FCFA');
    expect(t).toContain('50 000 FCFA de marketing ÷ 4 nouvelles boutiques payantes');
    expect(t).toContain('6 / 10');
  });

  it('lists the revenue by pass with its total, and the payments with their means', () => {
    const t = text(view());
    expect(t).toMatch(/Pass Semaine\s*1\s*3 900 FCFA/);
    expect(t).toMatch(/Pass Mois\s*1\s*9 900 FCFA/);
    expect(t).toMatch(/Total\s*2\s*13 800 FCFA/);
    expect(t).toContain('Diallo Import');
    expect(t).toContain('Manuel');
    expect(t).toContain('SasPay');
  });

  it('splits the shops by plan, kind of business and where they sell', () => {
    const t = text(view());
    expect(t).toContain('Essai gratuit');
    expect(t).toContain('Sans pass');
    expect(t).toContain('Grossiste');
    expect(t).toContain('Non renseigné');
    expect(t).toContain('Boutique physique');
    expect(t).toContain('En ligne et en boutique');
    // Each row's bar is drawn to scale and hidden from screen readers.
    expect(html(view())).toMatch(/aria-hidden="true"[^>]*style="width:100%"/);
  });

  it('counts the campaigns and the accounts', () => {
    const t = text(view());
    expect(t).toMatch(/En cours\s*4/);
    expect(t).toMatch(/Brouillons\s*3/);
    expect(t).toMatch(/Terminées\s*3/);
    expect(t).toMatch(/Archivées\s*2/);
    expect(t).toMatch(/Comptes\s*12/);
    expect(t).toMatch(/Suspendus\s*1/);
  });

  it('moves between months, never past the current one', () => {
    const out = html(view());
    expect(out).toContain('href="/support-admin?mois=2026-10"');
    expect(out).not.toContain('Mois suivant');
    expect(html(view({ nextMonth: '2026-12' }))).toContain('href="/support-admin?mois=2026-12"');
  });

  it('shows the spend form to a super-admin only', () => {
    expect(html(view())).not.toContain('id="marketing-spend"');
    expect(html(view({ canEdit: true }))).toContain('id="marketing-spend"');
  });

  it('says so when the month has no payment and no shop', () => {
    const empty: AdminDashboard = {
      ...DATA,
      revenue: { total: 0, last30Days: 0, byPass: [], payments: [] },
      mrr: 0,
      churn: { atStart: 0, churned: 0, rate: null },
      cac: { spend: null, payers: 0, value: null },
      shops: { total: 0, active: 0, byPlan: {}, byType: {}, byChannel: {} },
    };
    const t = text(view({ data: empty }));
    expect(t).toContain('Aucun encaissement ce mois-ci.');
    expect(t).toContain('Aucune boutique active.');
    expect(t).toContain('Dépense marketing du mois non saisie');
    expect(t).not.toContain('NaN');
  });
});
