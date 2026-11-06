import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { html, text } from '@/components/ui/test-html';
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from '@/lib/design/logo-paths';
import {
  LANDING_CONTACT_EMAIL,
  LANDING_FAQ,
  LANDING_LINKS,
  LANDING_NAV,
  type LandingLinks,
} from '@/lib/tamani/landing';
import { PLANS } from '@/lib/tamani/plans';
import { BeforeAfter } from './BeforeAfter';
import { Community } from './Community';
import { ORBIT_NETWORKS } from './content';
import { CountUp } from './CountUp';
import { Faq } from './Faq';
import { Film } from './Film';
import { FinalCta } from './FinalCta';
import { Hero } from './Hero';
import { LandingFooter } from './LandingFooter';
import { DrawerInstall, LandingNav } from './LandingNav';
import { PLATFORM_PATHS } from './platform-paths';
import { Problem } from './Problem';
import { Solution } from './Solution';
import { Steps } from './Steps';

const NO_LINKS: LandingLinks = {
  whatsappContact: null,
  community: null,
  facebook: null,
  instagram: null,
  tiktok: null,
};
const ALL_LINKS: LandingLinks = {
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
  <Community key="community" />,
  <Faq key="faq" />,
  <FinalCta key="final" />,
  <LandingFooter key="footer" />,
];
const page = html(<>{sections}</>);
const { TRIAL } = PLANS;

