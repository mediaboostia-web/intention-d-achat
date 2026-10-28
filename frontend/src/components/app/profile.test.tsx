// Profil (porteur's feedback 2, §8): the avatar opens it; the name changes
// there, the email is read only, the password changes or is created.
import { describe, it, expect, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import { mockNextNavigation } from '@/test-utils/next-navigation';
import { ShopTestProvider } from '@/test-utils/shop-context';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);
const auth = vi.hoisted(() => ({
  user: null as null | { email: string; hasPassword: boolean; linkedProviders: string[] },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: auth.user,
    loading: false,
    loggingOut: false,
    error: null,
    refresh: async () => {},
    logout: async () => {},
  }),
}));

const { ProfileView } = await import('./ProfileView');
const { default: ProfilePage } = await import('@/app/(app)/app/profil/page');

const noop = async () => {};
const props = {
  name: 'Fatou Ndiaye',
  shopName: 'Diallo Import',
  email: 'awa@example.com',
  hasPassword: true,
  logoUrl: null,
  onRename: noop,
  onPassword: noop,
  onSignOut: () => {},
};

const tag = (out: string, id: string) =>
  (out.match(/<input [^>]*>/g) ?? []).find((t) => t.includes(`id="${id}"`)) ?? '';

describe('ProfileView', () => {
  it('shows the avatar, the name form, the email, the password and sign out, in that order', () => {
    const el = <ProfileView {...props} />;
    const t = text(el);
    const order = ['FN', 'Ton nom', 'E-mail', 'Changer le mot de passe', 'Se déconnecter'];
    const at = order.map((s) => t.indexOf(s));
    for (const [i, s] of order.entries()) expect(at[i], s).toBeGreaterThanOrEqual(0);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('the name is a field of 80 characters at most, filled with the current name', () => {
    const name = tag(html(<ProfileView {...props} />), 'profile-name');
    expect(name).toContain('value="Fatou Ndiaye"');
    expect(name).toMatch(/maxlength="80"/i);
    expect(name).toContain('required');
  });

  it('the email is read only', () => {
    const email = tag(html(<ProfileView {...props} />), 'profile-email');
    expect(email).toContain('value="awa@example.com"');
    expect(email).toMatch(/readonly/i);
  });

  it('with a password: the current one and a new one', () => {
    const out = html(<ProfileView {...props} />);
    const t = text(<ProfileView {...props} />);
    expect(t).toContain('Changer le mot de passe');
    expect(t).not.toContain('Créer un mot de passe');
    expect(tag(out, 'profile-current')).toContain('current-password');
    expect(tag(out, 'profile-new')).toContain('new-password');
  });

  it('a Google account without a password creates one', () => {
    const out = html(<ProfileView {...props} hasPassword={false} />);
    const t = text(<ProfileView {...props} hasPassword={false} />);
    expect(t).toContain('Créer un mot de passe');
    expect(t).not.toContain('Changer le mot de passe');
    expect(tag(out, 'profile-current')).toBe('');
    expect(tag(out, 'profile-new')).toContain('new-password');
  });

  it("the avatar is the shop's logo when there is one, else the shop's initials without a name", () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/v1/logo.png';
    expect(html(<ProfileView {...props} logoUrl={url} />)).toContain('<img');
    expect(text(<ProfileView {...props} name={null} />)).toMatch(/^DI\b/);
    expect(tag(html(<ProfileView {...props} name={null} />), 'profile-name')).toContain('value=""');
  });
});

describe('/app/profil', () => {
  const page = () => {
    mockNextNavigation({ pathname: '/app/profil' });
    return (
      <ShopTestProvider>
        <ProfilePage />
      </ShopTestProvider>
    );
  };

  it('waits for the account before showing the forms', () => {
    auth.user = null;
    expect(html(page())).toContain('role="status"');
    expect(text(page())).not.toContain('Se déconnecter');
  });

  it("shows the signed-in person's profile", () => {
    auth.user = { email: 'awa@example.com', hasPassword: false, linkedProviders: ['google'] };
    const t = text(page());
    expect(t).toContain('Ton profil');
    expect(t).toContain('Créer un mot de passe');
    expect(tag(html(page()), 'profile-name')).toContain('value="Fatou Ndiaye"');
    expect(tag(html(page()), 'profile-email')).toContain('value="awa@example.com"');
  });
});
