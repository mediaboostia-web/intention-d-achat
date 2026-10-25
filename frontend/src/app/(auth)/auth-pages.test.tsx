import type { ReactElement } from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import { mockNextNavigation } from '@/test-utils/next-navigation';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const { default: AuthLayout } = await import('./layout');
const { default: LoginPage } = await import('./login/page');
const { default: SignupPage } = await import('./signup/page');
const { default: VerifyEmailPage } = await import('./verify-email/page');
const { default: ForgotPasswordPage } = await import('./forgot-password/page');
const { default: ResetPasswordPage } = await import('./reset-password/page');
const { default: AuthErrorPage } = await import('./auth/error/page');

/** The opening tag of the input with this id. */
const inputTag = (out: string, id: string) =>
  (out.match(/<input [^>]*>/g) ?? []).find((tag) => tag.includes(`id="${id}"`)) ?? '';

function withGoogle() {
  vi.stubEnv('GOOGLE_CLIENT_ID', 'client-id');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'client-secret');
  vi.stubEnv('GOOGLE_REDIRECT_URI', 'http://localhost:3001/api/auth/oauth/google/callback');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('login', () => {
  it('login renders labelled email and password fields with autocomplete', () => {
    mockNextNavigation({ pathname: '/login' });
    const out = html(<LoginPage />);
    expect(out).toContain('for="email"');
    expect(inputTag(out, 'email')).toContain('type="email"');
    expect(inputTag(out, 'email')).toContain('autoComplete="email"');
    expect(out).toContain('for="password"');
    expect(inputTag(out, 'password')).toContain('type="password"');
    expect(inputTag(out, 'password')).toContain('autoComplete="current-password"');
    const t = text(<LoginPage />);
    expect(t).toContain('Content de te revoir');
    expect(t).toContain('Se connecter');
    expect(out.match(/shadow-press/g)).toHaveLength(1);
  });

  it('login offers Google and links to signup and forgot-password', () => {
    withGoogle();
    mockNextNavigation({ pathname: '/login', search: 'next=%2Fapp%2Fcampagnes' });
    const out = html(<LoginPage />);
    expect(out).toContain('href="/api/auth/oauth/google/start?next=%2Fapp%2Fcampagnes"');
    expect(out).toContain('href="/signup"');
    expect(out).toContain('href="/forgot-password"');
    expect(text(<LoginPage />)).toContain('Continuer avec Google');
  });

  it('login hides Google when it is not configured', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '');
    mockNextNavigation({ pathname: '/login' });
    expect(html(<LoginPage />)).not.toContain('/api/auth/oauth/google/start');
  });

  it('login sends a foreign next back to /app for Google', () => {
    withGoogle();
    mockNextNavigation({ pathname: '/login', search: 'next=%2F%2Fevil.com' });
    expect(html(<LoginPage />)).toContain('href="/api/auth/oauth/google/start?next=%2Fapp"');
  });

  it('login?reset=ok confirms the new password', () => {
    mockNextNavigation({ pathname: '/login', search: 'reset=ok' });
    expect(text(<LoginPage />)).toContain('Mot de passe changé. Connecte-toi.');
  });
});

describe('signup', () => {
  it('signup asks for a new-password', () => {
    mockNextNavigation({ pathname: '/signup' });
    const out = html(<SignupPage />);
    expect(inputTag(out, 'password')).toContain('autoComplete="new-password"');
    expect(inputTag(out, 'password')).toContain('minLength="10"');
    const t = text(<SignupPage />);
    expect(t).toContain('Crée ton espace');
    expect(t).toContain('Créer mon compte');
    expect(t).toContain('Tu crées ta boutique juste après.');
  });
});

describe('Google first', () => {
  const GOOGLE = '/api/auth/oauth/google/start';

  it('Google comes first on login and signup', () => {
    withGoogle();
    for (const [pathname, Page] of [
      ['/login', LoginPage],
      ['/signup', SignupPage],
    ] as const) {
      mockNextNavigation({ pathname });
      const out = html(<Page />);
      expect(out.indexOf(GOOGLE), pathname).toBeGreaterThan(-1);
      expect(out.indexOf(GOOGLE), pathname).toBeLessThan(out.indexOf('id="email"'));
      expect(text(<Page />), pathname).toContain('ou avec ton e-mail');
      expect(text(<Page />).match(/\bou\b/g)?.length, pathname).toBe(1);
    }
  });

  it('without Google there is no divider', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '');
    for (const [pathname, Page] of [
      ['/login', LoginPage],
      ['/signup', SignupPage],
    ] as const) {
      mockNextNavigation({ pathname });
      expect(text(<Page />), pathname).not.toContain('ou avec ton e-mail');
    }
  });
});

