// GET /api/shops/[orgId]/clients and GET|PATCH|DELETE /clients/[respondentId]
// (lot 5b, advanced from lot 7; the note and the anonymization in lot 7).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach, type Mock } from 'vitest';
import {
  apiRequest,
  asMember,
  asNonMember,
  routeParams,
  runTransactionsInline,
  signIn,
} from '@/test-utils/shop-fixtures';

mockNextCookies();

import { GET } from './route';
import { DELETE, GET as GET_ONE, PATCH } from './[respondentId]/route';

const shop = routeParams({ orgId: 'org_1' });
const one = routeParams({ orgId: 'org_1', respondentId: 'r1' });
const errorOf = async (res: Response) => ((await res.json()) as { error: string }).error;
const pro = {
  plan: 'PRO',
  currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
  graceUntil: null,
};

const row = {
  id: 'r1',
  firstName: 'Awa',
  phoneE164: '+221771112233',
  notes: 'Paie en fin de mois',
  firstSeenAt: new Date('2026-10-01T10:00:00Z'),
  lastSeenAt: new Date('2026-10-25T10:00:00Z'),
  responses: [],
};

const order = {
  id: 'o1',
  status: 'FULFILLED',
  paid: true,
  paidAt: new Date('2026-10-27T12:00:00Z'),
  createdAt: new Date('2026-10-27T10:00:00Z'),
  quantity: 2,
  unitPrice: 22_500,
  totalAmount: 45_000,
  fulfillment: 'PICKUP',
  zoneId: null,
  productId: 'prod_riz',
  campaignId: null,
  responseId: null,
  buyerType: 'CONSUMER',
  notes: null,
  zone: null,
  product: { name: 'Riz parfumé', unitLabel: 'sac' },
  campaign: null,
  respondent: { id: 'r1', firstName: 'Awa', phoneE164: '+221771112233', anonymizedAt: null },
};

const aggregate = () => prismaMock.saleOrder.aggregate as unknown as Mock;

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  asMember('org_1', 'MEMBER');
  runTransactionsInline();
  prismaMock.subscription.findUnique.mockResolvedValue(null);
  prismaMock.respondent.findMany.mockResolvedValue([row] as never);
  prismaMock.respondent.count.mockResolvedValue(1);
  prismaMock.saleOrder.findMany.mockResolvedValue([order] as never);
  aggregate().mockResolvedValue({ _sum: { totalAmount: 45_000 } });
});

describe('GET /api/shops/[orgId]/clients filters', () => {
  it('answers 400 to a filter it does not know', async () => {
    const res = await GET(apiRequest('/api/shops/org_1/clients?periode=2026-13'), shop);
    expect(res.status).toBe(400);
    const ok = await GET(apiRequest('/api/shops/org_1/clients?pays=BJ&reponse=oui'), shop);
    expect(ok.status).toBe(200);
  });

  it('reads commande=oui|non and refuses any other value', async () => {
    const ok = await GET(apiRequest('/api/shops/org_1/clients?commande=non'), shop);
    expect(ok.status).toBe(200);
    const where = prismaMock.respondent.findMany.mock.calls[0]![0]!.where as { AND: unknown[] };
    expect(where.AND).toContainEqual({ orders: { none: { status: { not: 'CANCELLED' } } } });
    const bad = await GET(apiRequest('/api/shops/org_1/clients?commande=peut-etre'), shop);
    expect(bad.status).toBe(400);
    expect(await errorOf(bad)).toBe('VALIDATION_FAILED');
  });
});

describe('GET /api/shops/[orgId]/clients', () => {
  it('members list clients', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(pro as never);
    const res = await GET(apiRequest('/api/shops/org_1/clients?type=revendeurs'), shop);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ id: string; phoneE164: string | null }>;
      counts: { all: number };
      nextCursor: string | null;
    };
    expect(body.items.map((c) => [c.id, c.phoneE164])).toEqual([['r1', '+221771112233']]);
    expect(body.counts.all).toBe(1);
    expect(body.nextCursor).toBeNull();
  });

  it('FREE gets masked numbers', async () => {
    const res = await GET(apiRequest('/api/shops/org_1/clients'), shop);
    const text = await res.text();
    expect(text).not.toContain('771112233');
    expect(text).toContain('77 •• •• 33');
  });

  it('an unknown type is a 400', async () => {
    const res = await GET(apiRequest('/api/shops/org_1/clients?type=amis'), shop);
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toBe('VALIDATION_FAILED');
  });

  it('a non-member gets 404', async () => {
    asNonMember();
    const res = await GET(apiRequest('/api/shops/org_1/clients'), shop);
    expect(res.status).toBe(404);
    expect(prismaMock.respondent.findMany).not.toHaveBeenCalled();
  });
});

