import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { html, text } from '@/components/ui/test-html';
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from '@/lib/design/logo-paths';
import { LANDING_FAQ, LANDING_LINKS } from '@/lib/tamani/landing';
import { BeforeAfter } from './BeforeAfter';
import { Community } from './Community';
import { ORBIT_NETWORKS } from './content';
import { Faq } from './Faq';
import { Film } from './Film';
import { Hero } from './Hero';
import { LandingFooter } from './LandingFooter';
import { LandingNav } from './LandingNav';
import { PLATFORM_PATHS } from './platform-paths';
import { Pricing } from './Pricing';
import { Problem } from './Problem';
import { Solution } from './Solution';
import { Steps } from './Steps';

const NO_LINKS = LANDING_LINKS;
const ALL_LINKS = {
  whatsappContact: 'https://wa.me/221770000000',
  community: 'https://chat.whatsapp.com/abc',
  facebook: 'https://facebook.com/tamani',
  instagram: 'https://instagram.com/tamani',
  tiktok: 'https://tiktok.com/@tamani',
};

const sections = [
  <LandingNav key="nav" />,
  <Hero key="hero" />,
  <Film key="film" />,
  <Problem key="problem" />,
  <Solution key="solution" />,
  <Steps key="steps" />,
  <BeforeAfter key="ba" />,
  <Pricing key="pricing" />,
  <Community key="community" />,
  <Faq key="faq" />,
  <LandingFooter key="footer" />,
];
const page = html(<>{sections}</>);

