// POST /api/shops and GET /api/shops/me (Tamani lot 3).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach } from 'vitest';
import { apiRequest, runTransactionsInline, signIn } from '@/test-utils/shop-fixtures';

mockNextCookies();

import { POST } from './route';
import { GET as GET_ME } from './me/route';

function shopRow(overrides: Record<string, unknown> = {}) {
  return {
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
    subscription: { plan: 'FREE', currentPeriodEnd: null, graceUntil: null },
    ...overrides,
  };
}

const body = { name: 'Chez Awa', whatsappPhone: '77 123 45 67' };
const post = (b: unknown = body, csrf = true) =>
  POST(apiRequest('/api/shops', { method: 'POST', body: b, csrf }));
const collision = (field: string) =>
  Object.assign(new Error('Unique constraint'), { code: 'P2002', meta: { target: [field] } });

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  runTransactionsInline();
  prismaMock.$executeRaw.mockResolvedValue(1);
  prismaMock.organizationMember.findFirst.mockResolvedValue(null);
  prismaMock.organization.create.mockResolvedValue(shopRow() as never);
});

describe('POST /api/shops', () => {
  it('creates the shop, its OWNER member and a FREE subscription in one transaction', async () => {
    const res = await post();
    expect(res.status).toBe(201);
    expect(res.headers.get('x-request-id')).toBeTruthy();
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: 'chez-awa',
          name: 'Chez Awa',
          ownerId: 'user_1',
          whatsappPhone: '+221771234567',
          country: 'SN',
          currency: 'XOF',
          members: { create: { userId: 'user_1', role: 'OWNER' } },
          subscription: { create: { plan: 'FREE' } },
        }),
      }),
    );
    const json = (await res.json()) as { shop: { id: string; plan: { id: string } } };
    expect(json.shop.id).toBe('org_1');
    expect(json.shop.plan.id).toBe('FREE');
  });

  it('returns 409 SHOP_ALREADY_EXISTS when the user already has a shop', async () => {
    prismaMock.organizationMember.findFirst.mockResolvedValue({
      organizationId: 'org_0',
      role: 'OWNER',
    } as never);
    const res = await post();
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toBe('SHOP_ALREADY_EXISTS');
    expect(prismaMock.organization.create).not.toHaveBeenCalled();
  });

  it('re-checks membership inside the locked transaction', async () => {
    await post();
    const lock = prismaMock.$executeRaw.mock.invocationCallOrder[0]!;
    const check = prismaMock.organizationMember.findFirst.mock.invocationCallOrder[0]!;
    const create = prismaMock.organization.create.mock.invocationCallOrder[0]!;
    expect(lock).toBeLessThan(check);
    expect(check).toBeLessThan(create);
  });

  it('retries the slug when another shop has the same name', async () => {
    prismaMock.organization.create
      .mockRejectedValueOnce(collision('slug'))
      .mockResolvedValueOnce(shopRow({ slug: 'chez-awa-2' }) as never);
    const res = await post();
    expect(res.status).toBe(201);
    expect(prismaMock.organization.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.organization.create.mock.calls[1]![0].data.slug).toBe('chez-awa-2');
  });

  it('returns 400 INVALID_PHONE for a malformed WhatsApp number', async () => {
    const res = await post({ ...body, whatsappPhone: '12' });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('INVALID_PHONE');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('returns 400 VALIDATION_FAILED without a name', async () => {
    const res = await post({ whatsappPhone: '77 123 45 67', name: '   ' });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('VALIDATION_FAILED');
  });

  it('returns 403 without a CSRF token', async () => {
    const res = await post(body, false);
    expect(res.status).toBe(403);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('returns 401 when signed out', async () => {
    __cookieStore.clear();
    const res = await post();
    expect(res.status).toBe(401);
  });
});

describe('GET /api/shops/me', () => {
  it('returns the shop and the role', async () => {
    prismaMock.organizationMember.findFirst.mockResolvedValue({
      organizationId: 'org_1',
      role: 'OWNER',
    } as never);
    prismaMock.organization.findUnique.mockResolvedValue(shopRow() as never);
    const res = await GET_ME(apiRequest('/api/shops/me'));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { shop: { slug: string }; role: string };
    expect(json).toMatchObject({ shop: { slug: 'chez-awa' }, role: 'OWNER' });
  });

  it('returns 404 SHOP_NOT_FOUND without a shop', async () => {
    const res = await GET_ME(apiRequest('/api/shops/me'));
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: string }).error).toBe('SHOP_NOT_FOUND');
  });
});

describe('POST /api/shops currency (lot 7b)', () => {
  it('a shop in Guinea is in Guinean francs', async () => {
    const res = await post({ ...body, country: 'GN', whatsappPhone: '620 12 34 56' });
    expect(res.status).toBe(201);
    expect(prismaMock.organization.create.mock.calls[0]![0].data).toMatchObject({
      country: 'GN',
      currency: 'GNF',
    });
  });

  it('refuses a country Tamani does not cover', async () => {
    const res = await post({ ...body, country: 'FR' });
    expect(res.status).toBe(400);
  });
});
