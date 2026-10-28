import { describe, it, expect } from 'vitest';
import { WORDMARK_PATH } from '@/lib/design/logo-paths';
import { Badge, Button, Card, ChoiceButton, Input, Logo, PhoneInput } from '.';
import { html, text } from './test-html';

describe('PhoneInput with a country choice', () => {
  it('shows the chosen dial code over a select of the countries', () => {
    const out = html(
      <PhoneInput
        id="p"
        label="Ton numéro"
        countries={[
          { code: 'BJ', label: 'Bénin', dialCode: '+229' },
          { code: 'FR', label: 'France', dialCode: '+33' },
        ]}
        country="FR"
        onCountryChange={() => {}}
      />,
    );
    expect(out).toContain('aria-label="Pays du numéro"');
    expect(out).toMatch(/<option value="FR" selected="">France \(\+33\)<\/option>/);
    expect(out).toMatch(/>\+33</);
  });

  it('keeps the plain dial code without countries', () => {
    const out = html(<PhoneInput id="p" label="Ton numéro" dialCode="+221" />);
    expect(out).not.toContain('<select');
    expect(out).toMatch(/>\+221</);
  });
});

describe('Button', () => {
  it('renders a link when given href', () => {
    const out = html(<Button href="/app/campagnes">Mes campagnes</Button>);
    expect(out).toMatch(/^<a [^>]*href="\/app\/campagnes"/);
    expect(out).not.toMatch(/<button/);
  });

  it('is a non-submitting button by default', () => {
    expect(html(<Button>Enregistrer</Button>)).toMatch(/<button[^>]*type="button"/);
  });

  it('whatsapp variant uses the WhatsApp colors and icon', () => {
    const out = html(<Button variant="whatsapp">Partager sur WhatsApp</Button>);
    expect(out).toContain('bg-whatsapp');
    expect(out).toContain('text-whatsapp-ink');
    expect(out).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it('keeps a 48px touch target', () => {
    expect(html(<Button>OK</Button>)).toContain('min-h-12');
  });

  it('buttons lift on hover, not under reduced motion', () => {
    for (const variant of ['primary', 'secondary', 'whatsapp'] as const) {
      const out = html(<Button variant={variant}>OK</Button>);
      expect(out, variant).toContain('hover:-translate-y-0.5');
      expect(out, variant).toContain('motion-reduce:hover:translate-y-0');
    }
  });
});

describe('ChoiceButton', () => {
  it('is at least 64px tall', () => {
    expect(html(<ChoiceButton>Oui</ChoiceButton>)).toContain('min-h-16');
  });

  it('exposes its pressed state', () => {
    expect(html(<ChoiceButton>Non</ChoiceButton>)).toContain('aria-pressed="false"');
    expect(html(<ChoiceButton selected>12</ChoiceButton>)).toContain('aria-pressed="true"');
  });

  it('emphasis carries the pressed shadow', () => {
    expect(html(<ChoiceButton emphasis>Oui</ChoiceButton>)).toContain('shadow-press');
  });
});

describe('Input and PhoneInput render text-base (16px)', () => {
  it('Input ties its label to the field', () => {
    const out = html(<Input id="nom" label="Nom de la boutique" />);
    expect(out).toContain('for="nom"');
    expect(out).toMatch(/<input[^>]*id="nom"/);
    expect(out).toMatch(/<input[^>]*text-base/);
  });

  it('Input announces its error', () => {
    const out = html(<Input id="nom" label="Nom" error="Le nom est obligatoire." />);
    expect(out).toContain('aria-invalid="true"');
    expect(out).toMatch(/aria-describedby="[^"]*nom-error/);
    expect(text(<Input id="nom" label="Nom" error="Le nom est obligatoire." />)).toContain(
      'Le nom est obligatoire.',
    );
  });

  it('PhoneInput shows the dial code and opens the phone keypad', () => {
    const out = html(<PhoneInput id="tel" label="Ton numéro WhatsApp" />);
    expect(out).toContain('+221');
    expect(out).toMatch(/<input[^>]*type="tel"/);
    expect(out).toMatch(/<input[^>]*inputMode="tel"|<input[^>]*inputmode="tel"/);
    expect(out).toMatch(/<input[^>]*autoComplete="tel-national"|autocomplete="tel-national"/);
    expect(out).toMatch(/<input[^>]*text-base/);
  });

  it('PhoneInput accepts another dial code', () => {
    expect(html(<PhoneInput id="tel" label="Numéro" dialCode="+225" />)).toContain('+225');
  });
});

describe('Card and Badge', () => {
  it('Card ink tone inverts the colors', () => {
    expect(html(<Card tone="ink">x</Card>)).toContain('bg-ink');
  });

  it('Badge takes its tone color', () => {
    expect(html(<Badge tone="warning">Prudence</Badge>)).toContain('text-warning');
    expect(html(<Badge tone="accent">Nouveau</Badge>)).toContain('bg-accent');
  });
});

describe('Logo', () => {
  it('is announced as Tamani', () => {
    expect(html(<Logo variant="mark" />)).toContain('aria-label="Tamani"');
  });

  it('lockup includes the outlined wordmark', () => {
    expect(html(<Logo />)).toContain(WORDMARK_PATH.slice(0, 40));
  });

  it('inverse lockup paints the wordmark white', () => {
    expect(html(<Logo tone="inverse" />)).toContain('fill="#FFFFFF"');
    expect(html(<Logo />)).not.toContain('fill="#FFFFFF"');
  });
});
