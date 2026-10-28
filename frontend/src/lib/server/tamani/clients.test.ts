import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, beforeEach, type Mock } from 'vitest';
import { encodeCursor } from '@/lib/server/notifications/cursor';
import {
  anonymizeClient,
  getClient,
  listClients,
  parseClientFilters,
  updateClientNotes,
  visibleClientWhere,
} from './clients';
import { ORDER_SELECT, toOrderRow } from './serializers';

const COUNTED = { completedAt: { not: null }, locked: false, suspicious: false };
// A client shows once an answer counts, or once they have an order (a manual one adds them).
const visible = {
  organizationId: 'org_1',
  anonymizedAt: null,
  OR: [{ responses: { some: COUNTED } }, { orders: { some: {} } }],
};
const ALL = { q: null, kind: 'ALL' } as const;
const NONE = {
  answer: null,
  campaignId: null,
  zone: null,
  period: null,
  country: null,
  ordered: null,
} as const;
const NOW = new Date('2026-10-28T12:00:00Z');
const PRO = { canSeeContacts: true, limit: 20 };
const FREE = { canSeeContacts: false, limit: 20 };
const NOT_CANCELLED = { status: { not: 'CANCELLED' } };

const row = (id: string, over: object = {}) => ({
  id,
  firstName: 'Awa',
  phoneE164: '+221771112233',
  lastSeenAt: new Date('2026-10-25T10:00:00Z'),
  responses: [
    {
      campaignId: 'c1',
      interested: true,
      quantity: 3,
      buyerType: 'RESELLER',
      completedAt: new Date('2026-10-25T10:00:00Z'),
      campaign: { product: { name: 'Riz parfumé', unitLabel: 'sac' } },
    },
  ],
  ...over,
});

const whereOf = () =>
  prismaMock.respondent.findMany.mock.calls[0]![0]!.where as {
    AND: unknown[];
  } & Record<string, unknown>;

beforeEach(() => {
  prismaMock.respondent.findMany.mockResolvedValue([]);
  prismaMock.respondent.count.mockResolvedValue(0);
});

describe('parseClientFilters', () => {
  it('reads the type and the search', () => {
    expect(parseClientFilters(new URLSearchParams('type=revendeurs&q=%20Awa%20'))).toEqual({
      ...NONE,
      q: 'Awa',
      kind: 'RESELLER',
    });
    expect(parseClientFilters(new URLSearchParams('type=usagers'))).toEqual({
      ...NONE,
      q: null,
      kind: 'CONSUMER',
    });
    expect(parseClientFilters(new URLSearchParams(''))).toEqual({ ...NONE, ...ALL });
    expect(
      parseClientFilters(new URLSearchParams('reponse=oui&periode=2026-10&quartier=autre&pays=BJ')),
    ).toMatchObject({ answer: 'yes', period: '2026-10', zone: 'OTHER', country: 'BJ' });
  });

  it('refuses an unknown type or a long search', () => {
    expect(parseClientFilters(new URLSearchParams('type=toString'))).toBeNull();
    expect(parseClientFilters(new URLSearchParams('periode=2026-13'))).toBeNull();
    expect(parseClientFilters(new URLSearchParams(`q=${'a'.repeat(61)}`))).toBeNull();
  });
});

