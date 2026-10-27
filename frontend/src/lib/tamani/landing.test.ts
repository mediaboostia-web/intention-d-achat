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
  pricingTiers,
} from './landing';
import { PLANS } from './plans';

describe('pricingTiers reads PLANS', () => {
  it('shows the monthly prices', () => {
    const [free, pro, business] = pricingTiers(1);
    expect(free).toEqual({
      id: 'FREE',
      label: 'Gratuit',
      price: '0',
      unit: 'FCFA',
      per: 'Pour toujours',
    });
    expect(pro).toEqual({
      id: 'PRO',
      label: 'Pro',
      price: '9 900',
      unit: 'FCFA par mois',
      per: 'Sans engagement',
    });
    expect(business?.price).toBe('24 900');
  });

  it('shows a year as its monthly share and what was paid', () => {
    const [free, pro, business] = pricingTiers(12);
    expect(free?.per).toBe('Pour toujours');
    expect(pro?.price).toBe('8 250');
    expect(pro?.per).toBe('Payé 99 000 FCFA pour 12 mois, au lieu de 118 800.');
    expect(business?.price).toBe('20 750');
    expect(business?.per).toBe('Payé 249 000 FCFA pour 12 mois, au lieu de 298 800.');
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

  it('offers match PLANS', () => {
    const offers = byType('SoftwareApplication')['offers'] as {
      name: string;
      price: string;
      priceCurrency: string;
    }[];
    expect(offers.map((o) => [o.name, o.price, o.priceCurrency])).toEqual([
      [PLANS.FREE.label, '0', 'XOF'],
      [PLANS.PRO.label, String(PLANS.PRO.monthlyPriceXof), 'XOF'],
      [PLANS.BUSINESS.label, String(PLANS.BUSINESS.monthlyPriceXof), 'XOF'],
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

  it('takes the Free plan figures from PLANS', () => {
    const free = LANDING_FAQ.find((q) => q.question.startsWith('Le forfait Gratuit'));
    expect(free?.answer).toContain(`${PLANS.FREE.maxActiveCampaigns} campagnes en cours`);
    expect(free?.answer).toContain(`${PLANS.FREE.monthlyResponses} réponses par mois`);
  });
});
