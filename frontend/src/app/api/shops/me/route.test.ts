// GET /api/shops/me (lot 4, usage and first name since lot 5b).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach } from 'vitest';
import { apiRequest, signIn, TEST_USER } from '@/test-utils/shop-fixtures';

mockNextCookies();

import { GET } from './route';

const org = {
  id: 'org_1',
  slug: 'diallo-import',
  name: 'Diallo Import',
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

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  prismaMock.user.findUnique.mockResolvedValue({
    ...TEST_USER,
    tokenVersion: 0,
    name: 'Fatou Ndiaye',
  } as never);
  prismaMock.organizationMember.findFirst.mockResolvedValue({
    organizationId: 'org_1',
    role: 'OWNER',
  } as never);
  prismaMock.organization.findUnique.mockResolvedValue(org as never);
  prismaMock.subscription.findUnique.mockResolvedValue(null);
  prismaMock.response.count.mockResolvedValue(42);
});

describe('GET /api/shops/me', () => {
  it('sends the pass meter and the first name', async () => {
    const res = await GET(apiRequest('/api/shops/me'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      shop: { id: string };
      role: string;
      usage: {
        used: number;
        included: number;
        endsAt: string | null;
        inGrace: boolean;
        pending: number;
      };
      me: { firstName: string | null; name: string | null };
    };
    expect(body.shop.id).toBe('org_1');
    expect(body.role).toBe('OWNER');
    // Without a pass nothing counts; the 42 completed answers wait.
    expect(body.usage).toEqual({ used: 0, included: 0, endsAt: null, inGrace: false, pending: 42 });
    expect(body.me).toEqual({ firstName: 'Fatou', name: 'Fatou Ndiaye' });
  });

  it('counts the answers of the pass in force', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      plan: 'WEEK',
      periodStart: new Date(Date.now() - 86_400_000),
      currentPeriodEnd: new Date('2099-01-08T00:00:00Z'),
      graceUntil: new Date('2099-01-11T00:00:00Z'),
      responsesIncluded: 150,
    } as never);
    prismaMock.response.count.mockResolvedValueOnce(12).mockResolvedValueOnce(0);
    const body = (await (await GET(apiRequest('/api/shops/me'))).json()) as { usage: unknown };
    expect(body.usage).toEqual({
      used: 12,
      included: 150,
      endsAt: '2099-01-08T00:00:00.000Z',
      inGrace: false,
      pending: 0,
    });
  });

  it('has no first name when the account has no name', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...TEST_USER, tokenVersion: 0 } as never);
    const body = (await (await GET(apiRequest('/api/shops/me'))).json()) as {
      me: { firstName: string | null; name: string | null };
    };
    expect(body.me).toEqual({ firstName: null, name: null });
  });

  it('404 SHOP_NOT_FOUND without a shop', async () => {
    prismaMock.organizationMember.findFirst.mockResolvedValue(null);
    const res = await GET(apiRequest('/api/shops/me'));
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: string }).error).toBe('SHOP_NOT_FOUND');
  });
});
