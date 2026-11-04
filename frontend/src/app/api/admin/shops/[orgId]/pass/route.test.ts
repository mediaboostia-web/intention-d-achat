import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/server/middleware', () => ({ requireAdmin: vi.fn(), requireSuperadmin: vi.fn() }));
vi.mock('@/lib/server/middleware/rate-limit-by-userid', () => ({
  enforceAdminRateLimit: vi.fn(),
}));
vi.mock('@/lib/server/auth', async () => ({
  ...(await vi.importActual<typeof import('@/lib/server/auth')>('@/lib/server/auth')),
  verifyCsrf: vi.fn(),
}));
vi.mock('@/lib/server/admin/audit', () => ({ logAdminAction: vi.fn() }));
vi.mock('@/lib/server/tamani/admin/grant', async () => ({
  ...(await vi.importActual<typeof import('@/lib/server/tamani/admin/grant')>(
    '@/lib/server/tamani/admin/grant',
  )),
  grantPass: vi.fn(),
  endPass: vi.fn(),
  notifyGrant: vi.fn(),
}));

import { requireSuperadmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { endPass, grantPass, notifyGrant } from '@/lib/server/tamani/admin/grant';
import { runTransactionsInline } from '@/test-utils/shop-fixtures';
import { SUPERADMIN_CTX, SUPERADMIN_REQUIRED, adminRequest } from '@/test-utils/admin-contexts';
import { DELETE, POST } from './route';

const params = { params: Promise.resolve({ orgId: 'org_1' }) };
const post = (body: unknown) =>
  POST(adminRequest('/api/admin/shops/org_1/pass', 'POST', body), params);
const del = () => DELETE(adminRequest('/api/admin/shops/org_1/pass', 'DELETE'), params);
const ENDS = new Date('2026-12-04T10:00:00Z');

beforeEach(() => {
  vi.mocked(verifyCsrf).mockReturnValue(null);
  vi.mocked(requireSuperadmin).mockReset().mockResolvedValue(SUPERADMIN_CTX);
  vi.mocked(enforceAdminRateLimit).mockResolvedValue(null);
  vi.mocked(logAdminAction).mockReset().mockResolvedValue(undefined);
  vi.mocked(grantPass).mockReset().mockResolvedValue({ orderId: 'ord_1', endsAt: ENDS });
  vi.mocked(endPass).mockReset().mockResolvedValue({ from: 'WEEK' });
  vi.mocked(notifyGrant).mockReset().mockResolvedValue(undefined);
  runTransactionsInline();
});

describe('POST /api/admin/shops/[orgId]/pass', () => {
  it('grants a standard pass as sold, journals it and tells the shop', async () => {
    const res = await post({ plan: 'MONTH', amount: 9900 });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ orderId: 'ord_1', endsAt: ENDS.toISOString() });
    expect(grantPass).toHaveBeenCalledWith(
      prismaMock,
      {
        organizationId: 'org_1',
        terms: { plan: 'MONTH', days: 30, responses: 1000 },
        amount: 9900,
      },
      expect.any(Date),
    );
    expect(logAdminAction).toHaveBeenCalledWith(prismaMock, {
      actorId: 'superadmin_1',
      action: 'shop.pass_grant',
      targetType: 'Organization',
      targetId: 'org_1',
      metadata: { plan: 'MONTH', days: 30, responses: 1000, amount: 9900, orderId: 'ord_1' },
    });
    expect(notifyGrant).toHaveBeenCalled();
  });

  it('grants an Unlimited pass with the typed days and answers', async () => {
    const res = await post({ plan: 'UNLIMITED', amount: 55_000, days: 30, responses: 50_000 });
    expect(res.status).toBe(201);
    expect(vi.mocked(grantPass).mock.calls[0]![1].terms).toEqual({
      plan: 'UNLIMITED',
      days: 30,
      responses: 50_000,
    });
  });

  it.each([
    { plan: 'UNLIMITED', amount: 55_000, days: 30 },
    { plan: 'TRIAL', amount: 0 },
    { plan: 'MONTH', amount: -1 },
    { plan: 'MONTH' },
    { plan: 'UNLIMITED', amount: 1, days: 400, responses: 10 },
  ])('refuses %o', async (body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(grantPass).not.toHaveBeenCalled();
    expect(logAdminAction).not.toHaveBeenCalled();
  });

  it('is for a super-admin only', async () => {
    vi.mocked(requireSuperadmin).mockResolvedValue(SUPERADMIN_REQUIRED());
    expect((await post({ plan: 'MONTH', amount: 0 })).status).toBe(403);
    expect(grantPass).not.toHaveBeenCalled();
  });

  it('checks the CSRF token first', async () => {
    vi.mocked(verifyCsrf).mockReturnValue(NextResponse.json({}, { status: 403 }));
    expect((await post({ plan: 'MONTH', amount: 0 })).status).toBe(403);
    expect(requireSuperadmin).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown shop, journals nothing', async () => {
    vi.mocked(grantPass).mockResolvedValue(null);
    const res = await post({ plan: 'MONTH', amount: 0 });
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: 'SHOP_NOT_FOUND' });
    expect(logAdminAction).not.toHaveBeenCalled();
    expect(notifyGrant).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/admin/shops/[orgId]/pass', () => {
  it('ends the pass and journals the plan it had', async () => {
    const res = await del();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ended: true });
    expect(logAdminAction).toHaveBeenCalledWith(prismaMock, {
      actorId: 'superadmin_1',
      action: 'shop.pass_end',
      targetType: 'Organization',
      targetId: 'org_1',
      metadata: { from: 'WEEK' },
    });
  });

  it('answers 404 for an unknown shop', async () => {
    vi.mocked(endPass).mockResolvedValue(null);
    expect((await del()).status).toBe(404);
    expect(logAdminAction).not.toHaveBeenCalled();
  });

  it('is for a super-admin only', async () => {
    vi.mocked(requireSuperadmin).mockResolvedValue(SUPERADMIN_REQUIRED());
    expect((await del()).status).toBe(403);
    expect(endPass).not.toHaveBeenCalled();
  });
});
