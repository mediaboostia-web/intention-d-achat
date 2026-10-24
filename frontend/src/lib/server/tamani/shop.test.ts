import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect } from 'vitest';
import { getShopForUser } from './shop';

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
