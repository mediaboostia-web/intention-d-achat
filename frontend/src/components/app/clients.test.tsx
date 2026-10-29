import { describe, it, expect, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import type { ClientDetail, ClientRow } from '@/lib/tamani/client-view';
import type { OrderRow } from '@/lib/tamani/orders-view';
import { mockNextNavigation } from '@/test-utils/next-navigation';
import type { OrgRole } from './shop-context';
import type { NoteStatus } from './ClientDetail';

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
    notes: null,
    orders: [],
    totalSpent: 0,
    reliability: null,
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

  const card = (c: ClientDetail, role: OrgRole = 'OWNER', currency = 'XOF') => (
    <ClientDetailView
      client={c}
      shopName="Diallo Import"
      currency={currency}
      now={now}
      role={role}
      onSaveNote={async () => {}}
      onDelete={async () => {}}
    />
  );
  const order = (id: string, patch: Partial<OrderRow> = {}): OrderRow => ({
    id,
    status: 'FULFILLED',
    paid: true,
    paidAt: '2026-10-20T15:00:00.000Z',
    createdAt: '2026-10-20T09:00:00.000Z',
    quantity: 2,
    unitPrice: 18750,
    totalAmount: 37500,
    fulfillment: 'PICKUP',
    zoneId: null,
    zoneName: null,
    productId: 'p1',
    productName: 'Riz parfumé',
    unitLabel: 'sac',
    campaignId: 'c1',
    campaignTitle: 'Riz parfumé',
    responseId: 'resp_1',
    buyerType: 'RESELLER',
    notes: null,
    client: { id: 'r1', firstName: 'Awa', phone: yes.phone, phoneE164: yes.phoneE164 },
    ...patch,
  });
  const pro: ClientDetail = {
    ...client,
    orders: [order('o2', { status: 'TO_CONFIRM', paid: false, paidAt: null }), order('o1')],
    totalSpent: 37500,
    reliability: { yesCount: 5, fulfilledCount: 4, rate: 0.8 },
  };

  it('PRO card: the orders with the total bought, and the reliability sentence', () => {
    const out = html(card(pro));
    const t = text(card(pro));
    const list = out.match(/<ul[^>]*aria-label="Ses commandes"[^>]*>.*?<\/ul>/s)?.[0] ?? '';
    expect((list.match(/href="([^"]*)"/g) ?? []).map((h) => h.slice(6, -1))).toEqual([
      '/app/commandes/o2',
      '/app/commandes/o1',
    ]);
    expect(t).toContain('Total acheté 37 500 FCFA');
    expect(out).toMatch(/font-sign[^>]*>37 500 FCFA</);
    const gn = text(card(pro, 'OWNER', 'GNF'));
    expect(gn).toContain('Total acheté 37 500 FG');
    expect(gn).not.toContain('FCFA');
    expect(t).toContain('Awa a dit oui 5 fois, a acheté 4 fois · 80 %');
    expect(t).not.toContain('Avec Pro');
  });

  it('PRO card under 2 finished yes answers says when the rate comes', () => {
    const t = text(card({ ...pro, reliability: { yesCount: 1, fulfilledCount: 0, rate: null } }));
    expect(t).toContain('Awa a dit oui 1 fois, a acheté 0 fois.');
    expect(t).toContain(
      "Le taux s'affiche dès 2 « oui » sur des campagnes terminées dont les commandes sont livrées ou annulées.",
    );
  });

  it('FREE card shows the reliability as a Pro card', () => {
    const free = { ...pro, reliability: null };
    const t = text(card(free));
    expect(t).toContain('Fiabilité');
    expect(t).toContain('Avec Pro, tu vois si Awa achète vraiment après avoir dit oui.');
    expect(t).not.toContain('a dit oui 5 fois');
    expect(html(card(free))).toMatch(/Fiabilité<\/h2>.*?Pro.*?href="\/app\/plus#forfait"/s);
    // Orders and the total bought are on every plan.
    expect(t).toContain('Total acheté 37 500 FCFA');
  });

  it('without an order, says how one comes and shows no total', () => {
    const t = text(card(client));
    expect(t).toContain("Aucune commande pour l'instant.");
    expect(t).toContain(
      "Quand Awa dit oui, transforme sa réponse en commande depuis l'onglet Intéressés de la campagne.",
    );
    expect(t).not.toContain('Total acheté');
    expect(html(card(client))).not.toContain('aria-label="Ses commandes"');
  });

  it('a client added by a manual order has no answers yet', () => {
    const manual: ClientDetail = { ...pro, kind: null, last: null, interests: [] };
    const out = html(card(manual));
    expect(out).not.toContain('aria-label="Ses réponses"');
    expect(text(card(manual))).toContain(
      "Ajouté au carnet par une commande, sans réponse à une campagne pour l'instant.",
    );
  });

  it('the note is editable, 1 000 characters at most, saved with « Enregistrer »', () => {
    const out = html(card({ ...pro, notes: 'Paie en fin de mois' }));
    const area = out.match(/<textarea[^>]*>[^<]*<\/textarea>/)?.[0] ?? '';
    expect(area).toContain('id="client-notes"');
    expect(area).toContain('maxLength="1000"');
    expect(area).toContain('>Paie en fin de mois</textarea>');
    expect(out).toMatch(/<button[^>]*type="submit"[^>]*>Enregistrer<\/button>/);
  });

  it('the note says when it saves, when it is saved and when it fails', async () => {
    const { ClientNoteView } = await import('./ClientDetail');
    const note = (status: NoteStatus, error: string | null = null) => (
      <ClientNoteView
        value="Paie en fin de mois"
        status={status}
        error={error}
        onChange={() => {}}
        onCommit={() => {}}
      />
    );
    expect(text(note('saving'))).toContain('Enregistrement…');
    expect(html(note('saving'))).toMatch(/<button[^>]*disabled=""[^>]*>Enregistrer/);
    expect(text(note('saved'))).toContain('Note enregistrée.');
    expect(html(note('error', 'Pas de connexion.'))).toMatch(/text-danger[^>]*>Pas de connexion\./);
    expect(text(note('idle'))).not.toMatch(/Enregistrement|enregistrée/);
  });

  it('only an ADMIN or the OWNER can delete the client data, never a MEMBER', () => {
    const label = 'Supprimer les données de ce client';
    expect(text(card(pro, 'OWNER'))).toContain(label);
    expect(text(card(pro, 'ADMIN'))).toContain(label);
    expect(text(card(pro, 'MEMBER'))).not.toContain(label);
    expect(html(card(pro, 'MEMBER'))).not.toContain('Supprimer');
  });

  it('the deletion asks a second time and says it is final', async () => {
    const { ClientDeletionView } = await import('./ClientDetail');
    const view = (asking: boolean, error: string | null = null) => (
      <ClientDeletionView
        asking={asking}
        busy={false}
        error={error}
        onAsk={() => {}}
        onKeep={() => {}}
        onConfirm={() => {}}
      />
    );
    expect(text(view(false))).toContain('Supprimer les données de ce client');
    const t = text(view(true));
    expect(t).toContain('Supprimer les données de ce client ?');
    expect(t).toContain("C'est définitif");
    expect(t).toContain('Oui, supprimer ses données');
    expect(t).toContain('Garder ce client');
    expect(html(view(true, 'Seul le gérant de la boutique peut faire ça.'))).toMatch(
      /role="alert"[^>]*>.*Seul le gérant de la boutique peut faire ça\./s,
    );
  });

  it('the detail lists every interest and links each to its campaign', () => {
    const out = html(card(client));
    const t = text(card(client));
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
    const out = html(card(locked));
    expect(out).not.toContain('wa.me');
    expect(text(card(locked))).toContain('Passe au Pro pour contacter Awa.');
    expect(anchors(out).some((a) => a.includes('href="/app/plus#forfait"'))).toBe(true);
  });
});

