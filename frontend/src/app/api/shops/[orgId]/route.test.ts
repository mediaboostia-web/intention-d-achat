// GET|PATCH /api/shops/[orgId] (Tamani lot 3).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  apiRequest,
  asMember,
  asNonMember,
  routeParams,
  runTransactionsInline,
  signIn,
} from '@/test-utils/shop-fixtures';

mockNextCookies();

import { GET, PATCH } from './route';

const org = {
  id: 'org_1',
  slug: 'chez-awa',
  name: 'Chez Awa',
  ownerId: 'user_1',
  whatsappPhone: '+221771234567',
  country: 'SN',
  currency: 'XOF',
  logoUrl: null,
  coefConsumer: 0.5,
  coefReseller: 0.7,
  createdAt: new Date('2026-10-24T10:00:00Z'),
  updatedAt: new Date('2026-10-24T10:00:00Z'),
  subscription: null,
};
const params = routeParams({ orgId: 'org_1' });
const patch = (body: unknown, csrf = true) =>
  PATCH(apiRequest('/api/shops/org_1', { method: 'PATCH', body, csrf }), params);
const errorOf = async (res: Response) => ((await res.json()) as { error: string }).error;

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  asMember('org_1');
  runTransactionsInline();
  prismaMock.organization.findUnique.mockResolvedValue(org as never);
  prismaMock.organization.update.mockImplementation((async (args: { data: object }) => ({
    ...org,
    ...args.data,
  })) as never);
});

describe('PATCH /api/shops/[orgId] description', () => {
  it('PATCH saves the description', async () => {
    const res = await patch({ description: '  Riz, huile et sucre en gros à la Médina.  ' });
    expect(res.status).toBe(200);
    expect(prismaMock.organization.update.mock.calls[0]![0].data).toMatchObject({
      description: 'Riz, huile et sucre en gros à la Médina.',
    });
    const body = (await res.json()) as { shop: { description: string | null } };
    expect(body.shop.description).toBe('Riz, huile et sucre en gros à la Médina.');
  });

  it('an empty description becomes null', async () => {
    await patch({ description: '   ' });
    expect(prismaMock.organization.update.mock.calls[0]![0].data).toMatchObject({
      description: null,
    });
  });

  it('301 characters is a 400', async () => {
    const res = await patch({ description: 'a'.repeat(301) });
    expect(res.status).toBe(400);
    expect(prismaMock.organization.update).not.toHaveBeenCalled();
  });
});