describe('listClients', () => {
  it('lists visible clients, most recent first', async () => {
    prismaMock.respondent.findMany.mockResolvedValue([row('r1')] as never);
    const page = await listClients(prismaMock, 'org_1', ALL, null, PRO);
    expect(whereOf()).toMatchObject(visible);
    expect(prismaMock.respondent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }], take: 21 }),
    );
    expect(page.items[0]).toEqual({
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
    });
  });

  it('hides a client whose only responses are locked or suspicious', async () => {
    await listClients(prismaMock, 'org_1', ALL, null, PRO);
    expect(visibleClientWhere('org_1')).toEqual(visible);
    expect(whereOf()).toMatchObject(visible);
    for (const [args] of prismaMock.respondent.count.mock.calls) {
      expect((args as { where: object }).where).toMatchObject(visible);
    }
    // The latest answer shown is a counted one too.
    expect(prismaMock.respondent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          responses: expect.objectContaining({ where: COUNTED, take: 1 }),
        }),
      }),
    );
  });

  it('FREE rows carry no full number', async () => {
    prismaMock.respondent.findMany.mockResolvedValue([row('r1')] as never);
    const page = await listClients(prismaMock, 'org_1', ALL, null, FREE);
    expect(page.items[0]).toMatchObject({ phone: '77 •• •• 33', phoneE164: null });
    expect(JSON.stringify(page)).not.toContain('771112233');
    expect(JSON.stringify(page)).not.toContain('111 22');
  });

  it('PRO rows carry the number', async () => {
    prismaMock.respondent.findMany.mockResolvedValue([row('r1')] as never);
    const page = await listClients(prismaMock, 'org_1', ALL, null, PRO);
    expect(page.items[0]?.phoneE164).toBe('+221771112233');
  });

  it('searches first names case-insensitively', async () => {
    await listClients(prismaMock, 'org_1', { q: 'awa', kind: 'ALL' }, null, PRO);
    expect(whereOf().AND).toContainEqual({ firstName: { contains: 'awa', mode: 'insensitive' } });
  });

  it('matches digits typed with spaces', async () => {
    await listClients(prismaMock, 'org_1', { q: '77 111', kind: 'ALL' }, null, PRO);
    expect(whereOf().AND).toContainEqual({ phoneE164: { contains: '77111' } });
  });

  it('FREE search ignores digits', async () => {
    await listClients(prismaMock, 'org_1', { q: '77 111', kind: 'ALL' }, null, FREE);
    const and = whereOf().AND;
    expect(and).toContainEqual({ firstName: { contains: '77 111', mode: 'insensitive' } });
    expect(JSON.stringify(and)).not.toContain('phoneE164');
  });

  it('type revendeurs keeps clients with a reseller answer', async () => {
    await listClients(prismaMock, 'org_1', { q: null, kind: 'RESELLER' }, null, PRO);
    expect(whereOf().AND).toContainEqual({
      responses: { some: { ...COUNTED, buyerType: 'RESELLER' } },
    });
  });

  it('listClients applies response filters to one answer', async () => {
    await listClients(
      prismaMock,
      'org_1',
      { ...ALL, answer: 'yes', period: '2026-10', campaignId: 'c1' },
      null,
      { ...PRO, now: NOW },
    );
    const and = whereOf().AND;
    const some = and.filter((w) => JSON.stringify(w).includes('"some"'));
    expect(some).toEqual([
      {
        responses: {
          some: {
            ...COUNTED,
            interested: true,
            campaignId: 'c1',
            completedAt: {
              not: null,
              gte: new Date('2026-10-01T00:00:00Z'),
              lt: new Date('2026-11-01T00:00:00Z'),
            },
          },
        },
      },
    ]);
    expect(whereOf().organizationId).toBe('org_1');
  });

  it('filters by a zone, by « Autre endroit » and by the country of the number', async () => {
    await listClients(prismaMock, 'org_1', { ...ALL, zone: 'OTHER', country: 'BJ' }, null, FREE);
    const and = whereOf().AND;
    expect(and).toContainEqual({
      responses: { some: { ...COUNTED, zoneId: null, deliveryPlace: { not: null } } },
    });
    expect(and).toContainEqual({ phoneE164: { startsWith: '+229' } });
    prismaMock.respondent.findMany.mockClear();
    await listClients(prismaMock, 'org_1', { ...ALL, zone: 'z1' }, null, PRO);
    expect(whereOf().AND).toContainEqual({ responses: { some: { ...COUNTED, zoneId: 'z1' } } });
  });

  it('commande=non combines with the one-answer filters as a client filter', async () => {
    const filters = parseClientFilters(
      new URLSearchParams('type=revendeurs&quartier=z1&campagne=c1&periode=2026-10&commande=non'),
    )!;
    expect(filters.ordered).toBe(false);
    await listClients(prismaMock, 'org_1', filters, null, { ...PRO, now: NOW });
    expect(whereOf()).toMatchObject(visible);
    expect(whereOf().AND).toEqual([
      {
        responses: {
          some: {
            ...COUNTED,
            buyerType: 'RESELLER',
            campaignId: 'c1',
            zoneId: 'z1',
            completedAt: {
              not: null,
              gte: new Date('2026-10-01T00:00:00Z'),
              lt: new Date('2026-11-01T00:00:00Z'),
            },
          },
        },
      },
      { orders: { none: NOT_CANCELLED } },
    ]);
  });

  it('commande=oui keeps clients with an order that is not cancelled', async () => {
    await listClients(prismaMock, 'org_1', { ...ALL, ordered: true }, null, PRO);
    expect(whereOf().AND).toEqual([{ orders: { some: NOT_CANCELLED } }]);
  });

  it('a client added by a manual order shows without an answer', async () => {
    expect(visibleClientWhere('org_1')).toEqual(visible);
    prismaMock.respondent.findMany.mockResolvedValue([row('r_manual', { responses: [] })] as never);
    const page = await listClients(prismaMock, 'org_1', ALL, null, PRO);
    expect(page.items[0]).toMatchObject({ id: 'r_manual', kind: null, last: null });
  });

  it('counts every client, resellers and consumers on the first page', async () => {
    prismaMock.respondent.count
      .mockResolvedValueOnce(48)
      .mockResolvedValueOnce(21)
      .mockResolvedValueOnce(27);
    const page = await listClients(prismaMock, 'org_1', { q: 'awa', kind: 'RESELLER' }, null, PRO);
    expect(page.counts).toEqual({ all: 48, RESELLER: 21, CONSUMER: 27 });
    // The counts describe the whole book: no search, no type.
    expect(prismaMock.respondent.count).toHaveBeenNthCalledWith(1, { where: visible });
  });

  it('pages on lastSeenAt then id', async () => {
    const at = new Date('2026-10-20T10:00:00Z');
    const cursor = encodeCursor({ createdAt: at, id: 'r9' });
    const page = await listClients(prismaMock, 'org_1', ALL, { createdAt: at, id: 'r9' }, PRO);
    expect(whereOf().AND).toContainEqual({
      OR: [{ lastSeenAt: { lt: at } }, { lastSeenAt: at, id: { lt: 'r9' } }],
    });
    expect(page.counts).toBeNull();
    expect(prismaMock.respondent.count).not.toHaveBeenCalled();
    expect(cursor).toBeTypeOf('string');
  });

  it('gives a next cursor from the last row seen', async () => {
    prismaMock.respondent.findMany.mockResolvedValue(
      Array.from({ length: 3 }, (_, i) =>
        row(`r${i}`, { lastSeenAt: new Date(Date.UTC(2026, 9, 25, 10 - i)) }),
      ) as never,
    );
    const page = await listClients(prismaMock, 'org_1', ALL, null, { ...PRO, limit: 2 });
    expect(page.items.map((c) => c.id)).toEqual(['r0', 'r1']);
    expect(page.nextCursor).toBe(
      encodeCursor({ createdAt: new Date(Date.UTC(2026, 9, 25, 9)), id: 'r1' }),
    );
  });
});

