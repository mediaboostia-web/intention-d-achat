import { describe, it, expect, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import { mockNextNavigation } from '@/test-utils/next-navigation';
import { ShopTestProvider } from '@/test-utils/shop-context';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const auth = {
  user: {
    id: 'u1',
    email: 'awa@example.com',
    emailVerifiedAt: '2026-10-24T10:00:00.000Z',
    createdAt: '2026-10-24T10:00:00.000Z',
    updatedAt: '2026-10-24T10:00:00.000Z',
    hasPassword: true,
    linkedProviders: [] as string[],
  },
  loading: false,
  loggingOut: false,
  error: null,
  refresh: async () => {},
  logout: async () => {},
};
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

const { CoefficientsForm, coefLabel } = await import('./CoefficientsForm');
const { ZoneEditor } = await import('./ZoneEditor');
const { AccountSection } = await import('./AccountSection');
const { SettingsView } = await import('@/app/(app)/app/reglages/settings-view');

const zones = [
  { id: 'z1', name: 'Médina', sortOrder: 0 },
  { id: 'z2', name: 'Parcelles', sortOrder: 1 },
];

describe('CoefficientsForm', () => {
  it('CoefficientsForm reads 0.5 as 5 sur 10', () => {
    expect(coefLabel(0.5)).toBe('5 sur 10');
    expect(coefLabel(0.55)).toBe('5,5 sur 10');
    const out = html(
      <CoefficientsForm coefConsumer={0.5} coefReseller={0.7} onSave={async () => {}} />,
    );
    const range = (id: string) =>
      (out.match(/<input [^>]*>/g) ?? []).find((t) => t.includes(`id="${id}"`)) ?? '';
    expect(range('coef-consumer')).toContain('type="range"');
    expect(range('coef-consumer')).toContain('value="50"');
    expect(range('coef-consumer')).toContain('step="5"');
    expect(range('coef-consumer')).toContain('aria-valuetext="5 sur 10"');
    expect(range('coef-reseller')).toContain('value="70"');
    const t = text(
      <CoefficientsForm coefConsumer={0.5} coefReseller={0.7} onSave={async () => {}} />,
    );
    expect(t).toContain('Sur 10 usagers intéressés, combien achètent vraiment ?');
    expect(t).toContain('7 sur 10');
    expect(t).toContain('Par défaut : 5 usagers et 7 revendeurs sur 10.');
  });
});

describe('ZoneEditor', () => {
  it('ZoneEditor lists zones with rename and delete controls', () => {
    const out = html(<ZoneEditor shopId="org_1" zones={zones} />);
    expect(text(<ZoneEditor shopId="org_1" zones={zones} />)).toContain('Médina');
    expect(out).toContain('aria-label="Renommer Médina"');
    expect(out).toContain('aria-label="Supprimer Médina"');
    expect(out).toContain('aria-label="Supprimer Parcelles"');
    expect(out).toContain('for="zone-new"');
  });

  it('says so when there is no zone yet', () => {
    expect(text(<ZoneEditor shopId="org_1" zones={[]} />)).toContain('Pas encore de zone');
  });
});

describe('AccountSection', () => {
  it('account section offers to link Google when not linked', () => {
    mockNextNavigation({ pathname: '/app/reglages' });
    const out = html(<AccountSection google />);
    expect(out).toContain('href="/api/auth/oauth/google/start?next=%2Fapp%2Freglages"');
    const t = text(<AccountSection google />);
    expect(t).toContain('awa@example.com');
    expect(t).toContain('Lier mon compte Google');
    expect(t).toContain('Changer le mot de passe');
    expect(t).toContain('Se déconnecter');
    expect(html(<AccountSection google={false} />)).not.toContain('oauth/google/start');
  });
});

describe('SettingsView', () => {
  it('settings sections are disabled for a MEMBER', () => {
    mockNextNavigation({ pathname: '/app/reglages' });
    const member = html(
      <ShopTestProvider role="MEMBER">
        <SettingsView google={false} />
      </ShopTestProvider>,
    );
    expect(member).toMatch(/Seul le gérant de la boutique/);
    expect(member.match(/<fieldset disabled=""/g)?.length).toBe(3);

    const owner = html(
      <ShopTestProvider role="OWNER">
        <SettingsView google={false} />
      </ShopTestProvider>,
    );
    expect(owner).not.toMatch(/<fieldset disabled=""/);
    for (const title of ['Ta boutique', 'Zones de livraison', 'Estimation', 'Ton compte']) {
      expect(owner, title).toContain(title);
    }
  });

  it('shows the WhatsApp number without the dial code the field already shows', () => {
    mockNextNavigation({ pathname: '/app/reglages' });
    const out = html(
      <ShopTestProvider>
        <SettingsView google={false} />
      </ShopTestProvider>,
    );
    const phone =
      (out.match(/<input [^>]*>/g) ?? []).find((t) => t.includes('id="shop-phone"')) ?? '';
    expect(phone).toContain('value="771234567"');
  });

  it('saves each section with a plain button: settings have no main gesture', () => {
    mockNextNavigation({ pathname: '/app/reglages' });
    const out = html(
      <ShopTestProvider>
        <SettingsView google={false} />
      </ShopTestProvider>,
    );
    const save = (out.match(/<button [^>]*>[^<]*<\/button>/g) ?? []).find((t) =>
      t.includes('Enregistrer la boutique'),
    );
    expect(save).toBeDefined();
    expect(save).toContain('min-h-12');
    expect(out).not.toContain('shadow-press');
  });
});
