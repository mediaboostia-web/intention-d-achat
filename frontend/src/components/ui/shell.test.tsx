import { describe, it, expect } from 'vitest';
import { BottomNav, Icon, Notice, Select, SideNav, Steps, Switch, Tabs, Textarea } from '.';
import { html, text } from './test-html';

/** The opening <a> tag pointing at href, whatever the attribute order. */
const anchor = (out: string, href: string) =>
  (out.match(/<a [^>]*>/g) ?? []).find((tag) => tag.includes(`href="${href}"`)) ?? '';

const ICONS = [
  'home',
  'megaphone',
  'receipt',
  'people',
  'more',
  'box',
  'gear',
  'plus',
  'copy',
  'link',
  'photo',
  'check',
  'lock',
] as const;

describe('Textarea and Select', () => {
  it('Textarea and Select link their label, hint and error', () => {
    const area = html(
      <Textarea
        id="msg"
        label="Message"
        hint="1 000 caractères au plus."
        error="Écris un message."
      />,
    );
    expect(area).toContain('for="msg"');
    expect(area).toMatch(/<textarea[^>]*id="msg"/);
    expect(area).toMatch(/<textarea[^>]*aria-invalid="true"/);
    expect(area).toMatch(/<textarea[^>]*aria-describedby="msg-error msg-hint"/);
    expect(area).toMatch(/<textarea[^>]*text-base/);

    const select = html(
      <Select
        id="pays"
        label="Pays"
        hint="Pour l'indicatif."
        error="Choisis un pays."
        options={[{ value: 'SN', label: 'Sénégal' }]}
      />,
    );
    expect(select).toContain('for="pays"');
    expect(select).toMatch(/<select[^>]*id="pays"/);
    expect(select).toMatch(/<select[^>]*aria-invalid="true"/);
    expect(select).toMatch(/<select[^>]*aria-describedby="pays-error pays-hint"/);
    expect(select).toMatch(/<select[^>]*text-base/);
  });

  it('Select renders every option', () => {
    const out = html(
      <Select
        id="pays"
        label="Pays"
        options={[
          { value: 'SN', label: 'Sénégal' },
          { value: 'CI', label: "Côte d'Ivoire" },
          { value: 'ML', label: 'Mali' },
        ]}
      />,
    );
    expect(out.match(/<option /g)).toHaveLength(3);
    expect(out).toContain('value="CI"');
    expect(
      text(<Select id="p" label="Pays" options={[{ value: 'ML', label: 'Mali' }]} />),
    ).toContain('Mali');
  });
});

describe('Switch', () => {
  it('Switch is a real checkbox with role switch and a 48px target', () => {
    const out = html(
      <Switch
        id="live"
        label="Afficher le compteur"
        hint="Les gens voient combien ont répondu."
        checked
      />,
    );
    expect(out).toMatch(/<input[^>]*type="checkbox"/);
    expect(out).toMatch(/<input[^>]*role="switch"/);
    expect(out).toMatch(/<input[^>]*checked=""/);
    expect(out).toMatch(/<input[^>]*aria-describedby="live-hint"/);
    expect(out).toContain('for="live"');
    expect(out).toContain('min-h-12');
  });
});

describe('Notice', () => {
  it('Notice danger is an alert, info a status', () => {
    expect(html(<Notice tone="danger">La photo est trop lourde.</Notice>)).toMatch(
      /^<div[^>]*role="alert"/,
    );
    expect(html(<Notice tone="info">Brouillon enregistré.</Notice>)).toMatch(
      /^<div[^>]*role="status"/,
    );
    expect(html(<Notice tone="warning">Bientôt la limite.</Notice>)).toMatch(
      /^<div[^>]*role="status"/,
    );
    expect(
      text(
        <Notice tone="warning" title="3 campagnes en cours" action={<a href="/app/plus">Voir</a>}>
          Termine-en une.
        </Notice>,
      ),
    ).toBe('3 campagnes en cours Termine-en une. Voir');
  });
});

describe('Steps', () => {
  it('Steps reads "Étape 2 sur 6"', () => {
    const out = html(<Steps current={2} total={6} title="Quand le produit est là" />);
    expect(text(<Steps current={2} total={6} title="Quand le produit est là" />)).toBe(
      'Étape 2 sur 6 Quand le produit est là',
    );
    expect(out).toMatch(/font-hand[^>]*>Quand le produit est là/);
    expect(out).toContain('aria-hidden="true"');
  });
});

describe('Tabs', () => {
  it('Tabs marks the active tab with aria-current', () => {
    const out = html(
      <Tabs
        label="Campagne"
        items={[
          { id: 'share', label: 'Partager', href: '/app/campagnes/c1', active: true },
          { id: 'edit', label: 'Modifier', href: '/app/campagnes/c1?onglet=modifier' },
        ]}
      />,
    );
    expect(out).toMatch(/^<nav[^>]*aria-label="Campagne"/);
    expect(out.match(/aria-current="page"/g)).toHaveLength(1);
    expect(anchor(out, '/app/campagnes/c1')).toContain('aria-current="page"');
  });
});

describe('BottomNav and SideNav', () => {
  it('BottomNav lists the five entries in order and marks the current one', () => {
    const out = html(<BottomNav pathname="/app/campagnes/abc" />);
    expect(text(<BottomNav pathname="/app/campagnes/abc" />)).toBe(
      'Accueil Campagnes Commandes Clients Plus',
    );
    expect(out.match(/aria-current="page"/g)).toHaveLength(1);
    expect(anchor(out, '/app/campagnes')).toContain('aria-current="page"');
  });

  it('BottomNav hides from lg up and SideNav shows from lg up', () => {
    const bottom = html(<BottomNav pathname="/app" />);
    expect(bottom).toMatch(/^<nav[^>]*class="[^"]*fixed[^"]*bottom-0[^"]*lg:hidden/);
    expect(bottom).toContain('env(safe-area-inset-bottom)');

    const side = html(<SideNav pathname="/app/produits" shopName="Diallo Import" />);
    expect(side).toMatch(/^<nav[^>]*class="[^"]*hidden[^"]*lg:flex/);
    const t = text(<SideNav pathname="/app/produits" shopName="Diallo Import" />);
    expect(t).toContain('Diallo Import');
    expect(t).toContain('Produits');
    expect(t).toContain('Réglages');
    expect(t).not.toContain('Plus');
    expect(anchor(side, '/app/produits')).toContain('aria-current="page"');
  });
});

describe('Icon', () => {
  it('icons use currentColor and no fill colour', () => {
    for (const name of ICONS) {
      const out = html(<Icon name={name} />);
      expect(out, name).toMatch(/^<svg[^>]*aria-hidden="true"/);
      expect(out, name).toMatch(/stroke="currentColor"/);
      expect(out, name).toMatch(/stroke-width="2"/);
      expect(out, name).toMatch(/stroke-linecap="round"/);
      expect(out, name).not.toMatch(/fill="#|fill="rgb/);
      expect(out, name).toMatch(/<(path|circle|rect|line|polyline)/);
    }
  });
});
