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
  LANDING_VIDEO,
  filmLength,
  type LandingLinks,
} from '@/lib/tamani/landing';
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

  it('promise no answer time nobody measured, without em or en dash (copy brief §2.5)', () => {
    const t = text(<>{sections}</>);
    expect(t).not.toMatch(/30 secondes|5 secondes/);
    expect(t).not.toMatch(/[–—]/);
  });

  it('never sell an intention as a sale, a sure quantity or no unsold stock (copy brief §2.2)', () => {
    const t = text(<>{sections}</>);
    expect(t).not.toMatch(
      /prêts? à payer|prêts à être livrés|exactement quoi commander|plus les invendus|reste dans ta poche|seulement ce que tes clients vont acheter/i,
    );
    expect(t).not.toMatch(/300 cartons|190 invendus|1\s900\s000/);
  });

  it('send every sign-up button to the waitlist and say so (launch mode « waitlist »)', () => {
    const t = text(<>{sections}</>);
    expect(t).not.toContain('Réserver ma place');
    expect(t).not.toContain('Commencer à utiliser Tamani maintenant');
    expect(t).toContain("Rejoindre la liste d'attente");
    expect(page).not.toContain('href="/signup"');
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
    expect(text(<LandingNav />)).toContain("Rejoindre la liste d'attente");
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
    expect(full).toContain('Besoin d&#x27;aide ?');
    expect(full).toContain('Une vraie personne te répond sur WhatsApp.');
    expect(full).toContain('href="https://wa.me/221770000000"');
    expect(full).toContain('Rejoindre la communauté');
    expect(full).toContain('Des conseils et des échanges entre vendeurs.');
    expect(full).toContain('href="https://chat.whatsapp.com/abc"');
    // Each card carries its drawing; the title says it all, so the drawing is decorative.
    const cards = full.match(/<li>[\s\S]*?<\/li>/g) ?? [];
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatch(/<img [^>]*alt=""[^>]*%2Faccueil%2Fmenu-support\.webp/);
    expect(cards[1]).toMatch(/<img [^>]*alt=""[^>]*%2Faccueil%2Fmenu-groupe\.webp/);
    const none = drawer(NO_LINKS);
    expect(none).not.toContain('Besoin d&#x27;aide ?');
    expect(none).not.toContain('Rejoindre la communauté');
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
  it('says the promise in one h1, the waitlist reassurance under the buttons', () => {
    const out = html(<Hero />);
    expect(out.match(/<h1/g)).toHaveLength(1);
    const h1 = out.match(/<h1[\s\S]*?<\/h1>/)?.[0] ?? '';
    expect(text(<div dangerouslySetInnerHTML={{ __html: h1 }} />).trim()).toBe(
      "Teste l'intérêt de tes clients avant de commander ton stock.",
    );
    const t = text(<Hero />);
    expect(t).toContain('Pour les grossistes, importateurs et vendeurs en ligne');
    expect(t).toContain(
      "Crée une fiche pour ton produit, partage son lien sur WhatsApp, TikTok, Facebook ou tes autres canaux. Tes clients indiquent ce qu'ils souhaitent et en quelle quantité. Tamani rassemble les réponses et t'aide à estimer ce que tu peux prévoir auprès de ton fournisseur.",
    );
    expect(t).toContain("Gratuit · Sans engagement · Nous te prévenons à l'ouverture.");
    expect(t).toContain("Rejoindre la liste d'attente");
    expect(out).toMatch(
      /<a [^>]*href="\/liste-attente"[^>]*id="lp-hero-cta"|<a [^>]*id="lp-hero-cta"[^>]*href="\/liste-attente"/,
    );
    expect(out).toContain('href="/#comment-ca-marche"');
    expect(t).toContain('Voir comment ça marche');
    expect(t).toContain('Partage ton lien là où tes clients sont déjà.');
    expect(out).toContain(
      'alt="Commerçante consultant sur son téléphone les réponses reçues pour un produit avant de préparer sa commande de stock."',
    );
  });

  it('stamps an example of the advice on the illustration, said to be an example', () => {
    expect(text(<Hero />)).toContain('Demande ≈120 cartons');
    expect(text(<Hero />)).toContain(
      "Exemple : d'après les réponses, Tamani estime une demande d'environ 120 cartons.",
    );
  });

  it('lists the platforms twice for a seamless loop, the copy hidden from screen readers', () => {
    const out = html(<Hero />);
    expect(out.match(/<ul/g)?.length).toBeGreaterThanOrEqual(2);
    expect(out).toMatch(/<ul aria-hidden="true">/);
    expect(text(<Hero />).match(/Telegram/g)).toHaveLength(2);
  });

  it('before launch, opens no account: no trial to start now, no free account', () => {
    const t = text(<Hero />);
    expect(t).not.toContain("jours d'essai");
    expect(t).not.toContain('Gratuit pour commencer');
    expect(t).not.toContain('compte gratuit');
  });
});

