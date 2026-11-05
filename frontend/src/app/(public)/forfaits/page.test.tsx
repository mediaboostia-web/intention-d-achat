import { afterEach, describe, expect, it, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import { FORFAITS_FAQ } from '@/lib/tamani/landing-forfaits';
import ForfaitsPage, { generateMetadata } from './page';

afterEach(() => {
  vi.unstubAllEnvs();
});

const out = html(<ForfaitsPage />);
const t = text(<ForfaitsPage />);
/** The cards of one tab, as rendered (each card holds its own <ul> of lines). */
const tab = (id: 'court' | 'mois') => {
  const start = out.indexOf(`data-tab="${id}"`);
  const end = id === 'court' ? out.indexOf('data-tab="mois"') : out.indexOf('lp-plans__trust');
  return out.slice(start, end);
};
const names = (s: string) => [...s.matchAll(/<h3[^>]*>(.*?)<\/h3>/g)].map((m) => m[1]);

describe('/forfaits', () => {
  it('renders one h1, the switch with « Courte durée » checked, and both groups of cards', () => {
    expect(out.match(/<h1/g)).toHaveLength(1);
    expect(t).toContain('Un forfait à la taille de ton activité');
    expect(t).toContain(
      'Que tu postes un produit par mois ou dix par jour, choisis le pass qui suit ton rythme.',
    );
    const radios = out.match(/<input[^>]*type="radio"[^>]*>/g) ?? [];
    expect(radios).toHaveLength(2);
    expect(radios[0]).toContain('checked');
    expect(radios[1]).not.toContain('checked');
    expect(t).toContain('Courte durée');
    expect(t).toContain('Au mois');
    expect(names(tab('court'))).toEqual([
      'Essai gratuit',
      'Pass Semaine',
      'Pass 2 Semaines',
      'Pass Illimité',
    ]);
    expect(names(tab('mois'))).toEqual([
      'Pass Mois',
      'Pass Mois Plus',
      'Pass Mois Max',
      'Pass Illimité',
    ]);
  });

  it('Mois Max carries « Le meilleur prix par réponse », Illimité reads « Parlons-en » with a WhatsApp button', () => {
    const mois = tab('mois');
    expect(mois.match(/Le meilleur prix par réponse/g)).toHaveLength(1);
    expect(mois.indexOf('Le meilleur prix par réponse')).toBeLessThan(
      mois.indexOf('Pass Mois Max</h3>'),
    );
    expect(mois.indexOf('Le meilleur prix par réponse')).toBeGreaterThan(
      mois.indexOf('Pass Mois Plus</h3>'),
    );
    expect(t).toContain('Parlons-en');
    expect(t).toContain('Nous écrire sur WhatsApp');
    expect(out).toContain('href="https://wa.me/2290195831126"');
  });

  it('the trial card greys out what it lacks, a pass card says the rest is included', () => {
    const court = tab('court');
    const trial = court.slice(0, court.indexOf('Pass Semaine</h3>'));
    expect(trial.match(/data-included="false"/g)).toHaveLength(3);
    expect(trial).toContain('Commencer gratuitement');
    expect(trial).toContain('href="/signup"');
    const week = court.slice(
      court.indexOf('Pass Semaine</h3>'),
      court.indexOf('Pass 2 Semaines</h3>'),
    );
    expect(week.match(/data-included="true"/g)).toHaveLength(4);
    expect(week).toContain('Et tout le reste est inclus');
    expect(week).toContain('Choisir ce pass');
  });

  it('the reassurance band and the « Et quand mon pass se termine ? » box', () => {
    for (const line of [
      'Paiement Mobile Money ou carte',
      'Pas de renouvellement automatique',
      "Ton lien ne s'arrête jamais",
      'Réponses gardées après ton pass',
      'Essai sans carte bancaire',
    ]) {
      expect(t).toContain(line);
    }
    expect(t).toContain('Et quand mon pass se termine ?');
    expect(t).toContain(
      'Tes campagnes continuent. Tes clients peuvent toujours répondre, et leurs réponses sont gardées.',
    );
  });

  it('the comparison table: a caption, a header row of the seven offers, row headers', () => {
    const table = out.match(/<table[\s\S]*?<\/table>/)?.[0] ?? '';
    expect(table).toContain('<caption');
    const head = table.match(/<thead[\s\S]*?<\/thead>/)?.[0] ?? '';
    expect(head.match(/<th[^>]*scope="col"/g)).toHaveLength(8);
    const body = table.match(/<tbody[\s\S]*?<\/tbody>/)?.[0] ?? '';
    const rows = body.match(/<tr/g) ?? [];
    expect(body.match(/<th[^>]*scope="row"/g)).toHaveLength(rows.length);
    // The table scrolls inside its own frame, reachable by keyboard.
    expect(out).toMatch(
      /class="lp-compare__scroll"[^>]*tabindex="0"|tabindex="0"[^>]*class="lp-compare__scroll"/i,
    );
  });

  it('asks its own pricing questions', () => {
    for (const q of FORFAITS_FAQ) expect(t).toContain(q.question);
  });

  it("the JSON-LD is the page's own FAQPage, parseable", () => {
    const m = out.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(m).not.toBeNull();
    const ld = JSON.parse(m![1]!) as { '@type': string; mainEntity: unknown[] };
    expect(ld['@type']).toBe('FAQPage');
    expect(ld.mainEntity).toHaveLength(FORFAITS_FAQ.length);
    expect(m![1]).not.toContain('<');
  });

  it('generateMetadata reads APP_URL', () => {
    vi.stubEnv('APP_URL', 'https://tamani.app/');
    expect(generateMetadata().alternates?.canonical).toBe('https://tamani.app/forfaits');
  });

  it('the menu marks Forfaits as the current page, the skip link leads to the content', () => {
    expect(out).toMatch(
      /href="\/forfaits"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/forfaits"/,
    );
    expect(out).toContain('id="contenu"');
    expect(t).toContain('Aller au contenu');
    expect(out).toContain('id="contact"');
  });
});
