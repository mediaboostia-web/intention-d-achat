import { describe, expect, it } from 'vitest';
import { LEGAL_ENTITY, LEGAL_PAGES, LEGAL_SLUGS } from './legal';

const all = (slug: (typeof LEGAL_SLUGS)[number]) =>
  LEGAL_PAGES[slug].sections.flatMap((s) => [s.title, ...s.body]).join(' ');

describe('legal pages (porteur, 2026-11-04)', () => {
  it('four pages, each with a path, a title and its sections', () => {
    expect(LEGAL_SLUGS.map((s) => LEGAL_PAGES[s].path)).toEqual([
      '/cgu',
      '/confidentialite',
      '/securite',
      '/mentions-legales',
    ]);
    for (const slug of LEGAL_SLUGS) {
      const page = LEGAL_PAGES[slug];
      expect(page.title.length).toBeGreaterThan(5);
      expect(page.sections.length).toBeGreaterThanOrEqual(3);
      for (const s of page.sections) expect(s.body.length).toBeGreaterThan(0);
      // Plain words, as on the home page: no em or en dash.
      expect(all(slug), slug).not.toMatch(/[–—]/);
    }
  });

  it('in the name of Tamani, in Cotonou, while the company is being registered', () => {
    expect(LEGAL_ENTITY).toMatchObject({
      name: 'Tamani',
      city: 'Cotonou',
      country: 'Bénin',
      email: 'hullysdesire@gmail.com',
    });
    const notice = all('mentions-legales');
    expect(notice).toContain("en cours d'immatriculation");
    expect(notice).toContain('Cotonou, Bénin');
    expect(notice).toContain('hullysdesire@gmail.com');
    expect(notice).toContain('Vercel');
    // Porteur, 2026-11-04.
    expect(notice).toContain('Responsable de la publication : Hullys Désiré.');
  });

  it('the terms say what a pass is: prepaid, never renewed on its own', () => {
    const cgu = all('cgu');
    expect(cgu).toContain('Pas de renouvellement automatique');
    expect(cgu).toContain('3 jours de grâce');
    expect(cgu).toContain("La décision d'acheter reste la tienne");
  });

  // Porteur, 2026-11-04: « ya déjà une version gratuite donc ya pas de
  // remboursement sauf en cas de mauvaise condition du pass … ou en cas d'erreurs ».
  it('the terms say a pass is not refunded, except when it fails or a payment is wrong', () => {
    const refund = LEGAL_PAGES.cgu.sections.find((s) => s.title === 'Remboursement');
    expect(refund).toBeDefined();
    const text = refund!.body.join(' ');
    expect(text).toContain("L'essai gratuit");
    expect(text).toContain("n'est pas remboursé");
    expect(text).toContain('ne marche pas comme prévu');
    expect(text).toContain('payé deux fois');
    expect(text).toContain('nous te remboursons');
  });

  it('privacy names every provider, the Benin law and the APDP', () => {
    const privacy = all('confidentialite');
    for (const name of [
      'Vercel',
      'Neon',
      'Upstash',
      'Cloudinary',
      'Resend',
      'SasPay',
      'Google',
      'Sentry',
    ]) {
      expect(privacy, name).toContain(name);
    }
    expect(privacy).toContain('loi n° 2017-20');
    expect(privacy).toContain('APDP');
    expect(privacy).toContain('30 jours');
    expect(privacy).toContain('90 jours');
  });

  it('security says how to report a problem', () => {
    expect(all('securite')).toContain('hullysdesire@gmail.com');
  });
});