describe('Film', () => {
  it('is titled « Découvre Tamani en action. » and says what the film shows', () => {
    const t = text(<Film />);
    expect(t).toContain('Découvre Tamani en action.');
    expect(t).toContain(
      'En quelques étapes, découvre comment créer une fiche produit, partager son lien et consulter les réponses de tes clients.',
    );
  });

  it('shows the poster and a play button with the real length; the <video> waits for the click', () => {
    const out = html(<Film />);
    expect(out).toContain('aria-label="Voir la démonstration, 1 minute"');
    expect(out).toContain('>1 min</p>');
    expect(out).not.toContain('<video');
    expect(out).toContain('%2Faccueil%2Fvideo-affiche.webp');
  });

  it('plays the presentation film, whose MP4 and French captions are in public/', () => {
    expect(LANDING_VIDEO).not.toBeNull();
    const video = LANDING_VIDEO!;
    expect(video.src).toBe('/video/tamani-presentation.mp4');
    expect(video.captions).toBe('/video/tamani-presentation.vtt');
    const pub = path.resolve(__dirname, '../../../public');
    expect(readFileSync(path.join(pub, video.src)).subarray(4, 8).toString('latin1')).toBe('ftyp');
    expect(readFileSync(path.join(pub, video.captions!), 'utf8').startsWith('WEBVTT')).toBe(true);
    expect(video.seconds).toBeGreaterThan(45);
    expect(video.seconds).toBeLessThan(75);
  });
});

describe('filmLength', () => {
  it('says the length the way the play button shows and reads it', () => {
    expect(filmLength(58)).toEqual({ label: '1 min', spoken: '1 minute' });
    expect(filmLength(90)).toEqual({ label: '1 min 30', spoken: '1 minute 30' });
    expect(filmLength(118)).toEqual({ label: '2 min', spoken: '2 minutes' });
  });
});

describe('Problem', () => {
  it('tells the four situations of the copy brief (§5.5)', () => {
    const out = html(<Problem />);
    const t = text(<Problem />);
    expect(t).toContain(
      'Avant de commander, tu aimerais savoir ce que tes clients veulent vraiment.',
    );
    expect(t).toContain(
      'Tu publies tes produits, les messages arrivent et les questions se multiplient.',
    );
    const list = out.match(/<ul class="lp-pains"[\s\S]*?<\/ul>/)?.[0] ?? '';
    expect(list.match(/<li/g)).toHaveLength(4);
    for (const title of [
      'Ton argent peut rester bloqué dans les invendus.',
      'Les demandes se dispersent dans tes messages.',
      'Tu manques de visibilité avant de commander.',
      'Tu ne sais pas toujours quel canal apporte les demandes.',
    ]) {
      expect(t).toContain(title);
    }
    expect(t).toContain('Et si tu pouvais recueillir ces demandes avant de passer ta commande ?');
  });
});

