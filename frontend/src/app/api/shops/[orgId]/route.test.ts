// GET|PATCH /api/shops/[orgId] (Tamani lot 3).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach } from 'vitest';
import { apiRequest, asMember, asNonMember, routeParams, signIn } from '@/test-utils/shop-fixtures';

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
  prismaMock.organization.findUnique.mockResolvedValue(org as never);
  prismaMock.organization.update.mockImplementation((async (args: { data: object }) => ({
    ...org,
    ...args.data,
  })) as never);
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
    const res = await patch({ whatsappPhone: '76 12 34 56', country: 'ML' });
    expect(res.status).toBe(200);
    expect(prismaMock.organization.update.mock.calls[0]![0].data).toEqual({
      whatsappPhone: '+22376123456',
      country: 'ML',
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
