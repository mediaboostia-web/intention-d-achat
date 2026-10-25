import { describe, it, expect, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import type { ClientDetail, ClientRow } from '@/lib/tamani/client-view';
import { mockNextNavigation } from '@/test-utils/next-navigation';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const { ClientList } = await import('./ClientList');
const { ClientDetailView } = await import('./ClientDetail');

const now = new Date('2026-10-25T12:00:00Z');
const yes: ClientRow = {
  id: 'r1',
  firstName: 'Awa',
  phone: '+221 77 111 22 33',
  phoneE164: '+221771112233',
  kind: 'RESELLER',
  last: {
    campaignId: 'c1',
    productName: 'Riz parfumé',
    unitLabel: 'sac',
    interested: true,
    quantity: 3,
    at: '2026-10-25T10:00:00.000Z',
  },
};
const no: ClientRow = {
  ...yes,
  id: 'r2',
  firstName: null,
  last: { ...yes.last!, interested: false, quantity: null },
};
const free: ClientRow = { ...yes, phone: '77 •• •• 33', phoneE164: null };

const anchors = (out: string) => out.match(/<a [^>]*>/g) ?? [];

describe('ClientList', () => {
  it('a row reads like a WhatsApp call', () => {
    mockNextNavigation({ pathname: '/app/clients' });
    const out = html(<ClientList rows={[yes, no]} shopName="Diallo Import" now={now} />);
    const t = text(<ClientList rows={[yes, no]} shopName="Diallo Import" now={now} />);
    expect(t).toContain('Awa');
    expect(t).toContain('Client sans prénom');
    expect(t).toContain('Riz parfumé, 3 sacs');
    expect(t).toContain('Riz parfumé, non');
    expect(out).toMatch(/text-success[^>]*><svg/);
    expect(out).toMatch(/text-danger[^>]*><svg/);
    expect(anchors(out).some((a) => a.includes('href="/app/clients/r1"'))).toBe(true);
  });

  it('PRO rows open WhatsApp with the prepared message', () => {
    const out = html(<ClientList rows={[yes]} shopName="Diallo Import" now={now} />);
    const wa = anchors(out).find((a) => a.includes('wa.me')) ?? '';
    expect(wa).toContain('href="https://wa.me/221771112233?text=');
    expect(decodeURIComponent(wa).replace(/&#x27;/g, "'")).toContain(
      "Bonjour Awa, c'est Diallo Import.",
    );
    expect(wa).toContain('target="_blank"');
  });

  it('FREE rows lock the WhatsApp button', () => {
    const out = html(<ClientList rows={[free]} shopName="Diallo Import" now={now} />);
    expect(out).not.toContain('wa.me');
    const lock = anchors(out).find((a) => a.includes('href="/app/plus#forfait"')) ?? '';
    expect(lock).toContain('aria-label="Passe au Pro pour contacter Awa."');
    expect(text(<ClientList rows={[free]} shopName="Diallo Import" now={now} />)).toContain(
      '77 •• •• 33',
    );
  });

  it('an empty book invites to share', () => {
    const out = html(<ClientList rows={[]} shopName="Diallo Import" now={now} />);
    expect(text(<ClientList rows={[]} shopName="Diallo Import" now={now} />)).toContain(
      'Tes clients apparaîtront ici dès leur première réponse.',
    );
    expect(anchors(out).some((a) => a.includes('href="/app/campagnes"'))).toBe(true);
  });
});

describe('ClientDetailView', () => {
  const client: ClientDetail = {
    ...yes,
    firstSeenAt: '2026-10-01T10:00:00.000Z',
    interests: [
      {
        responseId: 'resp_2',
        campaignId: 'c2',
        campaignTitle: 'Huile 5 L',
        productName: 'Huile',
        unitLabel: 'bidon',
        interested: false,
        quantity: null,
        buyerType: null,
        option: null,
        timing: null,
        wantsDelivery: null,
        zoneName: null,
        at: '2026-10-25T10:00:00.000Z',
      },
      {
        responseId: 'resp_1',
        campaignId: 'c1',
        campaignTitle: 'Riz parfumé',
        productName: 'Riz parfumé',
        unitLabel: 'sac',
        interested: true,
        quantity: 3,
        buyerType: 'RESELLER',
        option: 'Rouge',
        timing: 'THIS_WEEK',
        wantsDelivery: true,
        zoneName: 'Médina',
        at: '2026-10-02T10:00:00.000Z',
      },
    ],
  };

  it('the detail lists every interest and links each to its campaign', () => {
    const out = html(<ClientDetailView client={client} shopName="Diallo Import" now={now} />);
    const t = text(<ClientDetailView client={client} shopName="Diallo Import" now={now} />);
    const list = out.match(/<ul[^>]*aria-label="Ses réponses"[^>]*>.*?<\/ul>/s)?.[0] ?? '';
    expect((list.match(/href="([^"]*)"/g) ?? []).map((h) => h.slice(6, -1))).toEqual([
      '/app/campagnes/c2',
      '/app/campagnes/c1',
    ]);
    expect(t).toContain('3 sacs');
    expect(t).toContain('pour revendre');
    expect(t).toContain('Médina');
    expect(t).toContain('Rouge');
    expect(t).toContain('Client depuis le 1 octobre');
    expect(anchors(out).some((a) => a.includes('wa.me/221771112233'))).toBe(true);
  });

  it('FREE detail says how to contact the client', () => {
    const locked = { ...client, phone: '77 •• •• 33', phoneE164: null };
    const out = html(<ClientDetailView client={locked} shopName="Diallo Import" now={now} />);
    expect(out).not.toContain('wa.me');
    expect(text(<ClientDetailView client={locked} shopName="Diallo Import" now={now} />)).toContain(
      'Passe au Pro pour contacter Awa.',
    );
    expect(anchors(out).some((a) => a.includes('href="/app/plus#forfait"'))).toBe(true);
  });
});
