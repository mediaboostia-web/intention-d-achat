import { describe, it, expect } from 'vitest';
import {
  LANDING_DESCRIPTION,
  LANDING_FAQ,
  LANDING_FINAL_LABEL,
  LANDING_LAUNCH_MODE,
  LANDING_LINKS,
  LANDING_NAV,
  LANDING_PLAN_LABEL,
  LANDING_REASSURANCE,
  LANDING_SIGNUP_HREF,
  LANDING_SIGNUP_LABEL,
  LANDING_BAR_NAV,
  LANDING_TITLE,
  clampPercent,
  countFrame,
  landingJsonLd,
  landingMetadata,
  navStep,
  pickWeighted,
  pricingOffers,
} from './landing';
import { planFeatures } from './billing-view';
import { SHOP_COUNTRIES } from './countries';
import { PASS_IDS, PLANS } from './plans';

const NO_LINKS = {
  whatsappContact: null,
  community: null,
  facebook: null,
  instagram: null,
  tiktok: null,
} as const;
const ALL_LINKS = {
  whatsappContact: 'https://wa.me/221770000000',
  community: 'https://chat.whatsapp.com/abc',
  facebook: 'https://facebook.com/tamani',
  instagram: 'https://instagram.com/tamani',
  tiktok: 'https://tiktok.com/@tamani',
} as const;
const words = (s: string) => s.trim().split(/\s+/).length;

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
      features: planFeatures('TRIAL'),
    });
    expect(offers[5]).toEqual({
      id: 'MONTH_MAX',
      name: 'Pass Mois Max',
      price: '24 900 FCFA',
      durationLabel: '30 jours',
      responsesLabel: '5 000 réponses',
      forWho: 'Pour les grands groupes.',
      badge: 'Le meilleur prix par réponse',
      features: planFeatures('MONTH_MAX'),
    });
    expect(offers.filter((o) => o.badge).map((o) => o.id)).toEqual(['MONTH_MAX']);
    expect(offers[6]).toMatchObject({
      name: 'Pass Illimité',
      price: 'Sur devis',
      features: planFeatures('UNLIMITED'),
    });
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

  it('JSON-LD sells one aggregate offer in XOF, from the trial to the dearest pass', () => {
    const dearest = Math.max(...PASS_IDS.map((id) => PLANS[id].priceXof ?? 0));
    expect(byType('SoftwareApplication')['offers']).toEqual({
      '@type': 'AggregateOffer',
      priceCurrency: 'XOF',
      lowPrice: '0',
      highPrice: String(dearest),
      offerCount: 6,
    });
  });

  it('the organisation gives its WhatsApp contact and only the social links that exist', () => {
    const org = (links: typeof ALL_LINKS | typeof NO_LINKS) =>
      (landingJsonLd('https://tamani.app/', links)['@graph'] as Record<string, unknown>[]).find(
        (n) => n['@type'] === 'Organization',
      ) as Record<string, unknown>;
    expect(org(ALL_LINKS)['sameAs']).toEqual([
      ALL_LINKS.facebook,
      ALL_LINKS.instagram,
      ALL_LINKS.tiktok,
    ]);
    expect(org(ALL_LINKS)['contactPoint']).toMatchObject({
      '@type': 'ContactPoint',
      url: ALL_LINKS.whatsappContact,
      availableLanguage: 'fr',
    });
    expect(org(NO_LINKS)).not.toHaveProperty('sameAs');
    expect(org(NO_LINKS)['contactPoint']).not.toHaveProperty('url');
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

  it('promises no answer time it has not measured (copy brief §2.5)', () => {
    expect(copy).not.toMatch(/30 secondes|5 secondes/);
  });

  it('never sells an intention as a sale, a sure quantity or no unsold stock (brief §2.2)', () => {
    expect(copy).not.toMatch(
      /prêts? à payer|prêts à être livrés|exactement quoi commander|plus les invendus|reste dans ta poche/i,
    );
  });

  it('has no em or en dash', () => {
    expect(copy).not.toMatch(/[–—]/);
  });

  it('the FAQ answers how the free trial works', () => {
    const trial = LANDING_FAQ.find((q) => q.question === 'Comment essayer Tamani ?');
    expect(trial?.answer).toContain("liste d'attente");
    expect(trial?.answer).toContain(
      `${PLANS.TRIAL.durationDays} jours ou ${PLANS.TRIAL.includedResponses} réponses`,
    );
    expect(trial?.answer).toContain('sans carte bancaire');
  });

  it('speaks of passes, never of Pro, Gratuit or 12 months', () => {
    expect(copy).not.toMatch(/\bPro\b|forfait Gratuit|12 mois/);
  });
});

