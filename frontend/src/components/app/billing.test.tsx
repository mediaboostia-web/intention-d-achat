// The pass in the shop space (lot 8): its page, the return page, the banners.
import { describe, expect, it, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import { PassMeter } from '@/components/ui';
import { PASS_FEATURES, type BillingData } from '@/lib/tamani/billing-view';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const { BillingView, ReturnView } = await import('./BillingView');
const { ShellBanners } = await import('./ShellBanners');

const NOW = new Date('2026-10-29T10:00:00Z');
const DATA: BillingData = {
  pass: {
    plan: 'MONTH',
    label: 'Pass Mois',
    endsAt: '2026-11-12T10:00:00.000Z',
    inGrace: false,
    used: 850,
    included: 1000,
    pending: 0,
  },
  perCampaign: [
    { campaignId: 'c1', title: 'Riz parfumé', used: 600 },
    { campaignId: 'c2', title: 'Marmites', used: 250 },
  ],
  purchases: [
    {
      id: 'ord_1',
      offer: 'MONTH',
      amount: 9900,
      status: 'PAID',
      createdAt: '2026-10-13T10:00:00.000Z',
      activated: true,
    },
  ],
  paymentAvailable: true,
};
const NO_PASS: BillingData = {
  ...DATA,
  pass: {
    plan: 'FREE',
    label: 'Sans pass',
    endsAt: null,
    inGrace: false,
    used: 0,
    included: 0,
    pending: 87,
  },
  perCampaign: [],
  purchases: [],
};

const view = (over: Partial<Parameters<typeof BillingView>[0]> = {}) => (
  <BillingView
    data={DATA}
    role="OWNER"
    currency="XOF"
    country="SN"
    now={NOW}
    busy={null}
    error={null}
    help={null}
    onChoose={() => {}}
    {...over}
  />
);
const buttons = (out: string) =>
  [...out.matchAll(/<button[^>]*>(.*?)<\/button>/gs)].map((m) => m[1]);

describe('BillingView', () => {
  it('the subscription page lists five passes, the best value badge on Mois Max', () => {
    const t = text(view());
    for (const name of [
      'Pass Semaine',
      'Pass 2 Semaines',
      'Pass Mois',
      'Pass Mois Plus',
      'Pass Mois Max',
    ])
      expect(t).toContain(name);
    expect(t).toContain('3 900 FCFA');
    expect(t).toContain('24 900 FCFA');
    const out = html(view());
    expect(buttons(out).filter((b) => b?.includes('Choisir'))).toHaveLength(5);
    // The badge sits on the Mois Max card only.
    const cards = out.split('<li>').filter((c) => c.includes('Le meilleur prix par réponse'));
    expect(cards).toHaveLength(1);
    expect(cards[0]).toContain('Pass Mois Max</h3>');
  });

  it('the pass page lists what every pass includes', () => {
    const t = text(view());
    expect(t).toContain('Dans chaque pass');
    for (const f of PASS_FEATURES) expect(t).toContain(f);
  });

  it('the subscription page shows the per-campaign detail', () => {
    const t = text(view());
    expect(t).toContain('Réponses par campagne');
    expect(t).toContain('Riz parfumé');
    expect(t).toContain('600');
    expect(t).toContain('Marmites');
    expect(t).toContain('9 900 FCFA');
    expect(t).toContain('Actif');
  });

  it('no top-up anywhere: a full meter offers another pass', () => {
    const full = { ...DATA, pass: { ...DATA.pass, used: 1000 } };
    const t = text(view({ data: full }));
    expect(t).toContain('Prendre un autre pass');
    expect(t).toMatch(/il démarre tout de suite et garde tes réponses non utilisées/);
    expect(t).not.toMatch(/recharge/i);
  });

  it('a GN shop sees « Bientôt disponible » and no buy button', () => {
    const out = html(
      view({ country: 'GN', currency: 'GNF', data: { ...DATA, paymentAvailable: false } }),
    );
    expect(
      text(view({ country: 'GN', currency: 'GNF', data: { ...DATA, paymentAvailable: false } })),
    ).toContain('Bientôt disponible');
    expect(buttons(out).some((b) => b?.includes('Choisir'))).toBe(false);
  });

  it('a MEMBER sees why they cannot buy', () => {
    const out = html(view({ role: 'MEMBER' }));
    expect(text(view({ role: 'MEMBER' }))).toContain(
      'Seul le propriétaire ou un administrateur de la boutique peut prendre un pass.',
    );
    expect(buttons(out).some((b) => b?.includes('Choisir'))).toBe(false);
  });

  it('without a pass: the pending answers and the Illimité on quote', () => {
    const t = text(view({ data: NO_PASS, help: 'https://wa.me/221770000000' }));
    expect(t).toContain('Sans pass · 87 réponses en attente');
    expect(t).toContain('Prendre un pass');
    expect(t).toContain('Pass Illimité');
    expect(t).toContain('Contacter le support');
    expect(text(view({ data: NO_PASS }))).not.toContain('Contacter le support');
  });

  it('while a checkout opens, its card says so and every button waits', () => {
    const out = html(view({ busy: 'WEEK' }));
    expect(out).toContain('Ouverture du paiement…');
    const choices = [...out.matchAll(/<button[^>]*>/g)].map((m) => m[0]);
    expect(choices.length).toBe(5);
    expect(choices.every((b) => b.includes('disabled'))).toBe(true);
  });
});

describe('ShellBanners', () => {
  it('the grace banner and the pending banner', () => {
    const grace = html(
      <ShellBanners
        plan={{ id: 'MONTH', inGrace: true, endsAt: '2026-11-01T09:00:00.000Z' }}
        pending={0}
        now={NOW}
      />,
    );
    expect(grace).toContain('Ton pass est terminé. Il te reste 3 jours pour le racheter.');
    expect(grace).toContain('href="/app/abonnement"');
    const pending = text(
      <ShellBanners plan={{ id: 'FREE', inGrace: false, endsAt: null }} pending={87} now={NOW} />,
    );
    expect(pending).toContain("87 réponses t'attendent. Prends un pass pour les voir.");
    expect(
      html(
        <ShellBanners plan={{ id: 'MONTH', inGrace: false, endsAt: null }} pending={0} now={NOW} />,
      ),
    ).toBe('');
  });
});

describe('ReturnView', () => {
  it('the return page states checking, active and failed', () => {
    expect(
      text(<ReturnView state="checking" offer="MONTH" timedOut={false} onRetry={() => {}} />),
    ).toContain('On vérifie ton paiement');
    const active = <ReturnView state="active" offer="MONTH" timedOut={false} onRetry={() => {}} />;
    expect(text(active)).toContain('Ton Pass Mois est actif');
    expect(html(active)).toContain('href="/app/abonnement"');
    const failed = text(
      <ReturnView state="failed" offer="WEEK" timedOut={false} onRetry={() => {}} />,
    );
    expect(failed).toContain("Le paiement n'est pas passé");
    expect(failed).toContain('Réessayer');
    const slow = html(<ReturnView state="checking" offer="MONTH" timedOut onRetry={() => {}} />);
    expect(buttons(slow).some((b) => b?.includes('Vérifier encore'))).toBe(true);
  });
});

describe('PassMeter', () => {
  it('draws the meter with its tone and the way to a pass', () => {
    const out = html(<PassMeter usage={DATA.pass} canBuy now={NOW} />);
    expect(out).toMatch(/role="meter"/);
    expect(out).toContain('aria-valuenow="850"');
    expect(out).toContain('data-tone="warning"');
    expect(text(<PassMeter usage={DATA.pass} canBuy now={NOW} />)).toContain(
      'Prendre un autre pass',
    );
    expect(text(<PassMeter usage={NO_PASS.pass} canBuy now={NOW} />)).toContain('Prendre un pass');
    expect(html(<PassMeter usage={DATA.pass} canBuy={false} now={NOW} />)).not.toContain('href=');
  });
});
