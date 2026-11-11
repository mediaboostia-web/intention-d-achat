import { describe, expect, it } from 'vitest';
import { planFeatures } from './billing-view';
import { formatMoney } from './currency';
import {
  FORFAITS_FAQ,
  FORFAITS_TABS,
  cardLines,
  compareRows,
  forfaitOffers,
  forfaitsJsonLd,
  forfaitsMetadata,
  tabFromSearch,
} from './landing-forfaits';
import { PLANS } from './plans';

describe('the duration switch', () => {
  it("the two tabs hold the porteur's groups, Illimité in both", () => {
    expect(FORFAITS_TABS.map((t) => [t.id, t.label, [...t.offers]])).toEqual([
      ['court', 'Courte durée', ['TRIAL', 'WEEK', 'TWO_WEEKS', 'UNLIMITED']],
      ['mois', 'Au mois', ['MONTH', 'MONTH_PLUS', 'MONTH_MAX', 'UNLIMITED']],
    ]);
  });

  it('tabFromSearch opens « court » unless duree=mois', () => {
    expect(tabFromSearch('')).toBe('court');
    expect(tabFromSearch('?duree=mois')).toBe('mois');
    expect(tabFromSearch('?duree=xyz')).toBe('court');
    expect(tabFromSearch('?a=1&duree=mois')).toBe('mois');
  });
});

describe('the cards stay short', () => {
  it('the trial card says what it has and what it lacks', () => {
    expect(cardLines('TRIAL').map((f) => [f.label, f.included])).toEqual([
      ['1 campagne à la fois', true],
      ['La quantité à commander et le verdict', true],
      ['Les numéros des intéressés et WhatsApp', true],
      ['Un lien par groupe', false],
      ["L'export pour Excel", false],
      ['Sans « Propulsé par Tamani »', false],
    ]);
  });

  it('a pass card keeps four lines, all included', () => {
    expect(cardLines('MONTH').map((f) => [f.label, f.included])).toEqual([
      ['Campagnes illimitées', true],
      ['La quantité à commander et le verdict', true],
      ['Un lien par groupe', true],
      ["L'export pour Excel", true],
    ]);
  });

  it("forfaitOffers gives the page's prices: 0 for the trial, « Sur demande » for Illimité", () => {
    const offers = forfaitOffers();
    expect(offers.map((o) => o.id)).toEqual([
      'TRIAL',
      'WEEK',
      'TWO_WEEKS',
      'MONTH',
      'MONTH_PLUS',
      'MONTH_MAX',
      'UNLIMITED',
    ]);
    expect(offers[0]).toMatchObject({ price: formatMoney(0, 'XOF'), features: cardLines('TRIAL') });
    expect(offers[6]).toMatchObject({
      price: 'Sur demande',
      forWho: 'Pour les grossistes qui publient régulièrement dans de grandes communautés.',
    });
    // Who each offer is for, in the copy brief's words (§6.2).
    expect(offers.map((o) => o.forWho)).toEqual([
      'Pour découvrir Tamani sur une première campagne.',
      'Pour tester un arrivage ou recueillir des demandes sur une courte période.',
      'Pour suivre les demandes pendant deux semaines et préparer ton prochain approvisionnement.',
      'Pour gérer tes campagnes et suivre les demandes pendant tout un mois.',
      'Pour les boutiques et communautés qui recueillent un volume important de demandes.',
      'Pour les vendeurs qui recueillent un volume élevé de réponses.',
      'Pour les grossistes qui publient régulièrement dans de grandes communautés.',
    ]);
    expect(offers.filter((o) => o.badge).map((o) => o.id)).toEqual(['MONTH_MAX']);
  });
});

describe('the comparison table', () => {
  it('has the price, duration, answers and campaigns first, then every feature', () => {
    const rows = compareRows();
    expect(rows.slice(0, 4).map((r) => r.label)).toEqual([
      'Prix',
      'Durée',
      'Réponses incluses',
      'Campagnes à la fois',
    ]);
    expect(rows[0]?.cells[0]).toBe(formatMoney(0, 'XOF'));
    expect(rows[0]?.cells[1]).toBe(formatMoney(PLANS.WEEK.priceXof ?? 0, 'XOF'));
    expect(rows[0]?.cells[6]).toBe('Sur demande');
    expect(rows[3]?.cells[0]).toBe('1');
    expect(rows[3]?.cells[1]).toBe('Illimitées');
    expect(rows.slice(4).map((r) => r.label)).toEqual(
      planFeatures('WEEK')
        .slice(1)
        .map((f) => f.label),
    );
    for (const r of rows) expect(r.cells, r.label).toHaveLength(7);
  });
});

describe('the pricing page for search engines', () => {
  it('forfaitsMetadata: own title, canonical /forfaits, the lowest and dearest pass in the description', () => {
    const m = forfaitsMetadata('https://tamani.app/');
    expect(m.title).toEqual({
      absolute: 'Tarifs Tamani | Forfaits pour grossistes et vendeurs en ligne',
    });
    expect(m.alternates?.canonical).toBe('https://tamani.app/forfaits');
    expect(String(m.description)).toContain('Compare les forfaits Tamani : 7, 14 ou 30 jours');
    expect(String(m.description)).toContain(formatMoney(PLANS.MONTH_MAX.priceXof ?? 0, 'XOF'));
    expect(String(m.description)).toContain('Aucun renouvellement automatique.');
    expect(String(m.description).length).toBeLessThanOrEqual(160);
    expect(m.openGraph).toMatchObject({ url: 'https://tamani.app/forfaits' });
  });

  it('forfaitsJsonLd has its own FAQPage with the six pricing questions', () => {
    const ld = forfaitsJsonLd('https://tamani.app/');
    expect(ld['@type']).toBe('FAQPage');
    const q = ld['mainEntity'] as { name: string; acceptedAnswer: { text: string } }[];
    expect(q.map((x) => x.name)).toEqual(FORFAITS_FAQ.map((f) => f.question));
    expect(FORFAITS_FAQ.map((f) => f.question)).toEqual([
      'Comment payer mon pass ?',
      'Le pass se renouvelle-t-il automatiquement ?',
      'Que se passe-t-il à la fin de mon pass ?',
      "Que se passe-t-il si j'atteins mon quota de réponses ?",
      'Puis-je changer de pass ?',
      "L'essai gratuit demande-t-il une carte bancaire ?",
    ]);
  });

  it('says the end of a pass as the CGU do: 3 days of grace, answers kept waiting, unused ones lost after', () => {
    const end = FORFAITS_FAQ.find((f) => f.question.includes('fin de mon pass'))?.answer ?? '';
    expect(end).toContain('3 jours de grâce');
    expect(end).toContain('gardées en attente');
    expect(end).toContain('perdues');
    const trial = FORFAITS_FAQ.find((f) => f.question.startsWith("L'essai"))?.answer ?? '';
    expect(trial).toMatch(/^Non\. /);
    expect(trial).toContain(
      `${PLANS.TRIAL.durationDays} jours ou ${PLANS.TRIAL.includedResponses} réponses, selon la première limite atteinte`,
    );
  });

  it('speaks of passes without dashes', () => {
    const copy = JSON.stringify([FORFAITS_FAQ, forfaitOffers(), forfaitsMetadata('https://x.y')]);
    expect(copy).not.toMatch(/[–—]/);
    expect(copy).not.toMatch(/\bPro\b|forfait Gratuit|12 mois/);
  });
});
