import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';

vi.mock('@/lib/server/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/server/tamani/waitlist', () => ({ waitlistCount: vi.fn() }));

import { waitlistCount } from '@/lib/server/tamani/waitlist';
import WaitlistPage, { generateMetadata } from './page';

beforeEach(() => {
  vi.mocked(waitlistCount).mockReset().mockResolvedValue(12);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('/liste-attente', () => {
  it('has one h1, the form, the video and the menu marking the page', async () => {
    const out = html(await WaitlistPage());
    expect(out.match(/<h1/g)).toHaveLength(1);
    expect(out).toContain('id="reserver"');
    expect(out).toContain('id="wait-firstName"');
    expect(out).toContain('id="film"');
    expect(out).toContain('id="contenu"');
    const t = text(await WaitlistPage());
    expect(t).toContain(
      'Prépare tes prochaines commandes avec une meilleure visibilité sur la demande.',
    );
    expect(t).toContain('Accès à venir · vendeurs et commerçants');
    expect(t).toContain("C'est gratuit. Sans engagement. Aucune carte bancaire demandée.");
    expect(t).toContain('Ce que tu découvriras avec Tamani');
    for (const line of [
      'Créer une fiche produit et son lien de partage.',
      'Recueillir les quantités souhaitées par tes clients.',
      'Retrouver les réponses au même endroit.',
      'Consulter une estimation pour préparer ton approvisionnement.',
    ]) {
      expect(t).toContain(line);
    }
    expect(t).toContain('Voir comment fonctionne Tamani');
    expect(out).toContain('href="/#comment-ca-marche"');
    // Copy brief §2.5 and §7: no unmeasured time, no strong promise.
    expect(t).not.toContain('30 secondes');
    expect(t).not.toContain('Fini le stock qui dort');
  });

  it('has the copy brief title and description (§9.4)', () => {
    const m = generateMetadata();
    expect(m.title).toEqual({
      absolute: "Liste d'attente Tamani | Accès pour les vendeurs en ligne",
    });
    expect(m.description).toBe(
      "Rejoins gratuitement la liste d'attente Tamani. Sois prévenu à l'ouverture et découvre comment tester la demande avant de commander ton stock.",
    );
  });

  it('shows the counter only from 50 sellers', async () => {
    expect(text(await WaitlistPage())).not.toContain('sont déjà inscrits');
    vi.mocked(waitlistCount).mockResolvedValue(50);
    expect(text(await WaitlistPage())).toContain(
      "50 vendeurs sont déjà inscrits sur la liste d'attente",
    );
  });

  it('still builds when the database cannot be reached', async () => {
    vi.mocked(waitlistCount).mockRejectedValue(new Error("Can't reach database server"));
    const t = text(await WaitlistPage());
    expect(t).toContain("Rejoins la liste d'attente");
    expect(t).not.toContain('sont déjà inscrits');
  });

  it('has its own canonical address', () => {
    vi.stubEnv('APP_URL', 'https://tamani.app/');
    expect(generateMetadata().alternates?.canonical).toBe('https://tamani.app/liste-attente');
  });
});