describe('the landing sections', () => {
  it("come in the porteur's order", () => {
    const ids = [
      'film',
      'probleme',
      'fonctionnalites',
      'comment-ca-marche',
      'benefices',
      'communaute',
      'faq',
      'final',
      'contact',
    ];
    const at = ids.map((id) => page.indexOf(`id="${id}"`));
    expect(at.every((i) => i > 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('draw no phone mockup and no price grid', () => {
    expect(page).not.toMatch(/dphone|device__|lp-phone/);
    expect(page).not.toContain('lp-rail');
    expect(page).not.toContain('id="tarifs"');
  });

  it('say under 30 seconds and never 5 seconds, without em or en dash', () => {
    const t = text(<>{sections}</>);
    expect(t).toContain('moins de 30 secondes');
    expect(t).not.toMatch(/5 secondes/);
    expect(t).not.toMatch(/[–—]/);
  });

  it('name TikTok and Facebook, not only WhatsApp', () => {
    const t = text(<>{sections}</>);
    expect(t).toContain('TikTok');
    expect(t).toContain('Facebook');
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
  it('links to the six menu entries, sign-in and sign-up', () => {
    const out = html(<LandingNav />);
    for (const href of [...LANDING_NAV.map((n) => n.href), '/login', '/liste-attente']) {
      expect(out).toContain(`href="${href}"`);
    }
    for (const n of LANDING_NAV) expect(text(<LandingNav />)).toContain(n.label);
  });

  it('marks Forfaits as the current page on /forfaits', () => {
    expect(html(<LandingNav />)).not.toContain('aria-current="page"');
    const out = html(<LandingNav current="/forfaits" />);
    expect(out).toMatch(
      /<a [^>]*href="\/forfaits"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/forfaits"/,
    );
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
      /<a [^>]*class="[^"]*lp-nav__cta[^"]*"[^>]*href="\/liste-attente"|<a [^>]*href="\/liste-attente"[^>]*class="[^"]*lp-nav__cta/,
    );
    const drawer = out.slice(out.indexOf('id="lp-menu"'));
    const hrefs = [...drawer.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual([
      ...LANDING_NAV.map((n) => n.href),
      LANDING_LINKS.whatsappContact,
      LANDING_LINKS.community,
      '/liste-attente',
      '/login',
    ]);
    expect(text(<LandingNav />)).toContain('Réserver ma place');
    expect(text(<LandingNav />)).toContain('Déjà un compte ? Se connecter');
    // The links come in one after the other.
    expect(drawer.match(/style="--i:\d"/g)).toHaveLength(LANDING_NAV.length + 1);
  });

  it('the drawer offers the support and the WhatsApp group, each only once given', () => {
    const drawer = (links: LandingLinks) => {
      const out = html(<LandingNav links={links} />);
      return out.slice(out.indexOf('id="lp-menu"'));
    };
    const full = drawer(ALL_LINKS);
    expect(full).toContain('Écrire au support');
    expect(full).toContain('href="https://wa.me/221770000000"');
    expect(full).toContain('Rejoindre le groupe');
    expect(full).toContain('href="https://chat.whatsapp.com/abc"');
    // Each card carries its drawing; the title says it all, so the drawing is decorative.
    const cards = full.match(/<li>[\s\S]*?<\/li>/g) ?? [];
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatch(/<img [^>]*alt=""[^>]*%2Faccueil%2Fmenu-support\.webp/);
    expect(cards[1]).toMatch(/<img [^>]*alt=""[^>]*%2Faccueil%2Fmenu-groupe\.webp/);
    const none = drawer(NO_LINKS);
    expect(none).not.toContain('Écrire au support');
    expect(none).not.toContain('Rejoindre le groupe');
  });

  // 2026-10-30: the menu offers to install Tamani where the browser can.
  it('the drawer offers to install the app, or the iPhone steps, only where it helps', () => {
    const prompt = html(<DrawerInstall state="prompt" onInstall={() => {}} />);
    expect(prompt).toMatch(/<button[^>]*class="lp-drawer__install"/);
    expect(text(<DrawerInstall state="prompt" onInstall={() => {}} />)).toContain(
      "Installer l'application",
    );
    expect(text(<DrawerInstall state="ios" onInstall={() => {}} />)).toContain(
      "Dans Safari : bouton Partager, puis « Sur l'écran d'accueil ».",
    );
    for (const state of ['hidden', 'installed', 'none'] as const) {
      expect(html(<DrawerInstall state={state} onInstall={() => {}} />)).toBe('');
    }
  });

  it("the porteur's support number and group are set", () => {
    expect(LANDING_LINKS.whatsappContact).toBe('https://wa.me/2290195831126');
    expect(LANDING_LINKS.community).toBe('https://chat.whatsapp.com/I7fReiTTlvO8WAyAjLVEu5');
    expect(LANDING_CONTACT_EMAIL).toBe('hullysdesire@gmail.com');
    expect(html(<LandingFooter links={NO_LINKS} />)).toContain(
      'href="mailto:hullysdesire@gmail.com"',
    );
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
  it('says the promise in one h1, the trial reassurance under the buttons', () => {
    const out = html(<Hero />);
    expect(out.match(/<h1/g)).toHaveLength(1);
    const h1 = out.match(/<h1[\s\S]*?<\/h1>/)?.[0] ?? '';
    expect(text(<div dangerouslySetInnerHTML={{ __html: h1 }} />).trim()).toBe(
      'Commande seulement ce que tes clients vont acheter.',
    );
    const t = text(<Hero />);
    expect(t).toContain('Pour les grossistes, importateurs et vendeurs en ligne');
    expect(t).toContain(
      "Partage un lien sur WhatsApp, TikTok ou Facebook. En moins de 30 secondes, tes clients disent ce qu'ils veulent et combien. Tamani te dit quoi commander, et à qui livrer.",
    );
    expect(t).toContain("3 jours d'essai · sans carte bancaire · paiement par Mobile Money");
    expect(out).toMatch(
      /<a [^>]*href="\/liste-attente"[^>]*id="lp-hero-cta"|<a [^>]*id="lp-hero-cta"[^>]*href="\/liste-attente"/,
    );
    expect(out).toContain('href="/#comment-ca-marche"');
    expect(t).toContain('Voir comment ça marche');
    expect(t).toContain('Ton lien marche partout où sont tes clients.');
  });

  it('stamps the running example on the illustration', () => {
    expect(text(<Hero />)).toContain('Commande ≈120 cartons');
  });

  it('lists the platforms twice for a seamless loop, the copy hidden from screen readers', () => {
    const out = html(<Hero />);
    expect(out.match(/<ul/g)?.length).toBeGreaterThanOrEqual(2);
    expect(out).toMatch(/<ul aria-hidden="true">/);
    expect(text(<Hero />).match(/Telegram/g)).toHaveLength(2);
  });

  it('promises the 3-day trial, not a free plan', () => {
    const t = text(<Hero />);
    expect(t).toContain("3 jours d'essai");
    expect(t).not.toContain('Gratuit pour commencer');
    expect(t).not.toContain('compte gratuit');
  });
});

describe('Film', () => {
  it('is titled « Regarde Tamani en action » and describes the 90 seconds', () => {
    const t = text(<Film />);
    expect(t).toContain('Regarde Tamani en action');
    expect(t).toContain(
      'En 90 secondes, un grossiste crée un produit, partage le lien dans son groupe WhatsApp, puis voit arriver les réponses de ses clients avec la quantité à commander.',
    );
  });

  it('waits for the video: a play button and the poster, no <video>', () => {
    const out = html(<Film />);
    expect(out).toContain('aria-label="Lancer la vidéo de présentation, 1 minute 30"');
    expect(out).not.toContain('<video');
    expect(out).toContain('%2Faccueil%2Fvideo-affiche.webp');
  });
});

describe('Problem', () => {
  it('lists the five situations Tamani helps avoid', () => {
    const out = html(<Problem />);
    const t = text(<Problem />);
    expect(t).toContain('Tu reconnais ces situations ?');
    expect(t).toContain("Ce sont les galères que Tamani t'aide à éviter.");
    const list = out.match(/<ul class="lp-pains"[\s\S]*?<\/ul>/)?.[0] ?? '';
    expect(list.match(/<li/g)).toHaveLength(5);
    for (const title of [
      "De l'argent qui dort dans ton stock",
      'Trop de messages, pas assez de commandes',
      'Le client ne sait pas ce qui reste',
      'Commander gros sans savoir si ça va plaire',
      'Tu ne connais pas vraiment tes clients',
    ]) {
      expect(t).toContain(title);
    }
    expect(t).toContain('Et si un seul lien réglait tout ça ?');
  });
});

describe('Solution', () => {
  it('has the six points and the orbit names TikTok and Facebook lives', () => {
    const t = text(<Solution />);
    expect(t).toContain('Un seul lien pour tous tes clients');
    for (const title of [
      'Tes clients répondent en moins de 30 secondes',
      'Tu sais qui veut quoi, combien et où',
      "Tu sais quel canal t'apporte des clients",
      'Pas besoin de site web',
      'Ton client voit ce qui est disponible',
      'Tamani te dit combien commander',
    ]) {
      expect(t).toContain(title);
    }
    expect(t).toContain('Bio, vidéos et lives');
    expect(t).toContain('Groupes, pages et lives');
    expect(html(<Solution />)).toContain('href="/liste-attente"');
  });

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
  it('share a product in one minute, the CTA creates the first product', () => {
    const t = text(<Steps />);
    expect(t).toContain('1 minute pour partager ton produit');
    for (const s of [
      'Crée ton produit',
      'Partage le lien en un clic',
      'Reçois les réponses et prépare les commandes',
    ])
      expect(t).toContain(s);
    const out = html(<Steps />);
    expect(out.match(/<li/g)).toHaveLength(3);
    expect(t).toContain('Réserver ma place');
    expect(out).toContain('href="/liste-attente"');
    expect(t).toContain('Commande ≈120 cartons');
  });
});

describe('BeforeAfter', () => {
  it('lists the five before and after lines', () => {
    const t = text(<BeforeAfter />);
    expect(t).toContain('Tu vends comme avant. En mieux.');
    for (const line of [
      'Des dizaines de messages pour des renseignements, et peu de ventes',
      'Tu commandes ton stock sans savoir qui va payer',
      "Tu ne sais pas quel groupe ou quel réseau t'apporte des clients",
      'Tu ne sais pas quels produits vont partir',
      "De l'argent bloqué dans des invendus",
      'Une liste de clients prêts à être livrés',
      "Tu testes un produit auprès de tes clients avant d'en commander un carton",
      "Tu vois quels canaux t'apportent vraiment des clients",
      'Tu sais quels produits partent, et lesquels attendre',
      'Ton argent reste dans ta poche, pas dans ton stock',
    ]) {
      expect(t).toContain(line);
    }
  });

  it('tells the running example and highlights the money', () => {
    const t = text(<BeforeAfter />);
    expect(t).toContain('300 cartons commandés');
    expect(t).toContain('190 invendus');
    expect(t).toContain('120 cartons');
    // Narrow no-break spaces: the amount never splits across two lines.
    expect(html(<BeforeAfter />)).toContain('1 900 000 FCFA');
  });

  it('the slider is a labelled range over the two pictures', () => {
    const out = html(<BeforeAfter />);
    expect(out).toMatch(
      /<input[^>]*type="range"[^>]*aria-label="Comparer le dépôt avant et avec Tamani"/,
    );
    expect(out).toContain('%2Faccueil%2Favant.webp');
    expect(out).toContain('%2Faccueil%2Fapres.webp');
  });
});

describe('Community', () => {
  it("invites to the sellers' WhatsApp group, free", () => {
    const t = text(<Community links={ALL_LINKS} />);
    expect(t).toContain('Rejoins la communauté des vendeurs Tamani');
    expect(t).toContain('Rejoindre le groupe');
    expect(t).toContain("C'est gratuit.");
    expect(html(<Community links={ALL_LINKS} />)).toContain('href="https://chat.whatsapp.com/abc"');
  });

  it('without the link, no group button: the sign-up instead, so no button leads nowhere', () => {
    const out = html(<Community links={NO_LINKS} />);
    expect(out).not.toContain('chat.whatsapp.com');
    expect(text(<Community links={NO_LINKS} />)).not.toContain('Rejoindre le groupe');
    expect(out).toContain('href="/liste-attente"');
  });
});

describe('Faq', () => {
  it('is titled « Tes questions, nos réponses » and asks every LANDING_FAQ question', () => {
    const t = text(<Faq links={NO_LINKS} />);
    expect(t).toContain('Tes questions, nos réponses');
    for (const q of LANDING_FAQ) expect(t).toContain(q.question);
    expect(html(<Faq links={NO_LINKS} />).match(/<details/g)).toHaveLength(LANDING_FAQ.length);
    expect(t).not.toContain('Écris-nous sur WhatsApp');
    expect(text(<Faq links={ALL_LINKS} />)).toContain('Écris-nous sur WhatsApp');
  });
});

describe('FinalCta', () => {
  it('closes the page on the trial', () => {
    const t = text(<FinalCta />);
    expect(t).toContain("Ton prochain stock, commande-le en sachant qui va l'acheter.");
    expect(t).toContain('Réserver ma place');
    expect(t).toContain(
      `${TRIAL.durationDays} jours · ${TRIAL.includedResponses} réponses · sans carte bancaire`,
    );
    expect(html(<FinalCta />)).toContain('href="/liste-attente"');
  });
});

describe('LandingFooter', () => {
  it('is the contact section', () => {
    const out = html(<LandingFooter links={ALL_LINKS} />);
    expect(out).toMatch(/<footer [^>]*id="contact"/);
    expect(text(<LandingFooter links={ALL_LINKS} />)).toContain(
      'Une question ? Écris-nous sur WhatsApp',
    );
    for (const href of ['/forfaits', '/#comment-ca-marche', '/#faq', '/login', '/liste-attente']) {
      expect(out).toContain(`href="${href}"`);
    }
    expect(out).toContain(`href="mailto:${LANDING_CONTACT_EMAIL}"`);
  });

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

describe('motion that invites, never in the way', () => {
  const css = readFileSync(path.resolve(__dirname, 'landing.css'), 'utf8');
  const reduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));

  it('every new animation stops under reduced motion', () => {
    for (const cls of [
      '.lp-word',
      '.lp-shine',
      '.lp-nudge',
      '.lp-step__arrow',
      '.lp-faq',
      '.lp-plans',
      '.lp-count',
      '.lp-pains',
      '.lp-wait__seal',
    ]) {
      expect(reduced, cls).toContain(cls);
    }
  });

  it('what waits for the screen stays visible without JavaScript', () => {
    const scripted = css.slice(css.indexOf('@media (scripting: enabled)'));
    expect(css).toContain('@media (scripting: enabled)');
    expect(scripted).toContain(".lp-pains[data-inview='false'] .lp-pains__card");
  });

  it('the hero title words are spans for the stagger, the h1 still reads as one sentence', () => {
    const h1 = html(<Hero />).match(/<h1[\s\S]*?<\/h1>/)?.[0] ?? '';
    expect(h1.match(/class="lp-word"/g)).toHaveLength(8);
    expect(text(<div dangerouslySetInnerHTML={{ __html: h1 }} />).trim()).toBe(
      'Commande seulement ce que tes clients vont acheter.',
    );
  });

  // Recette 2026-11-05: removing the old pricing rules took the FAQ's shared summary rule with them.
  it('the FAQ question keeps its plus on the same line, without the browser triangle', () => {
    expect(css).toMatch(/\.lp-faq summary\s*\{[^}]*display:\s*flex;[^}]*list-style:\s*none/);
    expect(css).toMatch(/\.lp-faq summary::-webkit-details-marker\s*\{\s*display:\s*none/);
  });

  // Recette 2026-11-05: the table's sr-only « Oui » (position: absolute) escaped
  // its scrolling frame and widened the phone page to 794 px.
  it('the comparison table frame holds its own absolutely placed text', () => {
    expect(css).toMatch(/\.lp-compare__scroll\s*\{[^}]*position:\s*relative/);
  });

  // Recette 2026-11-05: footer links were 37 to 40 px tall on a phone, the bar's logo 34 px.
  it('every link of the bar and the footer is at least 44 px tall', () => {
    expect(css).toMatch(/\.lp-nav__logo\s*\{[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.lp-nav__links a\s*\{[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.lp-foot nav a,\s*\.lp-foot__legal a\s*\{[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.lp-nav__login\s*\{[^}]*min-height:\s*44px/);
    expect(html(<LandingFooter links={NO_LINKS} />)).toMatch(
      /<a [^>]*aria-label="Tamani, accueil"[^>]*class="[^"]*min-h-11|<a [^>]*class="[^"]*min-h-11[^"]*"[^>]*aria-label="Tamani, accueil"/,
    );
  });

  // Recette 2026-11-05: six entries centred in the bar ran into « Se connecter » at 1280 px.
  it('the bar shows its six entries only where they fit, never centred over the sign-in', () => {
    expect(css).not.toMatch(/\.lp-nav__links\s*\{[^}]*left:\s*50%/);
    expect(css).toMatch(
      /@media \(min-width: 1120px\)\s*\{\s*\.lp-nav__links\s*\{\s*display:\s*flex[\s\S]*?\.lp-nav__menu\s*\{\s*display:\s*none/,
    );
  });

  it('the drawer exists wherever the menu button shows (below 1120 px)', () => {
    // Hidden from 1000 px while the button stayed until 1119 px, a tap showed
    // nothing and locked the page's scroll.
    expect(css).not.toMatch(
      /@media \(min-width: 1000px\)\s*\{\s*\.lp-drawer\s*\{\s*display:\s*none/,
    );
    expect(css).toMatch(/@media \(min-width: 1120px\)\s*\{\s*\.lp-drawer\s*\{\s*display:\s*none/);
    const nav = readFileSync(path.join(__dirname, 'LandingNav.tsx'), 'utf8');
    expect(nav).toContain("matchMedia('(min-width: 1120px)')");
    expect(nav).not.toContain("matchMedia('(min-width: 1000px)')");
  });

  it('the hero button shines once and nudges a few times, its arrow slides', () => {
    const cta = html(<Hero />).match(/<a [^>]*id="lp-hero-cta"[^>]*>/)?.[0] ?? '';
    for (const cls of ['lp-shine', 'lp-nudge', 'lp-go']) expect(cta).toContain(cls);
    expect(css).toMatch(/\.lp-nudge\s*\{[^}]*animation:[^;]*\b3\b/);
  });
});

describe('CountUp', () => {
  it('renders the final value once for the server, search engines and screen readers', () => {
    const out = html(<CountUp value={120} />);
    expect(out.match(/120/g)).toHaveLength(1);
    expect(out).not.toContain('aria-hidden');
    expect(out).toContain('class="lp-count"');
  });

  it('writes money in FCFA, glued', () => {
    expect(html(<CountUp value={1_900_000} unit="money" />)).toContain('1 900 000 FCFA');
  });
});
