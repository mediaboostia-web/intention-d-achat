import { describe, it, expect, vi } from 'vitest';
import { html } from '@/components/ui/test-html';
import { mockNextNavigation } from '@/test-utils/next-navigation';
import { PasswordFieldView } from './PasswordInput';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'awa@example.com', hasPassword: true, linkedProviders: [] },
    refresh: async () => {},
    logout: async () => {},
    loggingOut: false,
  }),
}));

const { default: LoginPage } = await import('@/app/(auth)/login/page');
const { default: SignupPage } = await import('@/app/(auth)/signup/page');
const { default: ResetPasswordPage } = await import('@/app/(auth)/reset-password/page');
const { AccountSection } = await import('./AccountSection');

const tag = (out: string, name: string, id: string) =>
  (out.match(new RegExp(`<${name} [^>]*>`, 'g')) ?? []).find((t) => t.includes(id)) ?? '';
const toggles = (out: string) => out.match(/aria-label="Afficher le mot de passe"/g)?.length ?? 0;

describe('PasswordFieldView', () => {
  const props = {
    id: 'pw',
    label: 'Mot de passe',
    hint: '10 caractères au moins.',
    value: 'secret-123',
    onChange: () => {},
    onToggle: () => {},
  };

  it('hides the password behind an eye that shows it', () => {
    const out = html(<PasswordFieldView {...props} visible={false} />);
    expect(tag(out, 'input', 'id="pw"')).toContain('type="password"');
    const eye = tag(out, 'button', 'aria-controls="pw"');
    expect(eye).toContain('type="button"');
    expect(eye).toContain('aria-label="Afficher le mot de passe"');
    expect(eye).toContain('aria-pressed="false"');
  });

  it('shows the password as text once the eye is pressed', () => {
    const out = html(<PasswordFieldView {...props} visible />);
    expect(tag(out, 'input', 'id="pw"')).toContain('type="text"');
    const eye = tag(out, 'button', 'aria-controls="pw"');
    expect(eye).toContain('aria-label="Masquer le mot de passe"');
    expect(eye).toContain('aria-pressed="true"');
  });

  it('keeps the label, the hint and the error tied to the field', () => {
    const out = html(<PasswordFieldView {...props} error="Trop court." visible={false} />);
    expect(out).toContain('for="pw"');
    expect(tag(out, 'input', 'id="pw"')).toContain('aria-describedby="pw-error pw-hint"');
  });
});

describe('every password field has the eye', () => {
  it('on login, signup and reset-password', () => {
    mockNextNavigation({ pathname: '/login' });
    expect(toggles(html(<LoginPage />))).toBe(1);
    mockNextNavigation({ pathname: '/signup' });
    expect(toggles(html(<SignupPage />))).toBe(1);
    mockNextNavigation({ pathname: '/reset-password', search: 'email=a%40b.c&code=ABCD2345' });
    expect(toggles(html(<ResetPasswordPage />))).toBe(1);
  });

  it('in the account settings (current, new, confirmation)', () => {
    mockNextNavigation({ pathname: '/app/reglages' });
    expect(toggles(html(<AccountSection google={false} />))).toBe(3);
  });
});
