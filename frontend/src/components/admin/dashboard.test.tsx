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
    series: [
      { month: '2026-06', total: 0 },
      { month: '2026-07', total: 3900 },
      { month: '2026-08', total: 5900 },
      { month: '2026-09', total: 3900 },
      { month: '2026-10', total: 9200 },
      { month: '2026-11', total: 13_800 },
    ],
  },
  mrr: 26_614,
  churn: { atStart: 8, churned: 1, rate: 0.125 },
  cac: { spend: 50_000, payers: 4, value: 12_500 },
  shops: {
    total: 10,
    active: 6,
    byPlan: { TRIAL: 2, WEEK: 3, MONTH: 1, FREE: 4 },
    byType: { WHOLESALER: 4, RETAILER: 1, NONE: 1 },
    byChannel: { STORE: 5, BOTH: 1 },
    byCountry: { BJ: 4, SN: 2 },
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
    expect(t).toContain('12,5 %');
    expect(t).toContain('1 boutique partie sur 8 qui avaient un pass le 1er novembre 2026');
    expect(t).toContain('12 500 FCFA');
    expect(t).toContain('50 000 FCFA de marketing ÷ 4 nouvelles boutiques payantes');
    expect(t).toContain('6 / 10');
  });

  it('compares the month’s money with the month before, with words and an arrow', () => {
    expect(text(view())).toContain('+50 % vs octobre');
    expect(html(view())).toContain('data-tone="up"');
  });

  it('draws six months of revenue, with the amounts in a table too', () => {
    const out = html(view());
    expect(out).toContain('aria-label="Encaissements des 6 derniers mois');
    const t = text(view());
    expect(t).toContain('Encaissements');
    expect(t).toMatch(/juin 2026\s*0 FCFA/);
    expect(t).toMatch(/novembre 2026\s*13 800 FCFA/);
  });

  it('ranks the passes sold by their part of the money', () => {
    const t = text(view());
    expect(t).toContain('Pass les plus vendus');
    expect(t).toMatch(/Pass Mois[\s\S]*71,7 %/);
    expect(t).toMatch(/Pass Semaine[\s\S]*28,3 %/);
    expect(t).toContain('Diallo Import');
    expect(t).toContain('Manuel');
    expect(t).toContain('SasPay');
  });

  it('splits the active shops by country, kind of business and where they sell', () => {
    const t = text(view());
    expect(t).toContain('Boutiques par pays');
    expect(t).toMatch(/Bénin\s*4\s*66,7 %/);
    expect(t).toMatch(/Sénégal\s*2\s*33,3 %/);
    expect(t).toContain('Détaillant');
    expect(t).toContain('Non renseigné');
    expect(t).toMatch(/Boutique physique\s*5\s*83,3 %/);
    expect(t).toContain('En ligne et en boutique');
    expect(t).toContain('Essai gratuit');
    expect(t).toContain('Sans pass');
    // The largest row fills its bar; the bar only helps the eye.
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
      revenue: {
        total: 0,
        last30Days: 0,
        byPass: [],
        payments: [],
        series: DATA.revenue.series.map((m) => ({ ...m, total: 0 })),
      },
      shops: { total: 0, active: 0, byPlan: {}, byType: {}, byChannel: {}, byCountry: {} },
      cac: { spend: null, payers: 0, value: null },
    };
    const t = text(
      <DashboardView data={empty} prevMonth="2026-10" nextMonth={null} canEdit={false} />,
    );
    expect(t).toContain('Aucun encaissement ce mois-ci.');
    expect(t).toContain('Aucune boutique active.');
    expect(t).toContain('Dépense marketing du mois non saisie');
    expect(t).not.toMatch(/NaN|undefined/);
    expect(t).not.toContain('vs octobre'); // nothing to compare with
  });
});