describe('the menu, the titles and the questions of the new site', () => {
  it('LANDING_BAR_NAV keeps three of them for the computer bar (porteur, 2026-11-06)', () => {
    expect(LANDING_BAR_NAV.map((n) => n.label)).toEqual([
      'Comment ça marche',
      'Fonctionnalités',
      'Tarifs',
    ]);
  });

  it('LANDING_NAV lists the six menu entries, sections as /#anchors', () => {
    expect(LANDING_NAV.map((n) => [n.href, n.label])).toEqual([
      ['/#comment-ca-marche', 'Comment ça marche'],
      ['/#fonctionnalites', 'Fonctionnalités'],
      ['/#benefices', 'Avantages'],
      ['/forfaits', 'Tarifs'],
      ['/#faq', 'Questions fréquentes'],
      ['/#contact', 'Contact'],
    ]);
  });

  it('the title and description fit search results', () => {
    expect(LANDING_TITLE).toBe('Tamani | Teste la demande avant de commander ton stock');
    expect(LANDING_DESCRIPTION).toBe(
      "Recueille les intentions d'achat avec un lien à partager sur WhatsApp, TikTok ou Facebook. Estime les quantités à prévoir avant ton approvisionnement.",
    );
    expect(LANDING_TITLE.length).toBeLessThanOrEqual(60);
    expect(LANDING_DESCRIPTION.length).toBeLessThanOrEqual(160);
    for (const network of ['WhatsApp', 'TikTok', 'Facebook']) {
      expect(LANDING_DESCRIPTION).toContain(network);
    }
  });

  it('the FAQ asks the ten questions of the copy brief (§5.10), each answer first and short', () => {
    expect(LANDING_FAQ.map((q) => q.question)).toEqual([
      "C'est quoi, Tamani ?",
      'Mes clients doivent-ils installer une application ?',
      'Où puis-je partager mon lien ?',
      "Puis-je tester l'intérêt pour un produit qui n'est pas encore en stock ?",
      "Une intention d'achat garantit-elle une vente ?",
      'Comment Tamani estime-t-il la quantité à commander ?',
      'Les numéros de mes clients sont-ils visibles par tout le monde ?',
      'Dans quels pays Tamani est-il disponible ?',
      'Comment essayer Tamani ?',
      "Comment contacter l'équipe Tamani ?",
    ]);
    for (const q of LANDING_FAQ) expect(words(q.answer), q.question).toBeLessThanOrEqual(70);
  });

  it('the countries answer lists every shop country', () => {
    const answer = LANDING_FAQ.find((q) => q.question.startsWith('Dans quels pays'))?.answer ?? '';
    for (const c of SHOP_COUNTRIES) expect(answer).toContain(c.label);
  });

  it('an intention is not a sale, the advice an estimate, the contact page the real address', () => {
    const answer = (start: string) => LANDING_FAQ.find((q) => q.question.startsWith(start))?.answer;
    expect(answer("Une intention d'achat")).toMatch(/^Non. /);
    expect(answer("Une intention d'achat")).toContain('pas une promesse de vente');
    expect(answer('Comment Tamani estime')).toContain('0,7');
    expect(answer('Comment Tamani estime')).toContain('reste une estimation');
    expect(answer('Comment contacter')).toContain('hullysdesire@gmail.com');
  });

  it('shares the promise in Open Graph', () => {
    const m = landingMetadata('https://tamani.app/');
    expect(m.openGraph).toMatchObject({
      title: "Teste l'intérêt de tes clients avant de commander ton stock | Tamani",
      description:
        'Partage un lien produit, recueille les demandes et estime les quantités à prévoir avec Tamani.',
    });
  });

  it('the JSON-LD links default to the porteur ones', () => {
    expect(landingJsonLd('https://tamani.app/')).toEqual(
      landingJsonLd('https://tamani.app/', LANDING_LINKS),
    );
  });
});

describe('the launch mode (copy brief §2.3, §4.2)', () => {
  it('is the waitlist until the porteur opens sign-up, and every button follows it', () => {
    expect(LANDING_LAUNCH_MODE).toBe('waitlist');
    expect(LANDING_SIGNUP_HREF).toBe('/liste-attente');
    expect(LANDING_SIGNUP_LABEL).toBe("Rejoindre la liste d'attente");
    expect(LANDING_FINAL_LABEL).toBe("Rejoindre gratuitement la liste d'attente");
    expect(LANDING_PLAN_LABEL).toBe("Être prévenu à l'ouverture");
    expect(LANDING_REASSURANCE).toBe(
      "Gratuit · Sans engagement · Nous te prévenons à l'ouverture.",
    );
  });
});

describe('countFrame', () => {
  it('eases out from 0 to the target and never overshoots', () => {
    expect(countFrame(120, 0)).toBe(0);
    expect(countFrame(120, 1)).toBe(120);
    expect(countFrame(120, 0.5)).toBeGreaterThan(60);
    for (let t = 0; t <= 1; t += 0.05) {
      expect(countFrame(120, t)).toBeLessThanOrEqual(120);
      expect(Number.isInteger(countFrame(120, t))).toBe(true);
    }
    expect(countFrame(120, -1)).toBe(0);
    expect(countFrame(120, 2)).toBe(120);
  });
});
