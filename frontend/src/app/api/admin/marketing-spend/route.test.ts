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

import { requireSuperadmin } from '@/lib/server/middleware';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { runTransactionsInline } from '@/test-utils/shop-fixtures';
import { SUPERADMIN_CTX, SUPERADMIN_REQUIRED, adminRequest } from '@/test-utils/admin-contexts';
import { PUT } from './route';

const put = (body: unknown) => PUT(adminRequest('/api/admin/marketing-spend', 'PUT', body));

beforeEach(() => {
  vi.mocked(verifyCsrf).mockReturnValue(null);
  vi.mocked(requireSuperadmin).mockReset().mockResolvedValue(SUPERADMIN_CTX);
  vi.mocked(enforceAdminRateLimit).mockResolvedValue(null);
  vi.mocked(logAdminAction).mockReset().mockResolvedValue(undefined);
  runTransactionsInline();
  prismaMock.marketingSpend.findUnique.mockResolvedValue({ amount: 20_000 } as never);
  prismaMock.marketingSpend.upsert.mockResolvedValue({ month: '2026-11', amount: 50_000 } as never);
});

describe('PUT /api/admin/marketing-spend', () => {
  it('saves the month’s spend and writes who changed it from what to what', async () => {
    const res = await put({ month: '2026-11', amount: 50_000 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ spend: { month: '2026-11', amount: 50_000 } });
    expect(prismaMock.marketingSpend.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { month: '2026-11' },
        create: { month: '2026-11', amount: 50_000, updatedById: 'superadmin_1' },
        update: { amount: 50_000, updatedById: 'superadmin_1' },
      }),
    );
    expect(logAdminAction).toHaveBeenCalledWith(prismaMock, {
      actorId: 'superadmin_1',
      action: 'marketing.spend_set',
      targetType: 'MarketingSpend',
      targetId: '2026-11',
      metadata: { from: 20_000, to: 50_000 },
    });
  });

  it('is for a super-admin only', async () => {
    vi.mocked(requireSuperadmin).mockResolvedValue(SUPERADMIN_REQUIRED());
    const res = await put({ month: '2026-11', amount: 50_000 });
    expect(res.status).toBe(403);
    expect(prismaMock.marketingSpend.upsert).not.toHaveBeenCalled();
  });

  it('checks the CSRF token first', async () => {
    vi.mocked(verifyCsrf).mockReturnValue(NextResponse.json({}, { status: 403 }));
    const res = await put({ month: '2026-11', amount: 50_000 });
    expect(res.status).toBe(403);
    expect(requireSuperadmin).not.toHaveBeenCalled();
    expect(prismaMock.marketingSpend.upsert).not.toHaveBeenCalled();
  });

  it.each([
    { month: '2026-13', amount: 1 },
    { month: 'novembre', amount: 1 },
    { month: '2026-11', amount: -5 },
    { month: '2026-11', amount: 12.5 },
    { month: '2026-11', amount: 2_000_000_000 },
  ])('refuses %o', async (body) => {
    const res = await put(body);
    expect(res.status).toBe(400);
    expect(logAdminAction).not.toHaveBeenCalled();
  });
});