describe('GET /api/shops/[orgId]/clients/[respondentId]', () => {
  it('members read a client', async () => {
    prismaMock.respondent.findFirst.mockResolvedValue(row as never);
    const res = await GET_ONE(apiRequest('/api/shops/org_1/clients/r1'), one);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { client: { id: string; phone: string } };
    expect(body.client).toMatchObject({ id: 'r1', phone: '77 •• •• 33' });
    expect(prismaMock.respondent.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'r1', organizationId: 'org_1' }),
      }),
    );
  });

  it('FREE: the card has its orders and total, masked numbers and no reliability', async () => {
    prismaMock.respondent.findFirst.mockResolvedValue(row as never);
    const res = await GET_ONE(apiRequest('/api/shops/org_1/clients/r1'), one);
    const text = await res.text();
    expect(text).not.toContain('771112233');
    const { client } = JSON.parse(text) as {
      client: {
        notes: string | null;
        totalSpent: number;
        reliability: unknown;
        orders: Array<{ id: string; client: { phone: string; phoneE164: string | null } }>;
      };
    };
    expect(client).toMatchObject({ notes: 'Paie en fin de mois', totalSpent: 45_000 });
    expect(client.reliability).toBeNull();
    expect(client.orders.map((o) => [o.id, o.client.phone, o.client.phoneE164])).toEqual([
      ['o1', '77 •• •• 33', null],
    ]);
    expect(prismaMock.saleOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org_1', respondentId: 'r1' } }),
    );
  });

  it('PRO: the card carries the reliability and the full numbers', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(pro as never);
    prismaMock.respondent.findFirst.mockResolvedValue(row as never);
    const res = await GET_ONE(apiRequest('/api/shops/org_1/clients/r1'), one);
    const { client } = (await res.json()) as {
      client: { reliability: unknown; orders: Array<{ client: { phoneE164: string | null } }> };
    };
    expect(client.reliability).toEqual({ yesCount: 0, fulfilledCount: 0, rate: null });
    expect(client.orders[0]?.client.phoneE164).toBe('+221771112233');
  });

  it('a client of another shop is 404 CLIENT_NOT_FOUND', async () => {
    prismaMock.respondent.findFirst.mockResolvedValue(null);
    const res = await GET_ONE(apiRequest('/api/shops/org_1/clients/r_other'), one);
    expect(res.status).toBe(404);
    expect(await errorOf(res)).toBe('CLIENT_NOT_FOUND');
  });

  it('a non-member gets 404', async () => {
    asNonMember();
    const res = await GET_ONE(apiRequest('/api/shops/org_1/clients/r1'), one);
    expect(res.status).toBe(404);
    expect(prismaMock.respondent.findFirst).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/shops/[orgId]/clients/[respondentId]', () => {
  const patch = (body: unknown, csrf = true) =>
    PATCH(apiRequest('/api/shops/org_1/clients/r1', { method: 'PATCH', body, csrf }), one);

  beforeEach(() => {
    prismaMock.respondent.updateMany.mockResolvedValue({ count: 1 });
  });

  it('a member writes the note, trimmed', async () => {
    const res = await patch({ notes: '  Paie en fin de mois  ' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ client: { notes: 'Paie en fin de mois' } });
    expect(prismaMock.respondent.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: 'r1', organizationId: 'org_1', anonymizedAt: null }),
      data: { notes: 'Paie en fin de mois' },
    });
  });

  it('a blank or null note clears it', async () => {
    for (const notes of ['   ', '', null]) {
      prismaMock.respondent.updateMany.mockClear();
      const res = await patch({ notes });
      expect(await res.json()).toEqual({ client: { notes: null } });
      expect(prismaMock.respondent.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { notes: null } }),
      );
    }
  });

  it('1 000 characters pass, 1 001 are a 400', async () => {
    expect((await patch({ notes: 'a'.repeat(1000) })).status).toBe(200);
    // Counted after the trim.
    expect((await patch({ notes: ` ${'a'.repeat(1000)} ` })).status).toBe(200);
    const res = await patch({ notes: 'a'.repeat(1001) });
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toBe('VALIDATION_FAILED');
  });

  it('a body without a note is a 400', async () => {
    for (const body of [{}, { notes: 12 }, 'not json']) {
      const res = await patch(body);
      expect(res.status).toBe(400);
    }
  });

  it('a client of another shop, hidden or anonymized is 404 CLIENT_NOT_FOUND', async () => {
    prismaMock.respondent.updateMany.mockResolvedValue({ count: 0 });
    const res = await patch({ notes: 'Vu au marché' });
    expect(res.status).toBe(404);
    expect(await errorOf(res)).toBe('CLIENT_NOT_FOUND');
  });

  it('without the CSRF token it is a 403, and nothing is written', async () => {
    const res = await patch({ notes: 'Vu au marché' }, false);
    expect(res.status).toBe(403);
    expect(prismaMock.respondent.updateMany).not.toHaveBeenCalled();
  });

  it('a non-member gets 404', async () => {
    asNonMember();
    const res = await patch({ notes: 'Vu au marché' });
    expect(res.status).toBe(404);
    expect(prismaMock.respondent.updateMany).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/shops/[orgId]/clients/[respondentId]', () => {
  const remove = (csrf = true) =>
    DELETE(apiRequest('/api/shops/org_1/clients/r1', { method: 'DELETE', csrf }), one);

  beforeEach(() => {
    prismaMock.respondent.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.saleOrder.updateMany.mockResolvedValue({ count: 1 });
  });

  it('an ADMIN anonymizes the client in one transaction: 200 with JSON, as api() reads', async () => {
    asMember('org_1', 'ADMIN');
    const res = await remove();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ anonymized: true });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.respondent.updateMany).toHaveBeenCalledWith({
      where: { id: 'r1', organizationId: 'org_1', anonymizedAt: null },
      data: {
        firstName: null,
        phoneE164: null,
        notes: null,
        anonymizedAt: expect.any(Date),
      },
    });
    expect(prismaMock.saleOrder.updateMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', respondentId: 'r1' },
      data: { notes: null },
    });
    expect(prismaMock.response.updateMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', respondentId: 'r1', deliveryPlace: { not: null } },
      data: { deliveryPlace: 'Autre endroit' },
    });
    expect(prismaMock.saleOrder.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.response.deleteMany).not.toHaveBeenCalled();
  });

  it('the OWNER may too', async () => {
    asMember('org_1', 'OWNER');
    expect((await remove()).status).toBe(200);
  });

  it('a MEMBER gets 403 and nothing is anonymized', async () => {
    const res = await remove();
    expect(res.status).toBe(403);
    expect(await errorOf(res)).toBe('ORG_ROLE_INSUFFICIENT');
    expect(prismaMock.respondent.updateMany).not.toHaveBeenCalled();
  });

  it('a client of another shop or already anonymized is 404 CLIENT_NOT_FOUND', async () => {
    asMember('org_1', 'ADMIN');
    prismaMock.respondent.updateMany.mockResolvedValue({ count: 0 });
    const res = await remove();
    expect(res.status).toBe(404);
    expect(await errorOf(res)).toBe('CLIENT_NOT_FOUND');
    expect(prismaMock.saleOrder.updateMany).not.toHaveBeenCalled();
  });

  it('without the CSRF token it is a 403', async () => {
    asMember('org_1', 'ADMIN');
    const res = await remove(false);
    expect(res.status).toBe(403);
    expect(prismaMock.respondent.updateMany).not.toHaveBeenCalled();
  });

  it('a non-member gets 404', async () => {
    asNonMember();
    expect((await remove()).status).toBe(404);
    expect(prismaMock.respondent.updateMany).not.toHaveBeenCalled();
  });
});
