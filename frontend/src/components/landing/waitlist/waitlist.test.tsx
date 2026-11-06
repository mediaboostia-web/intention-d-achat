import { describe, expect, it } from 'vitest';
import { html, text } from '@/components/ui/test-html';
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
    expect(t).toContain('Ton WhatsApp');
    expect(t).toContain('Où vends-tu ?');
    expect(t).toContain('Chaîne WhatsApp');
    expect(t).toContain("J'accepte que Tamani me contacte");
    expect(t).toContain('Réserver ma place');
  });

  it('offers Benin first for the number', () => {
    const options = out.match(/<option [^>]*value="([A-Z]{2})"/g) ?? [];
    expect(options[0]).toContain('value="BJ"');
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
    expect(t).toContain('Ta place est réservée, Awa !');
    expect(t).toContain('Tu es n° 12');
    const out = html(view);
    expect(out).toContain('href="https://wa.me/?text=');
    expect(inviteHref('https://tamani.app/')).toContain(
      encodeURIComponent('https://tamani.app/liste-attente?src=parrainage'),
    );
    expect(out).toContain('href="https://chat.whatsapp.com/abc"');
  });

  it('shows no rank for a bot and no group without its link', () => {
    const t = text(
      <WaitlistThanks firstName="Awa" position={0} appUrl="https://tamani.app" community={null} />,
    );
    expect(t).not.toContain('Tu es n°');
    expect(t).not.toContain('Rejoindre le groupe');
  });
});