describe('GET /api/shops/[orgId]', () => {
  it('returns the shop to a member', async () => {
    const res = await GET(apiRequest('/api/shops/org_1'), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      shop: { id: 'org_1', coefConsumer: 0.5, plan: { id: 'FREE', inGrace: false } },
    });
  });

  it('returns 404 to a non-member', async () => {
    asNonMember();
    const res = await GET(apiRequest('/api/shops/org_1'), params);
    expect(res.status).toBe(404);
    expect(prismaMock.organization.findUnique).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/shops/[orgId]', () => {
  it('updates coefficients within [0, 1]', async () => {
    const res = await patch({ coefConsumer: 0, coefReseller: 1 });
    expect(res.status).toBe(200);
    expect(prismaMock.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'org_1' },
        data: { coefConsumer: 0, coefReseller: 1 },
      }),
    );
  });

  it.each([{ coefConsumer: 1.2 }, { coefReseller: -0.1 }])(
    'rejects coefficients outside [0, 1]: %o',
    async (body) => {
      const res = await patch(body);
      expect(res.status).toBe(400);
      expect(await errorOf(res)).toBe('VALIDATION_FAILED');
      expect(prismaMock.organization.update).not.toHaveBeenCalled();
    },
  );

  it('requires ADMIN', async () => {
    asMember('org_1', 'MEMBER');
    const res = await patch({ name: 'Awa Market' });
    expect(res.status).toBe(403);
    expect(await errorOf(res)).toBe('ORG_ROLE_INSUFFICIENT');
  });

  it('normalizes a new WhatsApp number with the shop country', async () => {
    runTransactionsInline();
    prismaMock.product.findFirst.mockResolvedValue(null);
    const res = await patch({ whatsappPhone: '76 12 34 56', country: 'ML' });
    expect(res.status).toBe(200);
    expect(prismaMock.organization.update.mock.calls[0]![0].data).toEqual({
      whatsappPhone: '+22376123456',
      country: 'ML',
      currency: 'XOF',
    });
  });

  it('returns 400 INVALID_PHONE for a malformed number', async () => {
    const res = await patch({ whatsappPhone: '12' });
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toBe('INVALID_PHONE');
  });

  it('rejects an empty body', async () => {
    const res = await patch({});
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toBe('VALIDATION_FAILED');
  });

  it('returns 403 without a CSRF token', async () => {
    const res = await patch({ name: 'Awa Market' }, false);
    expect(res.status).toBe(403);
    expect(prismaMock.organization.update).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/shops/[orgId] country (lot 7b)', () => {
  beforeEach(() => {
    runTransactionsInline();
  });

  it('a shop without products changes country and currency together, under the country lock', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);
    const res = await patch({ country: 'CM' });
    expect(res.status).toBe(200);
    expect(prismaMock.organization.update.mock.calls[0]![0].data).toMatchObject({
      country: 'CM',
      currency: 'XAF',
    });
    expect(prismaMock.product.findFirst.mock.calls[0]![0]).toMatchObject({
      where: { organizationId: 'org_1' },
    });
    expect(JSON.stringify(prismaMock.$executeRaw.mock.calls)).toContain('shop-country:org_1');
  });

  it('after the first product the country stays: 409 SHOP_COUNTRY_LOCKED', async () => {
    prismaMock.product.findFirst.mockResolvedValue({ id: 'p1' } as never);
    const res = await patch({ country: 'GN' });
    expect(res.status).toBe(409);
    expect(await errorOf(res)).toBe('SHOP_COUNTRY_LOCKED');
    expect(prismaMock.organization.update).not.toHaveBeenCalled();
  });

  it('the same country sent again is no change, even with products', async () => {
    prismaMock.product.findFirst.mockResolvedValue({ id: 'p1' } as never);
    const res = await patch({ name: 'Chez Awa', country: 'SN' });
    expect(res.status).toBe(200);
  });

  it('refuses a country Tamani does not cover', async () => {
    const res = await patch({ country: 'FR' });
    expect(res.status).toBe(400);
  });

  it('GET says whether the country is locked', async () => {
    prismaMock.product.findFirst.mockResolvedValue({ id: 'p1' } as never);
    const body = (await (await GET(apiRequest('/api/shops/org_1'), params)).json()) as {
      shop: { countryLocked: boolean };
    };
    expect(body.shop.countryLocked).toBe(true);
  });
});

describe('PATCH /api/shops/[orgId] country under the lock (lot 7b review)', () => {
  beforeEach(() => {
    runTransactionsInline();
  });

  it('a locked country answers 409 before the phone is read against the new country', async () => {
    prismaMock.product.findFirst.mockResolvedValue({ id: 'p1' } as never);
    const res = await patch({ country: 'GN', whatsappPhone: '77 123 45 67' });
    expect(res.status).toBe(409);
    expect(await errorOf(res)).toBe('SHOP_COUNTRY_LOCKED');
  });

  it('reads the current country under the lock and writes the currency with any country', async () => {
    prismaMock.product.findFirst.mockResolvedValue({ id: 'p1' } as never);
    const res = await patch({ country: 'SN', name: 'Chez Awa' });
    expect(res.status).toBe(200);
    expect(prismaMock.organization.update.mock.calls[0]![0].data).toMatchObject({
      country: 'SN',
      currency: 'XOF',
    });
    const lock = prismaMock.$executeRaw.mock.invocationCallOrder[0]!;
    expect(lock).toBeLessThan(prismaMock.organization.findUnique.mock.invocationCallOrder[0]!);
  });
});
