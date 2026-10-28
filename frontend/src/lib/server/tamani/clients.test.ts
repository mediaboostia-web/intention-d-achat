import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect, beforeEach } from 'vitest';
import { encodeCursor } from '@/lib/server/notifications/cursor';
import { getClient, listClients, parseClientFilters, visibleClientWhere } from './clients';

const COUNTED = { completedAt: { not: null }, locked: false, suspicious: false };
const visible = { organizationId: 'org_1', anonymizedAt: null, responses: { some: COUNTED } };
const ALL = { q: null, kind: 'ALL' } as const;
const NONE = {
  answer: null,
  campaignId: null,
  zone: null,
  period: null,
  country: null,
} as const;
const NOW = new Date('2026-10-28T12:00:00Z');
const PRO = { canSeeContacts: true, limit: 20 };
const FREE = { canSeeContacts: false, limit: 20 };

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

describe('getClient', () => {
  const detail = {
    id: 'r1',
    firstName: 'Awa',
    phoneE164: '+221771112233',
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
        campaign: { title: 'Huile 5 L', product: { name: 'Huile', unitLabel: 'bidon' } },
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
        campaign: { title: 'Riz parfumé', product: { name: 'Riz parfumé', unitLabel: 'sac' } },
      },
    ],
  };

  it('getClient lists every visible interest, newest first', async () => {
    prismaMock.respondent.findFirst.mockResolvedValue(detail as never);
    const client = await getClient(prismaMock, 'org_1', 'r1', { canSeeContacts: true });
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
    });
  });

  it('a hidden client is null', async () => {
    prismaMock.respondent.findFirst.mockResolvedValue(null);
    expect(await getClient(prismaMock, 'org_1', 'r_locked', { canSeeContacts: true })).toBeNull();
  });

  it('FREE detail carries no full number', async () => {
    prismaMock.respondent.findFirst.mockResolvedValue(detail as never);
    const client = await getClient(prismaMock, 'org_1', 'r1', { canSeeContacts: false });
    expect(client).toMatchObject({ phone: '77 •• •• 33', phoneE164: null });
    expect(JSON.stringify(client)).not.toContain('771112233');
  });
});
