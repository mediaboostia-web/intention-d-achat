import { describe, it, expect } from 'vitest';
import {
  LANDING_DESCRIPTION,
  LANDING_FAQ,
  LANDING_TITLE,
  clampPercent,
  landingJsonLd,
  landingMetadata,
  navStep,
  pickWeighted,
  pricingOffers,
} from './landing';
import { PLANS } from './plans';

describe('pricingOffers reads PLANS', () => {
  it("seven cards in the porteur's order, each with who it is for", () => {
    const offers = pricingOffers();
    expect(offers.map((o) => [o.id, o.forWho])).toEqual([
      ['TRIAL', 'Pour voir Tamani marcher sur un produit.'],
      ['WEEK', 'Pour un arrivage à écouler vite.'],
      ['TWO_WEEKS', 'Pour deux semaines de ventes.'],
      ['MONTH', 'Pour vendre tout le mois.'],
      ['MONTH_PLUS', 'Pour un groupe actif.'],
      ['MONTH_MAX', 'Pour les grands groupes.'],
      ['UNLIMITED', 'Pour les très grandes communautés.'],
    ]);
    expect(offers[0]).toEqual({
      id: 'TRIAL',
      name: 'Essai gratuit',
      price: 'Gratuit',
      durationLabel: '3 jours',
      responsesLabel: '50 réponses',
      forWho: 'Pour voir Tamani marcher sur un produit.',
    });
    expect(offers[5]).toEqual({
      id: 'MONTH_MAX',
      name: 'Pass Mois Max',
      price: '24 900 FCFA',
      durationLabel: '30 jours',
      responsesLabel: '5 000 réponses',
      forWho: 'Pour les grands groupes.',
      badge: 'Le meilleur prix par réponse',
    });
    expect(offers.filter((o) => o.badge).map((o) => o.id)).toEqual(['MONTH_MAX']);
    expect(offers[6]).toMatchObject({ name: 'Pass Illimité', price: 'Sur devis' });
  });
});

describe('navStep', () => {
  const shown = { lastY: 400, hidden: false };

  it('hides on the way down and shows on the way up', () => {
    const down = navStep(shown, 480, false);
    expect(down).toEqual({ lastY: 480, hidden: true });
    expect(navStep(down, 460, false)).toEqual({ lastY: 460, hidden: false });
  });

  it('keeps the bar while busy (menu open or keyboard focus inside)', () => {
    expect(navStep(shown, 600, true)).toEqual({ lastY: 600, hidden: false });
  });

  it('shows the bar near the top', () => {
    expect(navStep({ lastY: 400, hidden: true }, 100, false)).toEqual({
      lastY: 100,
      hidden: false,
    });
    expect(navStep({ lastY: 0, hidden: false }, 110, false).hidden).toBe(false);
  });

  it('ignores jitter under 6 px', () => {
    expect(navStep(shown, 404, false)).toEqual(shown);
    expect(navStep({ lastY: 400, hidden: true }, 396, false)).toEqual({ lastY: 400, hidden: true });
  });
});

describe('pickWeighted', () => {
  it('maps r in [0, 1) onto the weights', () => {
    expect(pickWeighted([1, 1], 0.2)).toBe(0);
    expect(pickWeighted([1, 1], 0.7)).toBe(1);
    expect(pickWeighted([0, 3], 0)).toBe(1);
    expect(pickWeighted([5, 1], 0.999)).toBe(1);
  });
});

describe('clampPercent', () => {
  it('keeps a position between 0 and 100', () => {
    expect(clampPercent(-4)).toBe(0);
    expect(clampPercent(140)).toBe(100);
    expect(clampPercent(37.5)).toBe(37.5);
  });
});

describe('landingJsonLd', () => {
  const ld = landingJsonLd('https://tamani.app/');
  const graph = ld['@graph'] as Record<string, unknown>[];
  const byType = (t: string) => graph.find((n) => n['@type'] === t) as Record<string, unknown>;

  it('names the organisation and the site at APP_URL', () => {
    expect(byType('Organization')['url']).toBe('https://tamani.app/');
    expect(byType('WebSite')['@id']).toBe('https://tamani.app/#site');
  });

  it('JSON-LD lists the five passes in XOF', () => {
    const offers = byType('SoftwareApplication')['offers'] as {
      name: string;
      price: string;
      priceCurrency: string;
    }[];
    expect(offers.map((o) => [o.name, o.price, o.priceCurrency])).toEqual([
      ['Essai gratuit', '0', 'XOF'],
      ['Pass Semaine', '3900', 'XOF'],
      ['Pass 2 Semaines', '5900', 'XOF'],
      ['Pass Mois', '9900', 'XOF'],
      ['Pass Mois Plus', '14900', 'XOF'],
      ['Pass Mois Max', '24900', 'XOF'],
    ]);
  });

  it('the FAQ JSON-LD repeats LANDING_FAQ', () => {
    const faq = byType('FAQPage')['mainEntity'] as {
      name: string;
      acceptedAnswer: { text: string };
    }[];
    expect(faq).toHaveLength(LANDING_FAQ.length);
    expect(faq.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(
      LANDING_FAQ.map((q) => [q.question, q.answer]),
    );
  });
});

describe('landingMetadata', () => {
  it('uses APP_URL for canonical and og:url', () => {
    const m = landingMetadata('https://tamani.app/');
    expect(m.title).toEqual({ absolute: LANDING_TITLE });
    expect(m.description).toBe(LANDING_DESCRIPTION);
    expect(m.alternates?.canonical).toBe('https://tamani.app/');
    expect(m.openGraph).toMatchObject({
      url: 'https://tamani.app/',
      locale: 'fr_FR',
      siteName: 'Tamani',
    });
    expect(JSON.stringify(m.openGraph)).toContain('https://tamani.app/brand/og-default.png');
    expect(m.twitter).toMatchObject({ card: 'summary_large_image' });
  });
});

describe('landing copy', () => {
  const copy = JSON.stringify([
    LANDING_TITLE,
    LANDING_DESCRIPTION,
    LANDING_FAQ,
    landingMetadata('https://x.y'),
  ]);

  it('promises an answer in under 30 seconds, never 5 seconds', () => {
    expect(copy).toContain('moins de 30 secondes');
    expect(copy).not.toMatch(/5 secondes/);
  });

  it('has no em or en dash', () => {
    expect(copy).not.toMatch(/[–—]/);
  });

  it('the FAQ answers how the free trial works', () => {
    const trial = LANDING_FAQ.find((q) => q.question.startsWith("L'essai gratuit"));
    expect(trial?.answer).toContain(`${PLANS.TRIAL.durationDays} jours`);
    expect(trial?.answer).toContain(`${PLANS.TRIAL.includedResponses} réponses`);
    expect(trial?.answer).toContain('sans carte bancaire');
    expect(trial?.answer).toContain('la première limite atteinte');
    expect(trial?.answer).toContain('en prenant un pass');
  });

  it('speaks of passes, never of Pro, Gratuit or 12 months', () => {
    expect(copy).not.toMatch(/\bPro\b|forfait Gratuit|12 mois/);
  });
});
