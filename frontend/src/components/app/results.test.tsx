import { describe, it, expect, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import {
  campaignTab,
  campaignTabs,
  coefNote,
  percentRows,
  priceSignal,
  provisionalNote,
  stockAdviceDisplay,
  stockLine,
  toServeLine,
  type CampaignResult,
  type CampaignStatsBody,
} from '@/lib/tamani/results-view';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const { CampaignResults } = await import('./CampaignResults');

const stats: CampaignStatsBody['stats'] = {
  availability: 'INCOMING',
  opens: 340,
  completed: 94,
  incomplete: 12,
  lockedCount: 0,
  suspiciousCount: 0,
  interested: 64,
  notInterested: 30,
  interestRate: 64 / 94,
  announced: 350,
  reference: 400,
  stock: null,
  byBuyerType: {
    CONSUMER: { respondents: 42, announced: 170 },
    RESELLER: { respondents: 22, announced: 180 },
  },
  byZone: [{ zoneId: 'z1', name: 'Médina', respondents: 24, quantity: 120 }],
  pickup: { respondents: 10, quantity: 40 },
  byTiming: [
    { timing: 'ON_ARRIVAL', respondents: 38, quantity: 210 },
    { timing: 'WEEK_AFTER', respondents: 19, quantity: 100 },
    { timing: 'LATER', respondents: 7, quantity: 40 },
  ],
  byOption: [],
  bySource: [{ linkId: 'l1', label: 'Lien principal', opens: 340, completed: 94, interested: 64 }],
  noReasons: [
    { reason: 'TOO_EXPENSIVE', count: 7 },
    { reason: 'NO_NEED', count: 3 },
  ],
  result: {
    estimate: {
      announced: 350,
      realistic: 211,
      low: 176,
      high: 246,
      byBuyerType: {
        CONSUMER: { respondents: 42, announced: 170, realistic: 85 },
        RESELLER: { respondents: 22, announced: 180, realistic: 126 },
      },
    },
    coefs: { consumer: 0.5, reseller: 0.7, source: { consumer: 'DEFAULT', reseller: 'DEFAULT' } },
    verdict: { code: 'CAUTION', ratio: 211 / 400, missingResponses: 0 },
    money: { avoidedDeadStock: 850500, expectedProfit: 444000 },
    stockStatus: null,
    stockAdvice: null,
  },
};

const render = (body: Omit<CampaignStatsBody, 'offerOpen'> & { offerOpen?: boolean }) => (
  <CampaignResults
    body={{ offerOpen: false, ...body }}
    campaignId="c1"
    productId="p1"
    unitLabel="pièce"
  />
);

describe('CampaignResults', () => {
  it('shows the verdict, the gauge, the calculation and the money', () => {
    const el = render({ stats, access: 'PLAN' });
    const t = text(el);
    expect(t).toContain('Prudence');
    expect(t).toContain('Entre 176 et 246 pièces');
    expect(t).toContain('réaliste 211');
    expect(t).toContain("Comment c'est calculé ?");
    expect(t).toContain('Sur 10 revendeurs qui disent oui, 7 achètent vraiment');
    expect(t).toContain('850 500');
    expect(t).toContain('Voir les 64 intéressés');
    expect(t).not.toContain('Verdict offert');
    expect(html(el)).toContain('href="/app/campagnes/c1?onglet=interesses"');
  });

  it('the offered verdict says so', () => {
    expect(text(render({ stats, access: 'OFFERED' }))).toContain(
      "Verdict offert pour ta première campagne. Avec Pro, tu l'as sur toutes.",
    );
  });

  it('a locked verdict gives the answers and the announced demand, and leads to Pro', () => {
    const el = render({ stats: { ...stats, result: null }, access: 'LOCKED' });
    const t = text(el);
    expect(t).toContain('Combien commander ?');
    expect(t).toContain('94 réponses');
    expect(t).toContain('350 pièces annoncées');
    expect(t).toContain('Pro');
    expect(t).not.toContain('Prudence');
    expect(t).not.toContain('211');
    expect(html(el)).toContain('href="/app/plus"');
  });

  it('a free shop whose offered verdict is still to give is told it is coming', () => {
    const el = render({
      stats: { ...stats, completed: 12, result: null },
      access: 'LOCKED',
      offerOpen: true,
    });
    expect(text(el)).toContain(
      "Ton premier verdict est offert. Il arrive dès qu'une campagne atteint 20 réponses : encore 8 pour celle-ci.",
    );
  });

  it('a campaign without a counted answer leads to Share', () => {
    const el = render({
      stats: { ...stats, completed: 0, interested: 0, notInterested: 0 },
      access: 'PLAN',
    });
    expect(text(el)).toContain('Pas encore de réponse');
    expect(html(el)).toContain('href="/app/campagnes/c1?onglet=partager"');
    expect(text(el)).not.toContain('Voir les');
  });

  it('warns when the realistic demand is beyond the stock', () => {
    const el = render({
      stats: {
        ...stats,
        stock: 150,
        result: { ...stats.result!, stockStatus: 'SHORTAGE' },
      },
      access: 'PLAN',
    });
    expect(text(el)).toContain('La demande réaliste (~210 pièces) dépasse ton stock de 150.');
  });

  it('pending answers have their notice', () => {
    expect(text(render({ stats: { ...stats, lockedCount: 3 }, access: 'PLAN' }))).toContain(
      '3 réponses en attente',
    );
  });

  it('the pending notice keeps a non-breaking space before its colon', () => {
    expect(html(render({ stats: { ...stats, lockedCount: 3 }, access: 'PLAN' }))).toContain(
      '3 réponses en attente : ton forfait',
    );
  });

  it('leaves out a buyer type nobody chose', () => {
    const t = text(
      render({
        stats: {
          ...stats,
          byBuyerType: { ...stats.byBuyerType, RESELLER: { respondents: 0, announced: 0 } },
        },
        access: 'PLAN',
      }),
    );
    expect(t).toContain('Usagers 42 · 170 pièces');
    expect(t).not.toMatch(/Revendeurs 0/);
  });

  it('lists where, when and the price signal', () => {
    const t = text(render({ stats, access: 'PLAN' }));
    expect(t).toContain('Où livrer');
    expect(t).toContain('Médina');
    expect(t).toContain('Retrait sur place');
    expect(t).toContain("Dès l'arrivée 59 %");
    expect(t).toContain('7 « non » sur 30 : trop cher');
    // One source: no source list.
    expect(t).not.toContain('Lien principal');
  });
});

const inStock = (
  over: Partial<CampaignStatsBody['stats']> = {},
  result: Partial<CampaignResult> = {},
): CampaignStatsBody['stats'] => ({
  ...stats,
  availability: 'IN_STOCK',
  completed: 1,
  interested: 1,
  notInterested: 0,
  interestRate: 1,
  announced: 12,
  reference: 30,
  stock: 30,
  byBuyerType: {
    CONSUMER: { respondents: 1, announced: 12 },
    RESELLER: { respondents: 0, announced: 0 },
  },
  byZone: [],
  pickup: { respondents: 0, quantity: 0 },
  byTiming: [{ timing: 'THIS_WEEK', respondents: 1, quantity: 12 }],
  noReasons: [],
  result: {
    ...stats.result!,
    estimate: {
      announced: 12,
      realistic: 6,
      low: 5,
      high: 7,
      byBuyerType: {
        CONSUMER: { respondents: 1, announced: 12, realistic: 6 },
        RESELLER: { respondents: 0, announced: 0, realistic: 0 },
      },
    },
    verdict: { code: 'WAIT', ratio: null, missingResponses: 19 },
    money: null,
    stockStatus: 'ENOUGH',
    stockAdvice: { status: 'ENOUGH', leftover: 24, restock: 0, provisional: true },
    ...result,
  },
  ...over,
});

describe('CampaignResults for an in-stock campaign', () => {
  it('leads with the people to serve and its stock, never a wait', () => {
    const el = render({ stats: inStock(), access: 'PLAN' });
    const t = text(el);
    expect(t).toContain('À servir maintenant');
    expect(t).toContain('1 intéressé · 12 pièces');
    expect(t).toContain('Cette semaine');
    expect(t).toContain('Stock suffisant');
    expect(t).toContain("Il t'en restera environ 24 pièces.");
    expect(t).toContain('Estimation provisoire : 1 réponse sur 20.');
    expect(t).toContain('en stock 30');
    expect(t).not.toContain('On attend');
    expect(t).not.toContain('prévu');
    expect(html(el)).toContain('href="/app/campagnes/c1?onglet=interesses"');
  });

  it('asks for a restock on a shortage and avoids no dead stock', () => {
    const el = render({
      stats: inStock(
        { completed: 25, interested: 25, announced: 100 },
        {
          stockStatus: 'SHORTAGE',
          stockAdvice: { status: 'SHORTAGE', leftover: 0, restock: 40, provisional: false },
          money: { avoidedDeadStock: null, expectedProfit: 40000 },
          verdict: { code: 'STOP', ratio: 0.3, missingResponses: 0 },
        },
      ),
      access: 'PLAN',
    });
    const t = text(el);
    expect(t).toContain('Réassort');
    expect(t).toContain('~40');
    expect(t).toContain("Rupture probable : prévois un réassort d'environ 40 pièces.");
    expect(t).not.toContain('provisoire');
    expect(t).not.toContain('dormi au dépôt');
    expect(t).not.toContain('Prévois de recommander');
  });

  it('keeps the people to serve when the stock reading is locked', () => {
    const t = text(render({ stats: inStock(), access: 'LOCKED' }));
    expect(t).toContain('À servir maintenant');
    expect(t).toContain('Ton stock va-t-il suffire ?');
    expect(t).toContain('Pro');
    expect(t).not.toContain('Stock suffisant');
  });

  it('asks for the stock when the campaign has none', () => {
    const el = render({
      stats: inStock({ stock: null, reference: null }, { stockStatus: null, stockAdvice: null }),
      access: 'PLAN',
    });
    expect(text(el)).toContain("Indique ton stock dans la campagne pour savoir s'il suffira.");
    expect(html(el)).toContain('href="/app/campagnes/c1?onglet=modifier"');
  });
});

describe('result sentences', () => {
  it('stockAdviceDisplay stamps the stock when it is enough', () => {
    expect(
      stockAdviceDisplay(
        { status: 'ENOUGH', leftover: 24, restock: 0, provisional: true },
        30,
        'pièce',
      ),
    ).toEqual({
      word: 'Stock suffisant',
      figure: '30',
      unit: 'pièces en stock',
      sentence: "Il t'en restera environ 24 pièces.",
      tone: 'success',
    });
    expect(
      stockAdviceDisplay(
        { status: 'ENOUGH', leftover: 0, restock: 0, provisional: false },
        30,
        'pièce',
      ).sentence,
    ).toBe('Tout ton stock devrait partir.');
  });

  it('stockAdviceDisplay stamps the restock, rounded like the verdict', () => {
    expect(
      stockAdviceDisplay(
        { status: 'SHORTAGE', leftover: 0, restock: 211, provisional: false },
        30,
        'sac',
      ),
    ).toEqual({
      word: 'Réassort',
      figure: '~210',
      unit: 'sacs',
      sentence: "Rupture probable : prévois un réassort d'environ 210 sacs.",
      tone: 'warning',
    });
  });

  it('provisionalNote and toServeLine count in French', () => {
    expect(provisionalNote(1)).toBe('Estimation provisoire : 1 réponse sur 20.');
    expect(provisionalNote(12)).toBe('Estimation provisoire : 12 réponses sur 20.');
    expect(toServeLine(6, 12, 'bouteille')).toBe('6 intéressés · 12 bouteilles');
    expect(toServeLine(1, 1, 'pièce')).toBe('1 intéressé · 1 pièce');
  });

  it('percentRows gives each share of the total', () => {
    expect(
      percentRows([
        { id: 'a', label: 'A', count: 3 },
        { id: 'b', label: 'B', count: 1 },
      ]),
    ).toEqual([
      { id: 'a', label: 'A', value: '75 %' },
      { id: 'b', label: 'B', value: '25 %' },
    ]);
    expect(percentRows([])).toEqual([]);
  });

  it('priceSignal circles the most frequent no', () => {
    expect(priceSignal(stats.noReasons, 30)).toEqual({
      lead: '7 « non » sur 30 :',
      word: 'trop cher',
    });
    expect(priceSignal([], 0)).toBeNull();
  });

  it('stockLine speaks only of a shortage', () => {
    expect(stockLine({ status: 'SHORTAGE', realistic: 211, stock: 150, unitLabel: 'sac' })).toBe(
      'La demande réaliste (~210 sacs) dépasse ton stock de 150. Prévois de recommander.',
    );
    expect(
      stockLine({ status: 'ENOUGH', realistic: 100, stock: 150, unitLabel: 'sac' }),
    ).toBeNull();
  });

  it('coefNote reads the coefficients and where they come from', () => {
    expect(coefNote(stats.result!.coefs)).toBe(
      'Sur 10 revendeurs qui disent oui, 7 achètent vraiment ; sur 10 usagers, 5. Ce sont les valeurs de départ, tu peux les régler dans Réglages.',
    );
    expect(
      coefNote({
        consumer: 0.45,
        reseller: 0.8,
        source: { consumer: 'SHOP', reseller: 'DEFAULT' },
      }),
    ).toBe(
      'Sur 10 revendeurs qui disent oui, 8 achètent vraiment ; sur 10 usagers, 4,5. Ce sont tes réglages.',
    );
  });
});

describe('campaign tabs', () => {
  it('opens on Results, a draft and a fresh campaign on Share', () => {
    expect(campaignTab(null, null, 'ACTIVE')).toBe('results');
    expect(campaignTab('interesses', null, 'ACTIVE')).toBe('interested');
    expect(campaignTab('partager', null, 'ACTIVE')).toBe('share');
    expect(campaignTab('modifier', null, 'ACTIVE')).toBe('edit');
    expect(campaignTab(null, '1', 'ACTIVE')).toBe('share');
    expect(campaignTab(null, null, 'DRAFT')).toBe('share');
    expect(campaignTab('resultats', null, 'DRAFT')).toBe('results');
  });

  it('lists the four tabs with their links', () => {
    expect(campaignTabs('/app/campagnes/c1', 'interested', 'ACTIVE')).toEqual([
      { id: 'results', label: 'Résultats', href: '/app/campagnes/c1', active: false },
      {
        id: 'interested',
        label: 'Intéressés',
        href: '/app/campagnes/c1?onglet=interesses',
        active: true,
      },
      { id: 'share', label: 'Partager', href: '/app/campagnes/c1?onglet=partager', active: false },
      { id: 'edit', label: 'Modifier', href: '/app/campagnes/c1?onglet=modifier', active: false },
    ]);
    expect(campaignTabs('/app/campagnes/c1', 'share', 'DRAFT')[0]?.href).toBe(
      '/app/campagnes/c1?onglet=resultats',
    );
  });
});