const at = (iso: string) => new Date(iso);

function order(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    status: 'FULFILLED',
    paid: true,
    paidAt: at('2026-10-27T12:00:00Z'),
    createdAt: at('2026-10-27T10:00:00Z'),
    quantity: 3,
    unitPrice: 7500,
    totalAmount: 22_500,
    fulfillment: 'DELIVERY',
    zoneId: 'zone_m',
    productId: 'prod_riz',
    campaignId: 'c1',
    responseId: 'resp_1',
    buyerType: 'RESELLER',
    notes: null,
    zone: { name: 'Médina' },
    product: { name: 'Riz parfumé', unitLabel: 'sac' },
    campaign: { title: 'Riz parfumé' },
    respondent: { id: 'r1', firstName: 'Awa', phoneE164: '+221771112233', anonymizedAt: null },
    ...over,
  };
}

const aggregate = () => prismaMock.saleOrder.aggregate as unknown as Mock;

describe('getClient', () => {
  const running = { status: 'ACTIVE', endsAt: at('2026-11-30T00:00:00Z') };
  const closed = { status: 'CLOSED', endsAt: null };
  const arrived = { status: 'ARRIVED', endsAt: null };
  const detail = {
    id: 'r1',
    firstName: 'Awa',
    phoneE164: '+221771112233',
    notes: 'Paie en fin de mois',
    firstSeenAt: new Date('2026-10-01T10:00:00Z'),
    lastSeenAt: new Date('2026-10-25T10:00:00Z'),
    responses: [
      {
        id: 'resp_2',
        campaignId: 'c2',
        interested: false,
        quantity: null,
        buyerType: null,
        option: null,
        timing: null,
        wantsDelivery: null,
        completedAt: new Date('2026-10-25T10:00:00Z'),
        zone: null,
        order: null,
        campaign: {
          title: 'Huile 5 L',
          ...closed,
          product: { name: 'Huile', unitLabel: 'bidon' },
        },
      },
      {
        id: 'resp_1',
        campaignId: 'c1',
        interested: true,
        quantity: 3,
        buyerType: 'RESELLER',
        option: 'Rouge',
        timing: 'THIS_WEEK',
        wantsDelivery: true,
        completedAt: new Date('2026-10-02T10:00:00Z'),
        zone: { name: 'Médina' },
        order: { status: 'CONFIRMED' },
        campaign: {
          title: 'Riz parfumé',
          ...arrived,
          product: { name: 'Riz parfumé', unitLabel: 'sac' },
        },
      },
    ],
  };
  const yesAnswer = (id: string, campaign: object, orderStatus: string | null) => ({
    ...detail.responses[1]!,
    id,
    campaignId: `c_${id}`,
    completedAt: at('2026-09-02T10:00:00Z'),
    order: orderStatus ? { status: orderStatus } : null,
    campaign: { ...detail.responses[1]!.campaign, ...campaign },
  });
  const PRO_CARD = { canSeeContacts: true, reliability: true, now: NOW };
  const FREE_CARD = { canSeeContacts: false, reliability: false, now: NOW };

  beforeEach(() => {
    prismaMock.saleOrder.findMany.mockResolvedValue([]);
    aggregate().mockResolvedValue({ _sum: { totalAmount: null } });
  });

  it('getClient lists every visible interest, newest first', async () => {
    prismaMock.respondent.findFirst.mockResolvedValue(detail as never);
    const client = await getClient(prismaMock, 'org_1', 'r1', PRO_CARD);
    expect(prismaMock.respondent.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'r1', ...visible } }),
    );
    expect(client?.interests.map((i) => i.responseId)).toEqual(['resp_2', 'resp_1']);
    expect(client?.interests[1]).toEqual({
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
    });
    expect(client).toMatchObject({
      firstSeenAt: '2026-10-01T10:00:00.000Z',
      kind: null,
      last: { campaignId: 'c2', interested: false },
      notes: 'Paie en fin de mois',
    });
  });

  it('a hidden client is null', async () => {
    prismaMock.respondent.findFirst.mockResolvedValue(null);
    expect(await getClient(prismaMock, 'org_1', 'r_locked', PRO_CARD)).toBeNull();
    expect(prismaMock.saleOrder.findMany).not.toHaveBeenCalled();
  });

  it('the card carries the orders, newest first, and the total of the fulfilled ones', async () => {
    prismaMock.respondent.findFirst.mockResolvedValue(detail as never);
    prismaMock.saleOrder.findMany.mockResolvedValue([
      order('o2', { status: 'CONFIRMED', createdAt: at('2026-10-27T11:00:00Z') }),
      order('o1'),
    ] as never);
    aggregate().mockResolvedValue({ _sum: { totalAmount: 22_500 } });
    const client = await getClient(prismaMock, 'org_1', 'r1', PRO_CARD);
    expect(prismaMock.saleOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org_1', respondentId: 'r1' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: ORDER_SELECT,
      }),
    );
    expect(aggregate()).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', respondentId: 'r1', status: 'FULFILLED' },
      _sum: { totalAmount: true },
    });
    expect(client?.orders.map((o) => [o.id, o.status, o.totalAmount])).toEqual([
      ['o2', 'CONFIRMED', 22_500],
      ['o1', 'FULFILLED', 22_500],
    ]);
    expect(client?.orders[0]?.client).toEqual({
      id: 'r1',
      firstName: 'Awa',
      phone: '+221 77 111 22 33',
      phoneE164: '+221771112233',
    });
    expect(client?.totalSpent).toBe(22_500);
  });

  it('without any fulfilled order the total is 0', async () => {
    prismaMock.respondent.findFirst.mockResolvedValue(detail as never);
    const client = await getClient(prismaMock, 'org_1', 'r1', PRO_CARD);
    expect(client).toMatchObject({ orders: [], totalSpent: 0 });
  });

  it('PRO reliability weighs yes answers of finished campaigns and their fulfilled orders', async () => {
    prismaMock.respondent.findFirst.mockResolvedValue({
      ...detail,
      responses: [
        ...detail.responses,
        yesAnswer('resp_3', closed, 'FULFILLED'),
        // Still running: it may yet turn into an order.
        yesAnswer('resp_4', running, 'FULFILLED'),
      ],
    } as never);
    const client = await getClient(prismaMock, 'org_1', 'r1', PRO_CARD);
    expect(client?.reliability).toEqual({ yesCount: 2, fulfilledCount: 1, rate: 0.5 });
    // The weighing stays here: an interest carries only what the card shows.
    expect(Object.keys(client!.interests[0]!)).not.toContain('order');
    expect(JSON.stringify(client?.interests)).not.toContain('ARRIVED');
  });

  it('PRO reliability has no rate under 2 finished yes answers', async () => {
    prismaMock.respondent.findFirst.mockResolvedValue(detail as never);
    const client = await getClient(prismaMock, 'org_1', 'r1', PRO_CARD);
    expect(client?.reliability).toEqual({ yesCount: 1, fulfilledCount: 0, rate: null });
  });

  it('FREE detail carries no full number and no reliability', async () => {
    prismaMock.respondent.findFirst.mockResolvedValue(detail as never);
    prismaMock.saleOrder.findMany.mockResolvedValue([order('o1')] as never);
    const client = await getClient(prismaMock, 'org_1', 'r1', FREE_CARD);
    expect(client).toMatchObject({ phone: '77 •• •• 33', phoneE164: null, reliability: null });
    expect(client?.orders[0]?.client).toMatchObject({ phone: '77 •• •• 33', phoneE164: null });
    expect(JSON.stringify(client)).not.toContain('771112233');
    expect(JSON.stringify(client)).not.toContain('111 22');
  });
});