describe('the landing sections', () => {
  it("come in the porteur's order", () => {
    const ids = [
      'film',
      'probleme',
      'solution',
      'comment-ca-marche',
      'avant-apres',
      'tarifs',
      'communaute',
      'questions',
    ];
    const at = ids.map((id) => page.indexOf(`id="${id}"`));
    expect(at.every((i) => i > 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('draw no phone mockup', () => {
    expect(page).not.toMatch(/dphone|device__|lp-phone/);
  });

  it('say under 30 seconds and never 5 seconds, without em or en dash', () => {
    const t = text(<>{sections}</>);
    expect(t).toContain('moins de 30 secondes');
    expect(t).not.toMatch(/5 secondes/);
    expect(t).not.toMatch(/[–—]/);
  });

  it('give every illustration an alt text and a webp source', () => {
    const imgs = page.match(/<img [^>]*>/g) ?? [];
    expect(imgs.length).toBeGreaterThanOrEqual(8);
    for (const img of imgs) {
      expect(img).toMatch(/alt="[^"]*"/);
      expect(img).toMatch(/%2Faccueil%2F[a-z0-9-]+\.webp/);
    }
  });
});

describe('LandingNav', () => {
  it('links to the four sections, sign-in and sign-up', () => {
    const out = html(<LandingNav />);
    for (const href of [
      '#comment-ca-marche',
      '#avant-apres',
      '#tarifs',
      '#questions',
      '/login',
      '/signup',
    ]) {
      expect(out).toContain(`href="${href}"`);
    }
  });

  it('starts visible with its phone menu closed', () => {
    const out = html(<LandingNav />);
    expect(out).toContain('data-hidden="false"');
    expect(out).toMatch(/<button[^>]*aria-expanded="false"[^>]*aria-controls="lp-menu"/);
    const drawer = out.match(/<div [^>]*id="lp-menu"[^>]*>/)?.[0] ?? '';
    expect(drawer).toContain('role="dialog"');
    expect(drawer).toContain('aria-modal="true"');
    expect(drawer).toContain('inert=""');
    expect(out).toContain('data-open="false"');
  });

  it('on a phone the bar keeps the logo and the menu; the side drawer ends on sign-up, then sign-in', () => {
    const out = html(<LandingNav />);
    // The bar's sign-in and sign-up are desktop only (landing.css).
    expect(out).toMatch(
      /<a [^>]*class="lp-nav__login"[^>]*href="\/login"|<a [^>]*href="\/login"[^>]*class="lp-nav__login"/,
    );
    expect(out).toMatch(
      /<a [^>]*class="[^"]*lp-nav__cta[^"]*"[^>]*href="\/signup"|<a [^>]*href="\/signup"[^>]*class="[^"]*lp-nav__cta/,
    );
    const drawer = out.slice(out.indexOf('id="lp-menu"'));
    const hrefs = [...drawer.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual([
      '#comment-ca-marche',
      '#avant-apres',
      '#tarifs',
      '#questions',
      '/signup',
      '/login',
    ]);
    expect(text(<LandingNav />)).toContain('Commencer gratuitement');
    expect(text(<LandingNav />)).toContain('Déjà un compte ? Se connecter');
    // The links come in one after the other.
    expect(drawer.match(/style="--i:\d"/g)).toHaveLength(5);
  });

  it('hides the bar buttons below 1000px and stops the drawer under reduced motion', () => {
    const css = readFileSync(path.resolve(__dirname, 'landing.css'), 'utf8');
    expect(css).toMatch(/\.lp-nav__login,\s*\.lp-nav__cta\s*\{\s*display:\s*none/);
    expect(css).toMatch(
      /@media \(min-width: 1000px\)[\s\S]*?\.lp-nav__login,\s*\.lp-nav__cta\s*\{\s*display:\s*inline-flex/,
    );
    expect(css).toMatch(/\.lp-drawer__panel\s*\{[^}]*translate:\s*100% 0/);
  });
});

describe('Hero', () => {
  it('has one h1 on two lines and a sign-up link', () => {
    const out = html(<Hero />);
    expect(out.match(/<h1/g)).toHaveLength(1);
    expect(text(<Hero />)).toContain('Ta communauté parle. Tu sais quoi acheter.');
    expect(out).toMatch(
      /<a [^>]*href="\/signup"[^>]*id="lp-hero-cta"|<a [^>]*id="lp-hero-cta"[^>]*href="\/signup"/,
    );
  });

  it('stamps the running example on the illustration', () => {
    expect(text(<Hero />)).toContain('Commande ≈120 cartons');
  });

  it('lists the platforms twice for a seamless loop, the copy hidden from screen readers', () => {
    const out = html(<Hero />);
    expect(out.match(/<ul/g)?.length).toBeGreaterThanOrEqual(3);
    expect(out).toMatch(/<ul aria-hidden="true">/);
    expect(text(<Hero />).match(/Telegram/g)).toHaveLength(2);
  });

  it('promises the 3-day trial, not a free plan', () => {
    const t = text(<Hero />) + text(<Community links={NO_LINKS} />);
    expect(t).toContain("3 jours d'essai gratuit");
    expect(t).not.toContain('Gratuit pour commencer');
    expect(t).not.toContain('compte gratuit');
  });
});

describe('Film', () => {
  it('waits for the video: a play button and the poster, no <video>', () => {
    const out = html(<Film />);
    expect(out).toContain('aria-label="Lancer la vidéo de présentation, 1 minute 30"');
    expect(out).not.toContain('<video');
    expect(out).toContain('%2Faccueil%2Fvideo-affiche.webp');
  });
});

describe('Problem', () => {
  it('tells the running example and highlights the money', () => {
    const t = text(<Problem />);
    expect(t).toContain('Tu as commandé 300 cartons');
    expect(t).toContain('190 dorment encore au dépôt');
    // Narrow no-break spaces: the amount never splits across two lines.
    expect(html(<Problem />)).toContain('class="lp-hl">1\u202f900\u202f000\u202fFCFA<');
  });
});

describe('Solution', () => {
  it('the orbit lists the 8 networks with their real logos', () => {
    const out = html(<Solution />);
    expect(ORBIT_NETWORKS).toHaveLength(8);
    for (const n of ORBIT_NETWORKS) {
      expect(text(<Solution />)).toContain(n.label);
      expect(out).toContain(`d="${PLATFORM_PATHS[n.slug]}"`);
    }
    expect(out).toContain('réponses reçues');
  });
});

describe('Steps', () => {
  it('shows three numbered gestures and stamps the last one', () => {
    const t = text(<Steps />);
    for (const s of ['Ajoute ton produit', 'Partage le lien', 'Commande la bonne quantité'])
      expect(t).toContain(s);
    expect(html(<Steps />).match(/<li/g)).toHaveLength(3);
    expect(t).toContain('Commande ≈120 cartons');
  });
});

describe('BeforeAfter', () => {
  it('the slider is a labelled range over the two pictures', () => {
    const out = html(<BeforeAfter />);
    expect(out).toMatch(
      /<input[^>]*type="range"[^>]*aria-label="Comparer le dépôt avant et avec Tamani"/,
    );
    expect(out).toContain('%2Faccueil%2Favant.webp');
    expect(out).toContain('%2Faccueil%2Fapres.webp');
    expect(text(<BeforeAfter />)).toContain('Avec Tamani');
  });
});

describe('Pricing', () => {
  const cards = (out: string) => out.split('<li').filter((c) => c.includes('</h3>'));
  const names = (out: string) => [...out.matchAll(/<h3[^>]*>(.*?)<\/h3>/g)].map((m) => m[1]);

  it("seven cards in the porteur's order", () => {
    expect(names(html(<Pricing />))).toEqual([
      'Essai gratuit',
      'Pass Semaine',
      'Pass 2 Semaines',
      'Pass Mois',
      'Pass Mois Plus',
      'Pass Mois Max',
      'Pass Illimité',
    ]);
    const t = text(<Pricing />);
    expect(t).toContain('3 900 FCFA');
    expect(t).toContain('24 900 FCFA');
    expect(t).toContain('30 jours · 15 000 réponses');
    expect(t).toContain('Pour un arrivage à écouler vite.');
    const out = html(<Pricing />);
    expect(out.match(/href="\/signup"/g)).toHaveLength(6);
    expect(cards(out)[0]).toContain('Essayer gratuitement');
  });

  it('Mois Max carries « Le meilleur prix par réponse »', () => {
    const badged = cards(html(<Pricing />)).filter((c) =>
      c.includes('Le meilleur prix par réponse'),
    );
    expect(badged).toHaveLength(1);
    expect(badged[0]).toContain('Pass Mois Max</h3>');
  });

  it('Illimité reads « Sur devis » and hides its button while whatsappContact is null', () => {
    const last = (links: typeof NO_LINKS) => cards(html(<Pricing links={links} />)).at(-1) ?? '';
    expect(last(NO_LINKS)).toContain('Sur devis');
    expect(last(NO_LINKS)).not.toContain('Contacter le support');
    expect(last(NO_LINKS)).not.toContain('href=');
    expect(last(ALL_LINKS)).toContain('Contacter le support');
    expect(last(ALL_LINKS)).toContain('href="https://wa.me/221770000000"');
  });

  it('the line under the cards', () => {
    expect(text(<Pricing />)).toContain(
      'Mobile Money ou carte · Pas de renouvellement automatique · Campagnes illimitées',
    );
  });

  it('no 12-month toggle', () => {
    const out = html(<Pricing />);
    expect(out).not.toContain('aria-pressed');
    expect(text(<Pricing />)).not.toMatch(/12 mois|Au mois|\bPro\b/);
  });

  it('the rail scrolls in CSS; its arrows name what they move', () => {
    const out = html(<Pricing />);
    expect(out).toContain('class="lp-rail__track"');
    expect(out).toMatch(/<button[^>]*aria-label="Pass précédents"/);
    expect(out).toMatch(/<button[^>]*aria-label="Pass suivants"/);
  });
});

describe('Community', () => {
  it('hides the WhatsApp group button without a link', () => {
    const out = html(<Community links={NO_LINKS} />);
    expect(out).toContain('href="/signup"');
    expect(out).not.toContain('chat.whatsapp.com');
    expect(text(<Community links={NO_LINKS} />)).not.toContain('Rejoindre le groupe');
  });

  it('shows it once the porteur gives the link', () => {
    expect(html(<Community links={ALL_LINKS} />)).toContain('href="https://chat.whatsapp.com/abc"');
    expect(text(<Community links={ALL_LINKS} />)).toContain('Rejoindre le groupe');
  });
});

describe('Faq', () => {
  it('asks the shared questions, with the contact button only when there is a number', () => {
    const t = text(<Faq links={NO_LINKS} />);
    for (const q of LANDING_FAQ) expect(t).toContain(q.question);
    expect(html(<Faq links={NO_LINKS} />).match(/<details/g)).toHaveLength(LANDING_FAQ.length);
    expect(t).not.toContain('Écris-nous sur WhatsApp');
    expect(text(<Faq links={ALL_LINKS} />)).toContain('Écris-nous sur WhatsApp');
  });
});

describe('LandingFooter', () => {
  it("draws the whole wordmark: the svg's viewBox is the path's own", () => {
    const out = html(<LandingFooter links={NO_LINKS} />);
    expect(out).toContain(`viewBox="${WORDMARK_VIEWBOX}"`);
    expect(out).toContain(`d="${WORDMARK_PATH}"`);
  });

  it('shows the social accounts only once given', () => {
    expect(html(<LandingFooter links={NO_LINKS} />)).not.toContain('facebook.com');
    const out = html(<LandingFooter links={ALL_LINKS} />);
    expect(out).toContain('href="https://facebook.com/tamani"');
    expect(out).toContain('href="https://tiktok.com/@tamani"');
  });
});