describe('layout', () => {
  it('the desktop panel carries the sentence and the drawing', () => {
    mockNextNavigation({ pathname: '/login' });
    const out = html(
      <AuthLayout>
        <p>page</p>
      </AuthLayout>,
    );
    const panel = out.match(/<aside [^>]*>[\s\S]*?<\/aside>/)?.[0] ?? '';
    const classes = panel.match(/^<aside [^>]*class="([^"]*)"/)?.[1]?.split(' ') ?? [];
    expect(classes).toEqual(expect.arrayContaining(['hidden', 'lg:flex', 'bg-primary']));
    expect(panel).toContain('Avant de commander, demande à ta communauté.');
    expect(panel).toMatch(/<svg [^>]*data-illustration="auth"[^>]*aria-hidden="true"/);
    expect(out).toMatch(/class="[^"]*lg:grid-cols-2/);
    expect(out).toContain('<p>page</p>');
  });
});

describe('verify-email', () => {
  it('verify-email prefills the email and code from the URL', () => {
    mockNextNavigation({
      pathname: '/verify-email',
      search: 'email=awa%40example.com&code=ABCD2345',
    });
    const out = html(<VerifyEmailPage />);
    expect(inputTag(out, 'email')).toContain('value="awa@example.com"');
    const code = inputTag(out, 'code');
    expect(code).toContain('value="ABCD2345"');
    expect(code).toContain('autoComplete="one-time-code"');
    expect(code).toContain('inputMode="text"');
    expect(code).toContain('maxLength="8"');
    expect(text(<VerifyEmailPage />)).toContain('Vérifie ton email');
  });
});

describe('forgot and reset password', () => {
  it('forgot-password asks for the email', () => {
    mockNextNavigation({ pathname: '/forgot-password' });
    expect(inputTag(html(<ForgotPasswordPage />), 'email')).toContain('type="email"');
    expect(text(<ForgotPasswordPage />)).toContain('Mot de passe oublié ?');
  });

  it('reset-password prefills the email and code and asks for a new-password', () => {
    mockNextNavigation({
      pathname: '/reset-password',
      search: 'email=awa%40example.com&code=WXYZ6789',
    });
    const out = html(<ResetPasswordPage />);
    expect(inputTag(out, 'email')).toContain('value="awa@example.com"');
    expect(inputTag(out, 'code')).toContain('value="WXYZ6789"');
    expect(inputTag(out, 'password')).toContain('autoComplete="new-password"');
    expect(text(<ResetPasswordPage />)).toContain('Choisis un nouveau mot de passe');
  });
});

describe('auth error', () => {
  it('auth error maps GOOGLE_EMAIL_NOT_VERIFIED to French', () => {
    mockNextNavigation({ pathname: '/auth/error', search: 'code=GOOGLE_EMAIL_NOT_VERIFIED' });
    expect(text(<AuthErrorPage />)).toContain("Ton adresse Google n'est pas vérifiée.");
  });

  it('auth error falls back to a generic French message', () => {
    mockNextNavigation({ pathname: '/auth/error', search: 'error=whatever' });
    const t = text(<AuthErrorPage />);
    expect(t).toContain('La connexion a échoué.');
    expect(html(<AuthErrorPage />)).toContain('href="/login"');
  });
});

describe('charter', () => {
  it('auth pages use Tamani tokens only', () => {
    withGoogle();
    mockNextNavigation({ pathname: '/login' });
    const pages: ReactElement[] = [
      <AuthLayout key="layout">
        <LoginPage />
      </AuthLayout>,
      <SignupPage key="signup" />,
      <VerifyEmailPage key="verify" />,
      <ForgotPasswordPage key="forgot" />,
      <ResetPasswordPage key="reset" />,
      <AuthErrorPage key="error" />,
    ];
    const palette =
      /\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|decoration)-(?:white|black|(?:slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})\b/;
    for (const page of pages) expect(html(page)).not.toMatch(palette);
  });
});
