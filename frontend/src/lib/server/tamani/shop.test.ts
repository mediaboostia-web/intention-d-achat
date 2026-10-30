import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect } from 'vitest';
import { PLANS } from '@/lib/tamani/plans';
import { getShopForUser, shopPlan } from './shop';

describe('getShopForUser', () => {
  it("returns the user's first membership", async () => {
    prismaMock.organizationMember.findFirst.mockResolvedValue({
      organizationId: 'org_1',
      role: 'OWNER',
    } as never);
    expect(await getShopForUser(prismaMock, 'user_1')).toEqual({
      organizationId: 'org_1',
      role: 'OWNER',
    });
    expect(prismaMock.organizationMember.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      orderBy: { createdAt: 'asc' },
      select: { organizationId: true, role: true },
    });
  });

  it('returns null without a shop', async () => {
    prismaMock.organizationMember.findFirst.mockResolvedValue(null);
    expect(await getShopForUser(prismaMock, 'user_1')).toBeNull();
  });
});

describe('shopPlan', () => {
  const now = new Date('2026-10-25T12:00:00Z');
  it('shopPlan reads the effective plan', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    expect(await shopPlan(prismaMock, 'org_1', now)).toBe(PLANS.FREE);
    expect(prismaMock.subscription.findUnique).toHaveBeenCalledWith({
      where: { organizationId: 'org_1' },
    });
    prismaMock.subscription.findUnique.mockResolvedValue({
      plan: 'MONTH',
      currentPeriodEnd: new Date('2026-11-25T00:00:00Z'),
      graceUntil: null,
    } as never);
    expect(await shopPlan(prismaMock, 'org_1', now)).toBe(PLANS.MONTH);
  });
});
