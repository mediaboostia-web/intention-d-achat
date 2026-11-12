import type { ReactElement } from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import { mockNextNavigation } from '@/test-utils/next-navigation';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const { default: AuthLayout } = await import('./layout');
const { default: LoginPage, metadata: loginMetadata } = await import('./login/page');
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
    expect(t).toContain('Se connecter');
    expect(out.match(/shadow-press/g)).toHaveLength(1);
  });

  it('login has the copy brief title and description and stays out of search (§9.4, §9.7)', () => {
    expect(loginMetadata.title).toEqual({ absolute: 'Connexion à Tamani | Espace commerçant' });
    expect(loginMetadata.description).toBe(
      'Connecte-toi à ton espace Tamani pour retrouver tes produits, campagnes et réponses clients.',
    );
    expect(loginMetadata.robots).toEqual({ index: false, follow: true });
  });

  it('login is titled « Se connecter », with the sign-up link right under the title', () => {
    mockNextNavigation({ pathname: '/login' });
    const out = html(<LoginPage />);
    expect(out).toMatch(/<h1[^>]*>Se connecter<\/h1>/);
    const link = out.indexOf('Pas encore de compte ?');
    expect(link).toBeGreaterThan(out.indexOf('</h1>'));
    expect(link).toBeLessThan(out.indexOf('<input'));
    expect(out.match(/href="\/signup"/g)).toHaveLength(1);
  });

  it('login offers Google and links to signup and forgot-password', () => {
    withGoogle();
    mockNextNavigation({ pathname: '/login', search: 'next=%2Fapp%2Fcampagnes' });
    const out = html(<LoginPage />);
    expect(out).toContain('href="/api/auth/oauth/google/start?next=%2Fapp%2Fcampagnes"');
    expect(out).toContain('href="/signup"');
    expect(out).toContain('href="/forgot-password"');
    // Recette 2026-11-05: a 20 px tall link was too small for a thumb.
    expect(out).toMatch(
      /<a [^>]*class="[^"]*min-h-11[^"]*"[^>]*href="\/forgot-password"|<a [^>]*href="\/forgot-password"[^>]*class="[^"]*min-h-11/,
    );
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
    expect(t).toContain('Créer mon compte');
    expect(t).toContain('Tu crées ta boutique juste après.');
  });

  it('signup is titled « Créer un compte », with the sign-in link right under the title', () => {
    mockNextNavigation({ pathname: '/signup' });
    const out = html(<SignupPage />);
    expect(out).toMatch(/<h1[^>]*>Créer un compte<\/h1>/);
    const link = out.indexOf('Déjà un compte ?');
    expect(link).toBeGreaterThan(out.indexOf('</h1>'));
    expect(link).toBeLessThan(out.indexOf('<input'));
    expect(out.match(/href="\/login"/g)).toHaveLength(1);
  });

  // Porteur, 2026-11-04: the first name first, so sign-up differs from sign-in.
  it('signup asks the first name first', () => {
    mockNextNavigation({ pathname: '/signup' });
    const out = html(<SignupPage />);
    const tag = inputTag(out, 'firstName');
    expect(tag).toContain('autoComplete="given-name"');
    expect(tag).toContain('required=""');
    expect(tag).toContain('maxLength="60"');
    expect(out.indexOf('id="firstName"')).toBeLessThan(out.indexOf('id="email"'));
    expect(text(<SignupPage />)).toContain('Ton prénom');
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
  const panelOf = (pathname: string) => {
    mockNextNavigation({ pathname });
    const out = html(
      <AuthLayout>
        <p>page</p>
      </AuthLayout>,
    );
    return { out, panel: out.match(/<aside [^>]*>[\s\S]*?<\/aside>/)?.[0] ?? '' };
  };

  // Porteur, 2026-11-05 (AMU capture): a bigger picture, seen on phones too.
  it('the picture shows on phones as a band and on computers as a big rounded card', () => {
    const { out, panel } = panelOf('/login');
    const classes = panel.match(/^<aside [^>]*class="([^"]*)"/)?.[1]?.split(' ') ?? [];
    expect(classes).not.toContain('hidden');
    expect(classes).toEqual(
      expect.arrayContaining([
        'rounded-card',
        'h-56',
        'lg:sticky',
        'lg:top-4',
        'lg:h-[calc(100dvh-2rem)]',
      ]),
    );
    expect(out).toMatch(/class="[^"]*lg:grid-cols-\[/);
    expect(out).toContain('<p>page</p>');
  });

  // Porteur, 2026-11-12: no « Retour au site » button; the logo is the way back.
  it('the logo leads back to the site, with no separate back button', () => {
    for (const path of ['/login', '/signup']) {
      const { panel } = panelOf(path);
      expect(panel).not.toContain('Retour au site');
      const home = panel.match(/<a [^>]*href="\/"[^>]*>[\s\S]*?<\/a>/g) ?? [];
      expect(home).toHaveLength(1);
      expect(home[0]).toContain('aria-label="Tamani, retour à l&#x27;accueil"');
      expect(home[0]).toContain('<svg');
      expect(home[0]).toMatch(/min-h-11/);
    }
  });

  it('the sentence on the picture reads on a dark wash, in both themes', () => {
    const { panel } = panelOf('/signup');
    expect(panel).toContain('from-deep');
    expect(panel).toContain('text-deep-ink');
  });

  // Porteur, 2026-10-30: each page speaks to the visitor, with its own drawing.
  it('signing in says the clients may have answered, with the morning drawing', () => {
    for (const pathname of ['/login', '/forgot-password', '/reset-password', '/auth/error']) {
      const { panel } = panelOf(pathname);
      expect(panel, pathname).toContain('Tes clients ont peut-être déjà répondu.');
      expect(panel, pathname).toMatch(/<img [^>]*alt=""[^>]*%2Faccueil%2Fconnexion\.webp/);
    }
  });

  it('signing up says to ask the community first, with the trial, and its drawing', () => {
    for (const pathname of ['/signup', '/verify-email']) {
      const { panel } = panelOf(pathname);
      expect(panel, pathname).toContain('Avant de commander, demande à ta communauté.');
      expect(panel.replaceAll('&#x27;', "'"), pathname).toContain(
        "3 jours d'essai gratuit, sans carte bancaire.",
      );
      expect(panel, pathname).toMatch(/<img [^>]*alt=""[^>]*%2Faccueil%2Finscription\.webp/);
    }
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
