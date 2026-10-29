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
  it('sends the usage and the first name', async () => {
    const res = await GET(apiRequest('/api/shops/me'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      shop: { id: string };
      role: string;
      usage: { responsesThisMonth: number; monthlyLimit: number };
      me: { firstName: string | null; name: string | null };
    };
    expect(body.shop.id).toBe('org_1');
    expect(body.role).toBe('OWNER');
    expect(body.usage).toEqual({ responsesThisMonth: 42, monthlyLimit: 0 });
    expect(body.me).toEqual({ firstName: 'Fatou', name: 'Fatou Ndiaye' });
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
