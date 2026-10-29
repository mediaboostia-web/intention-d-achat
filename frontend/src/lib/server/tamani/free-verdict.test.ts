import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect } from 'vitest';
import { PLANS } from '@/lib/tamani/plans';
import { claimFreeVerdict, verdictAccess } from './free-verdict';

const older = { id: 'c_old', createdAt: new Date('2026-10-01T00:00:00Z') };
const newer = { id: 'c_new', createdAt: new Date('2026-10-20T00:00:00Z') };

describe('claimFreeVerdict', () => {
  it('reserves the oldest eligible campaign once', async () => {
    prismaMock.organization.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.organization.findFirst.mockResolvedValue({
      freeVerdictCampaignId: 'c_old',
    } as never);
    await expect(claimFreeVerdict(prismaMock, 'org_1', null, [newer, older])).resolves.toBe(
      'c_old',
    );
    expect(prismaMock.organization.updateMany).toHaveBeenCalledWith({
      where: { id: 'org_1', freeVerdictCampaignId: null },
      data: { freeVerdictCampaignId: 'c_old' },
    });
  });

  it('keeps the first claim', async () => {
    // Another request reserved a campaign between our read and our write.
    prismaMock.organization.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.organization.findFirst.mockResolvedValue({
      freeVerdictCampaignId: 'c_other',
    } as never);
    await expect(claimFreeVerdict(prismaMock, 'org_1', null, [older])).resolves.toBe('c_other');
  });

  it('writes nothing when a campaign is already reserved or none is eligible', async () => {
    await expect(claimFreeVerdict(prismaMock, 'org_1', 'c_old', [newer])).resolves.toBe('c_old');
    await expect(claimFreeVerdict(prismaMock, 'org_1', null, [])).resolves.toBeNull();
    expect(prismaMock.organization.updateMany).not.toHaveBeenCalled();
  });
});

describe('verdictAccess', () => {
  it('opens the verdict to a plan with the estimate', () => {
    expect(verdictAccess(PLANS.MONTH, null, 'c1')).toBe('PLAN');
  });

  it('offers the free plan its reserved campaign only', () => {
    expect(verdictAccess(PLANS.FREE, 'c1', 'c1')).toBe('OFFERED');
    expect(verdictAccess(PLANS.FREE, 'c1', 'c2')).toBe('LOCKED');
    expect(verdictAccess(PLANS.FREE, null, 'c2')).toBe('LOCKED');
  });
});
