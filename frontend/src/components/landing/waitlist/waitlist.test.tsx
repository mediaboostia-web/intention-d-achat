import { describe, expect, it } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import { SHOP_COUNTRIES } from '@/lib/tamani/countries';
import { WaitlistForm } from './WaitlistForm';
import { WaitlistThanks, inviteHref } from './WaitlistThanks';

describe('WaitlistForm', () => {
  const out = html(<WaitlistForm appUrl="https://tamani.app" community={null} />);

  it('labels every field and asks for the consent', () => {
    for (const id of ['wait-firstName', 'wait-phone', 'wait-email', 'wait-consent']) {
      expect(out, id).toContain(`id="${id}"`);
    }
    for (const id of ['wait-firstName', 'wait-phone', 'wait-email']) {
      expect(out, id).toContain(`<label for="${id}"`);
    }
    const t = text(<WaitlistForm appUrl="https://tamani.app" community={null} />);
    expect(t).toContain('Ton prénom');
    expect(t).toContain('Ton numéro WhatsApp');
    expect(t).toContain('Ton adresse e-mail (facultative si le numéro WhatsApp est renseigné)');
    expect(t).toContain('Où vends-tu ? (facultatif)');
    expect(t).toContain('Chaîne WhatsApp');
    // Copy brief §7: a pre-registration, not an account.
    expect(t).toContain("Rejoins la liste d'attente");
    expect(t).toContain(
      "Laisse un moyen de contact valide. Nous t'écrirons au sujet de l'ouverture de Tamani si tu nous y autorises.",
    );
    expect(t).toContain(
      "J'accepte que l'équipe Tamani me contacte au sujet du lancement sur WhatsApp ou par e-mail, selon les coordonnées que j'ai fournies.",
    );
    expect(t).toContain("Rejoindre gratuitement la liste d'attente");
    expect(t).toContain(
      'Nous utiliserons tes coordonnées uniquement selon le consentement donné et les informations de la politique de confidentialité',
    );
    expect(out).toContain('href="/confidentialite"');
    expect(t).not.toContain('30 secondes');
    expect(t).not.toContain('Réserver ma place');
  });

  it('offers Benin first for the number', () => {
    const options = out.match(/<option [^>]*value="([A-Z]{2})"/g) ?? [];
    expect(options[0]).toContain('value="BJ"');
  });

  // The other countries' names come from the engine's Intl data, which Node
  // and the browsers do not share (« Hong Kong »): listing them on the server
  // broke the hydration of the static page.
  it('sends only the Tamani countries, whose names are fixed, in the server HTML', () => {
    const codes = [...out.matchAll(/<option [^>]*value="([A-Z]{2})"/g)].map((m) => m[1]);
    const own = new Set(SHOP_COUNTRIES.map((c) => c.code));
    expect(codes).toHaveLength(own.size);
    expect(codes.every((c) => own.has(c ?? ''))).toBe(true);
  });

  it('hides the field only a bot fills from people and from the keyboard', () => {
    const trap = out.match(/<div class="lp-wait__trap"[^>]*>[\s\S]*?<\/div>/)?.[0] ?? '';
    expect(trap).toContain('aria-hidden="true"');
    expect(trap).toMatch(/name="website"[^>]*tabindex="-1"|tabindex="-1"[^>]*name="website"/i);
  });
});

describe('WaitlistThanks', () => {
  it('gives the place and an invitation that carries the referral tag', () => {
    const view = (
      <WaitlistThanks
        firstName="Awa"
        position={12}
        appUrl="https://tamani.app/"
        community="https://chat.whatsapp.com/abc"
      />
    );
    const t = text(view);
    expect(t).toContain('Merci Awa ! Ta demande a bien été enregistrée.');
    expect(t).toContain("Nous te préviendrons à l'ouverture de Tamani.");
    expect(t).toContain('Tu es n° 12');
    const out = html(view);
    expect(out).toContain('href="https://wa.me/?text=');
    expect(inviteHref('https://tamani.app/')).toContain(
      encodeURIComponent('https://tamani.app/liste-attente?src=parrainage'),
    );
    expect(out).toContain('href="https://chat.whatsapp.com/abc"');
    expect(t).toContain('Rejoindre le groupe WhatsApp');
    expect(decodeURIComponent(inviteHref('https://tamani.app'))).toContain(
      "Je viens de m'inscrire sur la liste d'attente de Tamani",
    );
  });

  it('shows no rank for a bot and no group without its link', () => {
    const t = text(
      <WaitlistThanks firstName="Awa" position={0} appUrl="https://tamani.app" community={null} />,
    );
    expect(t).not.toContain('Tu es n°');
    expect(t).not.toContain('Rejoindre le groupe');
  });
});
