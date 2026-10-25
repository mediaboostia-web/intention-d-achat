// GET /api/shops/[orgId]/clients and /clients/[respondentId] (lot 5b, advanced from lot 7).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach } from 'vitest';
import { apiRequest, asMember, asNonMember, routeParams, signIn } from '@/test-utils/shop-fixtures';

mockNextCookies();

import { GET } from './route';
import { GET as GET_ONE } from './[respondentId]/route';

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
  firstSeenAt: new Date('2026-10-01T10:00:00Z'),
  lastSeenAt: new Date('2026-10-25T10:00:00Z'),
  responses: [],
};

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  asMember('org_1', 'MEMBER');
  prismaMock.subscription.findUnique.mockResolvedValue(null);
  prismaMock.respondent.findMany.mockResolvedValue([row] as never);
  prismaMock.respondent.count.mockResolvedValue(1);
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
