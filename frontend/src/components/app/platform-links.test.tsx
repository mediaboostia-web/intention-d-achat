import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { html } from '@/components/ui/test-html';
import { LANDING_LINKS } from '@/lib/tamani/landing';
import { mockNextNavigation } from '@/test-utils/next-navigation';
import { ShopTestProvider } from '@/test-utils/shop-context';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false, loggingOut: false, logout: async () => {} }),
}));
vi.mock('@/lib/server/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/server/tamani/platform-settings', () => ({
  loadPlatformSettings: vi.fn(async () => ({
    displayName: 'Tamani',
    contactEmail: 'bonjour@tamani.app',
    links: { ...LANDING_LINKS, whatsappContact: 'https://wa.me/2290100000003' },
    video: null,
  })),
}));
// The gate needs a session; here only what the layout wraps around it counts.
vi.mock('./ShopProvider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./ShopProvider')>()),
  ShopGate: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('./shell-prefs', () => ({ ShellPrefs: () => null }));

const { PlatformLinksProvider, usePlatformLinks } = await import('./PlatformLinks');
const { default: PlusPage } = await import('@/app/(app)/app/plus/page');
const { default: ShopSpaceLayout } = await import('@/app/(app)/app/layout');

function Probe() {
  return <p data-help={usePlatformLinks().whatsappContact ?? 'none'} />;
}

describe('the platform links in the shop space (lot 13a)', () => {
  it('fall back to the landing constants with no provider', () => {
    expect(html(<Probe />)).toContain(`data-help="${LANDING_LINKS.whatsappContact}"`);
  });

  it('the Plus page sends Aide to the saved WhatsApp number', () => {
    mockNextNavigation({ pathname: '/app/plus' });
    const out = html(
      <PlatformLinksProvider links={{ ...LANDING_LINKS, whatsappContact: 'https://wa.me/229002' }}>
        <ShopTestProvider>
          <PlusPage />
        </ShopTestProvider>
      </PlatformLinksProvider>,
    );
    expect(out).toContain('href="https://wa.me/229002"');
    expect(out).not.toContain(`href="${LANDING_LINKS.whatsappContact}"`);
  });

  it('the shop layout hands the saved links to every page', async () => {
    const out = html(await ShopSpaceLayout({ children: <Probe /> }));
    expect(out).toContain('data-help="https://wa.me/2290100000003"');
  });
});