describe('client filters on screen', async () => {
  const { ClientFilterChips, ClientFilterForm } = await import('./ClientFilters');
  const { filterChips, parseClientSearch } = await import('@/lib/tamani/client-filters');

  it('shows a chip per active filter with its cross, then « Tout effacer »', () => {
    const state = parseClientSearch(new URLSearchParams('quartier=autre&pays=BJ&q=Awa'))!;
    const chips = filterChips(state, { campaigns: new Map(), zones: new Map() });
    const el = <ClientFilterChips chips={chips} clearHref="/app/clients?q=Awa" />;
    const out = html(el);
    expect(text(el)).toContain('Autre endroit');
    expect(text(el)).toContain('Bénin');
    expect(out).toContain('aria-label="Retirer le filtre Autre endroit"');
    expect(out).toContain('href="/app/clients?pays=BJ&amp;q=Awa"');
    expect(out).toMatch(/href="\/app\/clients\?q=Awa"[^>]*>Tout effacer/);
    expect(html(<ClientFilterChips chips={[]} clearHref="/app/clients" />)).toBe('');
  });

  it('opens the form on the address values, every filter in a select', () => {
    const state = parseClientSearch(
      new URLSearchParams('reponse=oui&quartier=autre&periode=2026-10'),
    )!;
    const out = html(
      <ClientFilterForm
        state={state}
        choices={{
          campaigns: [{ id: 'c1', title: 'Riz parfumé' }],
          zones: [{ id: 'z1', name: 'Dantokpa' }],
          countries: [{ code: 'BJ', label: 'Bénin', dialCode: '+229' }],
          months: ['2026-10', '2026-09'],
        }}
        onApply={() => {}}
        onCancel={() => {}}
      />,
    );
    for (const label of [
      'Réponse',
      'Campagne',
      'Quartier',
      'Période de la réponse',
      'Pays du numéro',
    ]) {
      expect(out).toContain(label);
    }
    expect(out).toMatch(/<option value="yes" selected="">Intéressés<\/option>/);
    expect(out).toMatch(/<option value="OTHER" selected="">Autre endroit<\/option>/);
    expect(out).toMatch(/<option value="2026-10" selected="">octobre 2026<\/option>/);
    expect(out).toContain('Riz parfumé');
    expect(out).toContain('Voir les clients');
  });

  const choices = { campaigns: [], zones: [], countries: [], months: [] };

  it('the sheet has a « Commandes » choice, both ways and back to every client', () => {
    const form = (search: string) =>
      html(
        <ClientFilterForm
          state={parseClientSearch(new URLSearchParams(search))!}
          choices={choices}
          onApply={() => {}}
          onCancel={() => {}}
        />,
      );
    const out = form('commande=non');
    const select = out.match(/<select[^>]*id="filter-ordered"[^>]*>.*?<\/select>/s)?.[0] ?? '';
    expect(out).toMatch(/<label[^>]*for="filter-ordered"[^>]*>Commandes<\/label>/);
    expect(select).toMatch(/<option value="">Tous les clients<\/option>/);
    expect(select).toMatch(/<option value="yes">A commandé<\/option>/);
    expect(select).toMatch(/<option value="no" selected="">Pas encore commandé<\/option>/);
    expect(form('commande=oui')).toMatch(/<option value="yes" selected="">A commandé<\/option>/);
    expect(form('')).toMatch(/<option value="" selected="">Tous les clients<\/option>/);
  });

  it('the has-ordered filter shows as a chip with its cross', () => {
    const chips = filterChips(parseClientSearch(new URLSearchParams('commande=oui&pays=BJ'))!, {
      campaigns: new Map(),
      zones: new Map(),
    });
    const el = <ClientFilterChips chips={chips} clearHref="/app/clients" />;
    expect(text(el)).toContain('A commandé');
    expect(html(el)).toMatch(
      /href="\/app\/clients\?pays=BJ"[^>]*aria-label="Retirer le filtre A commandé"|aria-label="Retirer le filtre A commandé"[^>]*href="\/app\/clients\?pays=BJ"/,
    );
  });
});
