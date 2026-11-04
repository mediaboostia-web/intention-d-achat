// Deleting a campaign (porteur, 2026-11-04): one nobody answered is deleted;
// one with answers or orders is archived, so the client book keeps them.
import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import { runTransactionsInline } from '@/test-utils/shop-fixtures';
import { removeCampaign } from './campaign-remove';

const now = new Date('2026-11-04T10:00:00Z');
const found = (status: string) =>
  prismaMock.campaign.findFirst.mockResolvedValue({ id: 'c1', status } as never);

beforeEach(() => runTransactionsInline());

describe('removeCampaign', () => {
  it('deletes a campaign nobody finished answering and without orders', async () => {
    found('DRAFT');
    prismaMock.response.count.mockResolvedValue(0);
    prismaMock.saleOrder.count.mockResolvedValue(0);
    expect(await removeCampaign(prismaMock, 'org_1', 'c1', now)).toEqual({ deleted: true });
    expect(prismaMock.campaign.findFirst).toHaveBeenCalledWith({
      where: { id: 'c1', organizationId: 'org_1', archivedAt: null },
      select: { id: true, status: true },
    });
    expect(prismaMock.response.count).toHaveBeenCalledWith({
      where: { campaignId: 'c1', completedAt: { not: null } },
    });
    expect(prismaMock.campaign.deleteMany).toHaveBeenCalledWith({
      where: { id: 'c1', organizationId: 'org_1' },
    });
    expect(prismaMock.campaign.updateMany).not.toHaveBeenCalled();
  });

  it('archives a running campaign with answers: closed and out of the lists, answers kept', async () => {
    found('ACTIVE');
    prismaMock.response.count.mockResolvedValue(3);
    prismaMock.saleOrder.count.mockResolvedValue(0);
    expect(await removeCampaign(prismaMock, 'org_1', 'c1', now)).toEqual({ archived: true });
    expect(prismaMock.campaign.updateMany).toHaveBeenCalledWith({
      where: { id: 'c1', organizationId: 'org_1' },
      data: { archivedAt: now, status: 'CLOSED', closedAt: now },
    });
    expect(prismaMock.campaign.deleteMany).not.toHaveBeenCalled();
  });

  it('archives a campaign with orders, even without a finished answer', async () => {
    found('DRAFT');
    prismaMock.response.count.mockResolvedValue(0);
    prismaMock.saleOrder.count.mockResolvedValue(1);
    expect(await removeCampaign(prismaMock, 'org_1', 'c1', now)).toEqual({ archived: true });
    expect(prismaMock.campaign.deleteMany).not.toHaveBeenCalled();
  });

  it('a closed or arrived campaign keeps its status when archived', async () => {
    for (const status of ['CLOSED', 'ARRIVED']) {
      found(status);
      prismaMock.response.count.mockResolvedValue(2);
      prismaMock.saleOrder.count.mockResolvedValue(0);
      await removeCampaign(prismaMock, 'org_1', 'c1', now);
      expect(prismaMock.campaign.updateMany).toHaveBeenLastCalledWith({
        where: { id: 'c1', organizationId: 'org_1' },
        data: { archivedAt: now },
      });
    }
  });

  it("another shop's campaign, or one already archived, is not found", async () => {
    prismaMock.campaign.findFirst.mockResolvedValue(null);
    expect(await removeCampaign(prismaMock, 'org_1', 'c1', now)).toBeNull();
    expect(prismaMock.campaign.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.campaign.updateMany).not.toHaveBeenCalled();
  });
});
