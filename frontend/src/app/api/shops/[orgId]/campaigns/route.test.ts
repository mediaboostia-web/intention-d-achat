// Campaigns and share links under /api/shops/[orgId]/campaigns (Tamani lot 3).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  apiRequest,
  asMember,
  routeParams,
  runTransactionsInline,
  signIn,
} from '@/test-utils/shop-fixtures';
import { DEFAULT_SHARE_TEMPLATE } from '@/lib/tamani/share-message';
import { SHORT_CODE_REGEX } from '@/lib/server/tamani/short-code';

mockNextCookies();

import { GET, POST } from './route';
import { GET as GET_ONE, PATCH } from './[campaignId]/route';
import { GET as GET_LINKS, POST as POST_LINK } from './[campaignId]/links/route';

const DAY = 86_400_000;
const later = () => new Date(Date.now() + 10 * DAY);
const earlier = () => new Date(Date.now() - DAY);

const product = {
  id: 'prod_1',
  organizationId: 'org_1',
  name: 'Marmites inox 5 L',
  description: null,
  unitLabel: 'pièce',
  unitPrice: 7500,
  wholesalePrice: 6000,
  wholesaleMinQty: 12,
  costPrice: 5000,
  photos: [],
  optionLabel: null,
  options: [],
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function link(overrides: Record<string, unknown> = {}) {
  return {
    id: 'link_1',
    campaignId: 'camp_1',
    code: 'k3P9xQa',
    label: 'Lien principal',
    isDefault: true,
    openCount: 0,
    createdAt: new Date('2026-10-24T10:00:00Z'),
    updatedAt: new Date('2026-10-24T10:00:00Z'),
    ...overrides,
  };
}

function campaign(overrides: Record<string, unknown> = {}) {
  return {
    id: 'camp_1',
    organizationId: 'org_1',
    productId: 'prod_1',
    title: 'Marmites inox 5 L',
    availability: 'IN_STOCK',
    availableAt: null,
    stockQuantity: null,
    plannedQuantity: null,
    showStock: false,
    endsAt: null,
    deliveryEnabled: false,
    showLiveCounter: true,
    shareTemplate: DEFAULT_SHARE_TEMPLATE,
    status: 'ACTIVE',
    closedAt: null,
    arrivedAt: null,
    createdAt: new Date('2026-10-24T10:00:00Z'),
    updatedAt: new Date('2026-10-24T10:00:00Z'),
    product,
    links: [link()],
    ...overrides,
  };
}

const activePro = {
  plan: 'PRO',
  currentPeriodEnd: new Date(Date.now() + 30 * DAY),
  graceUntil: new Date(Date.now() + 35 * DAY),
};
const shop = routeParams({ orgId: 'org_1' });
const one = routeParams({ orgId: 'org_1', campaignId: 'camp_1' });
const errorOf = async (res: Response) => ((await res.json()) as { error: string }).error;
const collision = (field: string) =>
  Object.assign(new Error('Unique'), { code: 'P2002', meta: { target: [field] } });

const create = (body: Record<string, unknown>) =>
  POST(apiRequest('/api/shops/org_1/campaigns', { method: 'POST', body }), shop);
const valid = { productId: 'prod_1', availability: 'IN_STOCK' };
const patch = (body: Record<string, unknown>) =>
  PATCH(apiRequest('/api/shops/org_1/campaigns/camp_1', { method: 'PATCH', body }), one);

beforeEach(async () => {
  __cookieStore.clear();
  await signIn();
  asMember('org_1');
  runTransactionsInline();
  prismaMock.$executeRaw.mockResolvedValue(1);
  prismaMock.subscription.findUnique.mockResolvedValue(null);
  prismaMock.product.findFirst.mockResolvedValue(product as never);
  prismaMock.campaign.count.mockResolvedValue(0);
  prismaMock.campaign.create.mockImplementation((async (args: {
    data: { links: { create: { code: string } } } & Record<string, unknown>;
  }) => {
    const { links, ...data } = args.data;
    return campaign({ ...data, links: [link({ code: links.create.code })] });
  }) as never);
  prismaMock.campaign.update.mockImplementation((async (args: { data: object }) =>
    campaign(args.data as Record<string, unknown>)) as never);
});

describe('POST /api/shops/[orgId]/campaigns', () => {
  it('creates an ACTIVE campaign with a default link and the default share template', async () => {
    const res = await create(valid);
    expect(res.status).toBe(201);
    const data = prismaMock.campaign.create.mock.calls[0]![0].data as Record<string, unknown> & {
      links: { create: { code: string; label: string; isDefault: boolean } };
    };
    expect(data).toMatchObject({
      organizationId: 'org_1',
      productId: 'prod_1',
      title: 'Marmites inox 5 L',
      status: 'ACTIVE',
      shareTemplate: DEFAULT_SHARE_TEMPLATE,
      showLiveCounter: true,
      deliveryEnabled: false,
    });
    expect(data.links.create.code).toMatch(SHORT_CODE_REGEX);
    expect(data.links.create).toMatchObject({ label: 'Lien principal', isDefault: true });
    const json = (await res.json()) as {
      campaign: { defaultLink: { url: string }; shareMessage: string };
    };
    expect(json.campaign.defaultLink.url.endsWith(`/c/${data.links.create.code}`)).toBe(true);
    expect(json.campaign.shareMessage).toContain('*Marmites inox 5 L*');
  });

  it('retries the link code on a collision', async () => {
    prismaMock.$transaction.mockRejectedValueOnce(collision('code'));
    const res = await create(valid);
    expect(res.status).toBe(201);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
  });

  it('returns 409 CAMPAIGN_LIMIT_REACHED for a 4th active campaign on FREE', async () => {
    prismaMock.campaign.count.mockResolvedValue(3);
    const res = await create(valid);
    expect(res.status).toBe(409);
    expect(await errorOf(res)).toBe('CAMPAIGN_LIMIT_REACHED');
    expect(prismaMock.campaign.create).not.toHaveBeenCalled();
  });

  it('lets a PRO shop activate a 4th campaign', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(activePro as never);
    prismaMock.campaign.count.mockResolvedValue(3);
    const res = await create(valid);
    expect(res.status).toBe(201);
  });

  it('counts only effectively active campaigns, under the activation lock', async () => {
    await create(valid);
    expect(prismaMock.campaign.count.mock.calls[0]![0]!.where).toMatchObject({
      organizationId: 'org_1',
      status: 'ACTIVE',
      OR: [{ endsAt: null }, { endsAt: { gt: expect.any(Date) } }],
    });
    const [, ...values] = prismaMock.$executeRaw.mock.calls[0]!;
    expect(values).toEqual(['campaign-activate:org_1']);
    expect(prismaMock.$executeRaw.mock.invocationCallOrder[0]!).toBeLessThan(
      prismaMock.campaign.count.mock.invocationCallOrder[0]!,
    );
  });

  it('as DRAFT skips the limit', async () => {
    prismaMock.campaign.count.mockResolvedValue(3);
    const res = await create({ ...valid, status: 'DRAFT' });
    expect(res.status).toBe(201);
    expect(prismaMock.$executeRaw).not.toHaveBeenCalled();
    expect(prismaMock.campaign.count).not.toHaveBeenCalled();
  });

  it('POST with a productId from another shop returns 404 PRODUCT_NOT_FOUND', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);
    const res = await create({ ...valid, productId: 'prod_other' });
    expect(res.status).toBe(404);
    expect(await errorOf(res)).toBe('PRODUCT_NOT_FOUND');
    expect(prismaMock.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'prod_other', organizationId: 'org_1', archivedAt: null },
    });
    expect(prismaMock.campaign.create).not.toHaveBeenCalled();
  });

  it('rejects an endsAt in the past', async () => {
    const res = await create({ ...valid, endsAt: earlier().toISOString() });
    expect(res.status).toBe(400);
    expect(prismaMock.campaign.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/shops/[orgId]/campaigns', () => {
  it('lists campaigns with their effective status', async () => {
    prismaMock.campaign.findMany.mockResolvedValue([
      campaign({ id: 'c_live' }),
      campaign({ id: 'c_over', endsAt: earlier() }),
    ] as never);
    const res = await GET(apiRequest('/api/shops/org_1/campaigns'), shop);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { items: Array<{ id: string; status: string }> };
    expect(json.items.map((c) => [c.id, c.status])).toEqual([
      ['c_live', 'ACTIVE'],
      ['c_over', 'CLOSED'],
    ]);
  });

  it('?status=CLOSED filters with effectiveStatusWhere', async () => {
    prismaMock.campaign.findMany.mockResolvedValue([]);
    await GET(apiRequest('/api/shops/org_1/campaigns?status=CLOSED'), shop);
    const where = prismaMock.campaign.findMany.mock.calls[0]![0]!.where as {
      organizationId: string;
      AND: unknown[];
    };
    expect(where.organizationId).toBe('org_1');
    expect(where.AND[0]).toEqual({
      OR: [{ status: 'CLOSED' }, { status: 'ACTIVE', endsAt: { lte: expect.any(Date) } }],
    });
  });

  it('rejects an unknown status filter', async () => {
    const res = await GET(apiRequest('/api/shops/org_1/campaigns?status=LIVE'), shop);
    expect(res.status).toBe(400);
  });

  it('GET campaign of another shop returns 404 CAMPAIGN_NOT_FOUND', async () => {
    prismaMock.campaign.findFirst.mockResolvedValue(null);
    const res = await GET_ONE(apiRequest('/api/shops/org_1/campaigns/camp_1'), one);
    expect(res.status).toBe(404);
    expect(await errorOf(res)).toBe('CAMPAIGN_NOT_FOUND');
    expect(prismaMock.campaign.findFirst.mock.calls[0]![0]!.where).toEqual({
      id: 'camp_1',
      organizationId: 'org_1',
    });
  });
});

describe('PATCH /api/shops/[orgId]/campaigns/[campaignId]', () => {
  it('closes a campaign and stamps closedAt', async () => {
    prismaMock.campaign.findFirst.mockResolvedValue(campaign() as never);
    const res = await patch({ status: 'CLOSED' });
    expect(res.status).toBe(200);
    expect(prismaMock.campaign.update.mock.calls[0]![0].data).toMatchObject({
      status: 'CLOSED',
      closedAt: expect.any(Date),
    });
  });

  it('returns 409 INVALID_CAMPAIGN_TRANSITION for DRAFT to ARRIVED', async () => {
    prismaMock.campaign.findFirst.mockResolvedValue(campaign({ status: 'DRAFT' }) as never);
    const res = await patch({ status: 'ARRIVED' });
    expect(res.status).toBe(409);
    expect(await errorOf(res)).toBe('INVALID_CAMPAIGN_TRANSITION');
    expect(prismaMock.campaign.update).not.toHaveBeenCalled();
  });

  it('marks a closed campaign ARRIVED without the limit check', async () => {
    prismaMock.campaign.findFirst.mockResolvedValue(campaign({ status: 'CLOSED' }) as never);
    prismaMock.campaign.count.mockResolvedValue(3);
    const res = await patch({ status: 'ARRIVED' });
    expect(res.status).toBe(200);
    expect(prismaMock.campaign.count).not.toHaveBeenCalled();
    expect(prismaMock.campaign.update.mock.calls[0]![0].data).toMatchObject({
      status: 'ARRIVED',
      arrivedAt: expect.any(Date),
    });
  });

  it('PATCH reopening a closed campaign at the FREE limit returns 409 CAMPAIGN_LIMIT_REACHED', async () => {
    prismaMock.campaign.findFirst.mockResolvedValue(campaign({ status: 'CLOSED' }) as never);
    prismaMock.campaign.count.mockResolvedValue(3);
    const res = await patch({ status: 'ACTIVE' });
    expect(res.status).toBe(409);
    expect(await errorOf(res)).toBe('CAMPAIGN_LIMIT_REACHED');
    expect(prismaMock.campaign.count.mock.calls[0]![0]!.where).toMatchObject({
      id: { not: 'camp_1' },
    });
    expect(prismaMock.campaign.update).not.toHaveBeenCalled();
  });

  it('PATCH pushing endsAt forward on an expired campaign counts as reopening', async () => {
    prismaMock.campaign.findFirst.mockResolvedValue(campaign({ endsAt: earlier() }) as never);
    prismaMock.campaign.count.mockResolvedValue(3);
    const res = await patch({ endsAt: later().toISOString() });
    expect(res.status).toBe(409);
    expect(await errorOf(res)).toBe('CAMPAIGN_LIMIT_REACHED');
  });

  it('reopening with a past endsAt returns 400', async () => {
    prismaMock.campaign.findFirst.mockResolvedValue(
      campaign({ status: 'CLOSED', endsAt: earlier() }) as never,
    );
    const res = await patch({ status: 'ACTIVE' });
    expect(res.status).toBe(400);
    expect(prismaMock.campaign.update).not.toHaveBeenCalled();
  });

  it('edits the title without touching the status', async () => {
    prismaMock.campaign.findFirst.mockResolvedValue(campaign() as never);
    const res = await patch({ title: 'Marmites 5 L, arrivage de novembre' });
    expect(res.status).toBe(200);
    expect(prismaMock.campaign.update.mock.calls[0]![0].data).toEqual({
      title: 'Marmites 5 L, arrivage de novembre',
    });
    expect(prismaMock.campaign.count).not.toHaveBeenCalled();
  });
});

describe('/api/shops/[orgId]/campaigns/[campaignId]/links', () => {
  const postLink = () =>
    POST_LINK(
      apiRequest('/api/shops/org_1/campaigns/camp_1/links', {
        method: 'POST',
        body: { label: 'Groupe Revendeurs Dakar' },
      }),
      one,
    );

  beforeEach(() => {
    prismaMock.campaign.findFirst.mockResolvedValue({ id: 'camp_1' } as never);
  });

  it('POST links returns 403 PLAN_FEATURE_LOCKED on FREE', async () => {
    const res = await postLink();
    expect(res.status).toBe(403);
    expect(await errorOf(res)).toBe('PLAN_FEATURE_LOCKED');
    expect(prismaMock.campaignLink.create).not.toHaveBeenCalled();
  });

  it('POST links creates a source link on PRO', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(activePro as never);
    prismaMock.campaignLink.create.mockImplementation((async (args: {
      data: Record<string, unknown>;
    }) => link({ ...args.data, id: 'link_2' })) as never);
    const res = await postLink();
    expect(res.status).toBe(201);
    const data = prismaMock.campaignLink.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({
      campaignId: 'camp_1',
      label: 'Groupe Revendeurs Dakar',
      isDefault: false,
    });
    expect(data.code).toMatch(SHORT_CODE_REGEX);
    const json = (await res.json()) as { link: { url: string } };
    expect(json.link.url.endsWith(`/c/${data.code}`)).toBe(true);
  });

  it('GET links lists the default link first', async () => {
    prismaMock.campaignLink.findMany.mockResolvedValue([
      link(),
      link({ id: 'link_2', code: 'Zz9Yy8X', isDefault: false, label: 'Statut WhatsApp' }),
    ]);
    const res = await GET_LINKS(apiRequest('/api/shops/org_1/campaigns/camp_1/links'), one);
    expect(res.status).toBe(200);
    expect(prismaMock.campaignLink.findMany).toHaveBeenCalledWith({
      where: { campaignId: 'camp_1' },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    const json = (await res.json()) as { items: Array<{ code: string }> };
    expect(json.items.map((l) => l.code)).toEqual(['k3P9xQa', 'Zz9Yy8X']);
  });

  it("links routes return 404 CAMPAIGN_NOT_FOUND for another shop's campaign", async () => {
    prismaMock.campaign.findFirst.mockResolvedValue(null);
    const list = await GET_LINKS(apiRequest('/api/shops/org_1/campaigns/camp_1/links'), one);
    expect(list.status).toBe(404);
    const created = await postLink();
    expect(created.status).toBe(404);
    expect(await errorOf(created)).toBe('CAMPAIGN_NOT_FOUND');
    expect(prismaMock.campaign.findFirst.mock.calls[0]![0]!.where).toEqual({
      id: 'camp_1',
      organizationId: 'org_1',
    });
  });
});