describe('Solution', () => {
  it('has the five benefits of the copy brief (§5.6) and the orbit names TikTok and Facebook lives', () => {
    const t = text(<Solution />);
    expect(t).toContain('Un lien produit. Des demandes regroupées au même endroit.');
    for (const title of [
      'Tu recueilles les quantités souhaitées.',
      'Tu identifies les clients qui acceptent d’être recontactés.',
      'Tu compares tes canaux.',
      'Tu prépares ton approvisionnement avec une estimation.',
      'Tu n’imposes pas d’application à tes clients.',
    ]) {
      expect(t).toContain(title);
    }
    expect(t).toContain('Cette estimation ne garantit pas les ventes.');
    expect(t).toContain('Bio, vidéos et lives');
    expect(t).toContain('Groupes, pages et lives');
    // One main button per screen: here the way to the steps.
    expect(t).toContain('Découvrir comment ça marche');
    expect(html(<Solution />)).toContain('href="/#comment-ca-marche"');
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
  it('three steps to prepare the stock, the CTA leads to the waitlist', () => {
    const t = text(<Steps />);
    expect(t).toContain('Trois étapes pour mieux préparer ton stock.');
    for (const s of [
      'Crée ta fiche produit.',
      'Partage ton lien.',
      'Consulte les réponses et prépare ta commande.',
    ])
      expect(t).toContain(s);
    const out = html(<Steps />);
    expect(out.match(/<li/g)).toHaveLength(3);
    expect(t).toContain("Rejoindre la liste d'attente");
    expect(out).toContain('href="/liste-attente"');
    expect(t).toContain('Demande ≈120 cartons');
  });
});

describe('BeforeAfter', () => {
  it('lists the before and « avec Tamani » lines of the copy brief (§5.8)', () => {
    const t = text(<BeforeAfter />);
    expect(t).toContain('Tu gardes tes habitudes de vente. Tu gagnes en visibilité.');
    expect(t).toContain('Avec Tamani');
    for (const line of [
      'Les demandes arrivent dans plusieurs conversations.',
      'Tu estimes les quantités à commander avec peu d’informations.',
      'Tu as du mal à comparer les réponses de tes différents groupes.',
      'Tu retrouves difficilement les informations utiles pour recontacter les clients.',
      'Les réponses liées à un produit sont regroupées.',
      'Tu visualises les quantités souhaitées.',
      'Tu peux distinguer les canaux grâce aux liens par groupe inclus dans les pass concernés.',
      'Tu retrouves les informations des clients ayant accepté d’être recontactés.',
      'Tu disposes d’une estimation pour préparer ton approvisionnement.',
    ]) {
      expect(t).toContain(line);
    }
  });

  it('says that an intention is not a sale, and tells no money example', () => {
    const t = text(<BeforeAfter />);
    expect(t).toContain('Une intention d’achat n’est pas une vente garantie.');
    expect(t).not.toMatch(/cartons commandés|invendus, soit/);
    expect(html(<BeforeAfter />)).not.toContain('FCFA');
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
    expect(t).toContain('Entre vendeurs, partageons ce qui fonctionne.');
    expect(t).toContain('Rejoins la communauté WhatsApp des vendeurs Tamani.');
    expect(t).toContain('Rejoindre le groupe WhatsApp');
    expect(t).toContain('Participation gratuite.');
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
  it('is titled « Questions fréquentes » and asks every LANDING_FAQ question', () => {
    const t = text(<Faq links={NO_LINKS} />);
    expect(t).toContain('Questions fréquentes');
    for (const q of LANDING_FAQ) expect(t).toContain(q.question);
    expect(html(<Faq links={NO_LINKS} />).match(/<details/g)).toHaveLength(LANDING_FAQ.length);
    expect(t).not.toContain('Écris-nous sur WhatsApp');
    expect(text(<Faq links={ALL_LINKS} />)).toContain('Écris-nous sur WhatsApp');
  });
});

describe('FinalCta', () => {
  it('closes the page on the waitlist and the signature', () => {
    const t = text(<FinalCta />);
    expect(t).toContain('Prépare ta prochaine commande avec de meilleures informations.');
    expect(t).toContain(
      'Recueille les intentions de tes clients avant de commander. Partage ton lien, consulte les réponses et utilise l’estimation de Tamani pour préparer ton approvisionnement.',
    );
    expect(t).toContain("Rejoindre gratuitement la liste d'attente");
    expect(t).toContain("Sans engagement. Nous te prévenons à l'ouverture.");
    expect(t).toContain('Tamani. Ta communauté parle. Tu sais quoi acheter.');
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
    const t = text(<LandingFooter links={ALL_LINKS} />);
    for (const label of [
      'Avantages',
      "Rejoindre la liste d'attente",
      'Questions fréquentes',
      'Communauté WhatsApp',
      'Contacter le support',
    ])
      expect(t).toContain(label);
    expect(t).toContain(
      "Un outil de précommande et de collecte des intentions d'achat pour les grossistes, importateurs et vendeurs en ligne d'Afrique francophone.",
    );
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
    expect(h1.match(/class="lp-word"/g)).toHaveLength(10);
    expect(text(<div dangerouslySetInnerHTML={{ __html: h1 }} />).trim()).toBe(
      "Teste l'intérêt de tes clients avant de commander ton stock.",
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
