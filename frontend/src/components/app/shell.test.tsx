import { describe, it, expect, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import { mockNextNavigation } from '@/test-utils/next-navigation';
import { ShopTestProvider, TEST_SHOP } from '@/test-utils/shop-context';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'awa@example.com' },
    loading: false,
    loggingOut: false,
    error: null,
    refresh: async () => {},
    logout: async () => {},
  }),
}));

const { AppShell } = await import('./AppShell');
const { ShopForm } = await import('./ShopForm');
const { ZonesInput } = await import('./ZonesInput');
const { PhotoPicker } = await import('./PhotoPicker');
const { default: WelcomePage } = await import('@/app/(app)/app/bienvenue/page');
const { default: PlusPage } = await import('@/app/(app)/app/plus/page');
const { default: HomePage } = await import('@/app/(app)/app/page');

const tag = (out: string, name: string, id: string) =>
  (out.match(new RegExp(`<${name} [^>]*>`, 'g')) ?? []).find((t) => t.includes(`id="${id}"`)) ?? '';

describe('AppShell', () => {
  it('AppShell renders both navs around the page', () => {
    mockNextNavigation({ pathname: '/app/commandes' });
    const page = (
      <ShopTestProvider>
        <AppShell>
          <p>Le contenu de la page</p>
        </AppShell>
      </ShopTestProvider>
    );
    const out = html(page);
    expect(out.match(/aria-label="Menu principal"/g)).toHaveLength(2);
    expect(out).toMatch(/<main[^>]*id="contenu"[^>]*>.*Le contenu de la page/s);
    expect(out).toContain('href="#contenu"');
    expect(out).toMatch(/pb-36[^"]*lg:pb-12|lg:pb-12[^"]*pb-36/);
    expect(text(page).match(/Diallo Import/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps the notification bell in the header at every width', () => {
    mockNextNavigation({ pathname: '/app' });
    const out = html(
      <ShopTestProvider>
        <AppShell>
          <p>Page</p>
        </AppShell>
      </ShopTestProvider>,
    );
    const header = out.match(/<header[^>]*>.*?<\/header>/s)?.[0] ?? '';
    expect(header).toContain('aria-label="Notifications"');
    expect(header.match(/^<header[^>]*>/)?.[0]).not.toContain('lg:hidden');
  });

  it('the phone header carries the bell and the avatar', () => {
    mockNextNavigation({ pathname: '/app' });
    const out = html(
      <ShopTestProvider>
        <AppShell>
          <p>Page</p>
        </AppShell>
      </ShopTestProvider>,
    );
    const header = out.match(/<header[^>]*>.*?<\/header>/s)?.[0] ?? '';
    const account = (header.match(/<a [^>]*>/g) ?? []).find((t) => t.includes('href="/app/plus"'));
    expect(account).toContain('aria-label="Compte et forfait"');
    expect(text(<div dangerouslySetInnerHTML={{ __html: header }} />)).toContain('FN');
  });

  it("the avatar falls back to the shop's initials", () => {
    mockNextNavigation({ pathname: '/app' });
    const out = html(
      <ShopTestProvider me={{ firstName: null, name: null }}>
        <AppShell>
          <p>Page</p>
        </AppShell>
      </ShopTestProvider>,
    );
    const header = out.match(/<header[^>]*>.*?<\/header>/s)?.[0] ?? '';
    expect(text(<div dangerouslySetInnerHTML={{ __html: header }} />)).toContain('DI');
  });

  it('desktop tools sit on the title line', () => {
    mockNextNavigation({ pathname: '/app' });
    const out = html(
      <ShopTestProvider>
        <AppShell>
          <p>Page</p>
        </AppShell>
      </ShopTestProvider>,
    );
    const header = out.match(/<header[^>]*>.*?<\/header>/s)?.[0] ?? '';
    expect(header).toMatch(/class="[^"]*lg:absolute[^"]*"[^>]*>.*aria-label="Notifications"/s);
    expect(out).toMatch(/<main[^>]*class="[^"]*lg:\[--shell-tools:7rem\]/);
  });
});

describe('welcome', () => {
  it('welcome form labels every field and defaults to Senegal +221', () => {
    mockNextNavigation({ pathname: '/app/bienvenue' });
    const page = (
      <ShopTestProvider>
        <WelcomePage />
      </ShopTestProvider>
    );
    const out = html(page);
    for (const id of ['shop-name', 'shop-country', 'shop-phone']) {
      expect(out, id).toContain(`for="${id}"`);
    }
    expect(out).toMatch(
      /<option [^>]*value="SN"[^>]*selected=""|<option [^>]*selected=""[^>]*value="SN"/,
    );
    expect(out).toContain('+221');
    expect(out).toMatch(/<legend[^>]*>Logo/);
    expect(out).toMatch(/<legend[^>]*>Zones de livraison/);
    const t = text(page);
    expect(t).toContain('Bienvenue ! Créons ta boutique.');
    expect(t).toContain('Tu pourras les changer plus tard.');
    expect(t).toContain('Créer ma boutique');
    expect(out.match(/shadow-press/g)).toHaveLength(1);
  });
});

describe('ShopForm', () => {
  it('ShopForm shows the error notice it is given', () => {
    const out = html(
      <ShopForm
        submitLabel="Créer ma boutique"
        submittingLabel="Création…"
        submitting={false}
        error="Le serveur ne répond pas pour le moment. Réessaie dans un instant."
        onSubmit={() => {}}
      />,
    );
    expect(out).toMatch(/role="alert"[^>]*>.*Le serveur ne répond pas pour le moment/s);
  });

  it('puts a field error under its field', () => {
    const out = html(
      <ShopForm
        submitLabel="Enregistrer"
        submittingLabel="Enregistrement…"
        submitting={false}
        errors={{ whatsappPhone: "Ce numéro WhatsApp n'est pas valide." }}
        onSubmit={() => {}}
      />,
    );
    expect(tag(out, 'input', 'shop-phone')).toContain('aria-invalid="true"');
    expect(out).toContain('id="shop-phone-error"');
  });
});

describe('ZonesInput and PhotoPicker', () => {
  it('ZonesInput lists each zone with a remove button', () => {
    const out = html(
      <ZonesInput
        id="zones"
        label="Zones de livraison"
        value={['Médina', 'Parcelles']}
        onChange={() => {}}
      />,
    );
    expect(
      text(<ZonesInput id="z" label="Zones" value={['Médina']} onChange={() => {}} />),
    ).toContain('Médina');
    expect(out).toContain('aria-label="Retirer Médina"');
    expect(out).toContain('aria-label="Retirer Parcelles"');
    expect(out).toContain('for="zones"');
  });

  it('PhotoPicker shows the photos and hides the add tile at max', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/v1/logo.png';
    const full = html(
      <PhotoPicker id="logo" label="Logo" value={[url]} onChange={() => {}} max={1} />,
    );
    expect(full).toContain(`src="${url}"`);
    expect(full).toContain('aria-label="Retirer la photo 1"');
    expect(full).not.toMatch(/<input [^>]*type="file"/);

    const empty = html(
      <PhotoPicker id="logo" label="Logo" value={[]} onChange={() => {}} max={1} />,
    );
    expect(tag(empty, 'input', 'logo')).toContain('type="file"');
    expect(tag(empty, 'input', 'logo')).toContain('accept="image/jpeg,image/png,image/webp"');
  });
});

describe('shop pages', () => {
  it('plus page shows the current plan', () => {
    mockNextNavigation({ pathname: '/app/plus' });
    const free = text(
      <ShopTestProvider>
        <PlusPage />
      </ShopTestProvider>,
    );
    expect(free).toContain('Gratuit');
    expect(free).toContain('Se déconnecter');
    expect(free).toContain('awa@example.com');

    const pro = text(
      <ShopTestProvider
        shop={{
          ...TEST_SHOP,
          plan: { id: 'PRO', inGrace: false, currentPeriodEnd: '2026-11-24T12:00:00.000Z' },
        }}
      >
        <PlusPage />
      </ShopTestProvider>,
    );
    expect(pro).toContain("Pro jusqu'au 24 novembre");
  });

  it('home greets the shop and invites a first campaign', () => {
    mockNextNavigation({ pathname: '/app' });
    const page = (
      <ShopTestProvider>
        <HomePage />
      </ShopTestProvider>
    );
    const t = text(page);
    expect(t).toContain('Bonjour, Diallo Import');
    expect(t).toContain('Lance ta première campagne');
    const out = html(page);
    expect(out).toContain('href="/app/produits/nouveau"');
    expect(out).toContain('href="/app/campagnes/nouvelle"');
  });
});
