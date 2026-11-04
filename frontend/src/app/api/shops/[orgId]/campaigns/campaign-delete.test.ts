// DELETE /api/shops/[orgId]/campaigns/[campaignId] (2026-11-04): ADMIN, like
// deleting a product; JSON like every shop deletion.
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies } from '@/test-utils/mock-cookies';
import { describe, expect, it } from 'vitest';
import {
  apiRequest,
  asMember,
  asNonMember,
  routeParams,
  runTransactionsInline,
  signIn,
} from '@/test-utils/shop-fixtures';

mockNextCookies();

import { DELETE } from './[campaignId]/route';

const url = '/api/shops/org_1/campaigns/c1';
const call = () =>
  DELETE(apiRequest(url, { method: 'DELETE' }), routeParams({ orgId: 'org_1', campaignId: 'c1' }));

describe('DELETE /api/shops/[orgId]/campaigns/[campaignId]', () => {
  it('an owner deletes a campaign nobody answered', async () => {
    await signIn();
    asMember('org_1', 'OWNER');
    runTransactionsInline();
    prismaMock.campaign.findFirst.mockResolvedValue({ id: 'c1', status: 'DRAFT' } as never);
    prismaMock.response.count.mockResolvedValue(0);
    prismaMock.saleOrder.count.mockResolvedValue(0);
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });
  });

  it('a plain member may not delete (403)', async () => {
    await signIn();
    asMember('org_1', 'MEMBER');
    expect((await call()).status).toBe(403);
    expect(prismaMock.campaign.deleteMany).not.toHaveBeenCalled();
  });

  it('a stranger gets 404, and an unknown campaign CAMPAIGN_NOT_FOUND', async () => {
    await signIn();
    asNonMember();
    expect((await call()).status).toBe(404);
    asMember('org_1', 'ADMIN');
    runTransactionsInline();
    prismaMock.campaign.findFirst.mockResolvedValue(null);
    const res = await call();
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: 'CAMPAIGN_NOT_FOUND' });
  });
});