describe('updateClientNotes', () => {
  it('writes the note of a visible client of the shop', async () => {
    prismaMock.respondent.updateMany.mockResolvedValue({ count: 1 });
    expect(await updateClientNotes(prismaMock, 'org_1', 'r1', 'Paie en fin de mois')).toEqual({
      notes: 'Paie en fin de mois',
    });
    expect(prismaMock.respondent.updateMany).toHaveBeenCalledWith({
      where: { id: 'r1', ...visible },
      data: { notes: 'Paie en fin de mois' },
    });
  });

  it('a client of another shop, hidden or anonymized is null', async () => {
    prismaMock.respondent.updateMany.mockResolvedValue({ count: 0 });
    expect(await updateClientNotes(prismaMock, 'org_1', 'r_other', null)).toBeNull();
  });
});

describe('anonymizeClient', () => {
  it('anonymize keeps orders and answers counted', async () => {
    prismaMock.respondent.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.saleOrder.updateMany.mockResolvedValue({ count: 2 });
    expect(await anonymizeClient(prismaMock, 'org_1', 'r1', NOW)).toBe(true);
    // The identity goes: first name, number and note, dated.
    expect(prismaMock.respondent.updateMany).toHaveBeenCalledWith({
      where: { id: 'r1', organizationId: 'org_1', anonymizedAt: null },
      data: { firstName: null, phoneE164: null, notes: null, anonymizedAt: NOW },
    });
    // The orders stay, without their notes (« Lieu : X » or a note may name the person).
    expect(prismaMock.saleOrder.updateMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', respondentId: 'r1' },
      data: { notes: null },
    });
    // A typed place may name the person: it becomes the words the stats already count.
    expect(prismaMock.response.updateMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', respondentId: 'r1', deliveryPlace: { not: null } },
      data: { deliveryPlace: 'Autre endroit' },
    });
    // Nothing else moves: the answers and the orders keep counting.
    for (const m of [
      prismaMock.response.update,
      prismaMock.response.delete,
      prismaMock.response.deleteMany,
      prismaMock.saleOrder.update,
      prismaMock.saleOrder.delete,
      prismaMock.saleOrder.deleteMany,
      prismaMock.respondent.delete,
      prismaMock.respondent.deleteMany,
    ]) {
      expect(m).not.toHaveBeenCalled();
    }
    // The client leaves the book, the lists and the exports (all built on visibleClientWhere)...
    expect(visibleClientWhere('org_1')).toMatchObject({
      organizationId: 'org_1',
      anonymizedAt: null,
    });
    // ...and their orders read without a name or a number, totals intact.
    const row = toOrderRow(
      order('o1', {
        respondent: { id: 'r1', firstName: null, phoneE164: null, anonymizedAt: NOW },
      }) as never,
      true,
    );
    expect(row).toMatchObject({
      totalAmount: 22_500,
      quantity: 3,
      status: 'FULFILLED',
      client: { id: 'r1', firstName: null, phone: null, phoneE164: null },
    });
  });

  it('a client of another shop or already anonymized is false, and no order changes', async () => {
    prismaMock.respondent.updateMany.mockResolvedValue({ count: 0 });
    expect(await anonymizeClient(prismaMock, 'org_1', 'r_other', NOW)).toBe(false);
    expect(prismaMock.saleOrder.updateMany).not.toHaveBeenCalled();
  });
});
