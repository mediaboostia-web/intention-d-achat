import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, expect, it } from 'vitest';
import { getPublicCampaign } from './public-campaign';

const now = new Date('2026-10-25T10:00:00Z');
const DAY = 24 * 3600 * 1000;

function fixture(over: { campaign?: object; product?: object; org?: object } = {}) {
  const org = {
    id: 'org_1',
    slug: 'diallo-import',
    name: 'Diallo Import',
    ownerId: 'user_1',
    whatsappPhone: '+221770000099',
    country: 'SN',
    currency: 'XOF',
    logoUrl: null,
    description: null,
    coefConsumer: 0.5,
    coefReseller: 0.7,
    subscription: null,
    createdAt: now,
    updatedAt: now,
    ...over.org,
  };
  const product = {
    id: 'prod_1',
    organizationId: 'org_1',
    name: 'Marmites inox 5 L',
    description: null,
    unitLabel: 'pièce',
    unitPrice: 7500,
    wholesalePrice: 6000,
    wholesaleMinQty: 12,
    costPrice: 4100,
    photos: ['https://res.cloudinary.com/demo/image/upload/v1/m.jpg'],
    optionLabel: null,
    options: [],
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...over.product,
  };
  const campaign = {
    id: 'camp_1',
    organizationId: 'org_1',
    productId: 'prod_1',
    title: 'Marmites inox 5 L',
    availability: 'INCOMING',
    availableAt: new Date(now.getTime() + 10 * DAY),
    stockQuantity: 200,
    plannedQuantity: 777,
    showStock: false,
    endsAt: null,
    deliveryEnabled: true,
    showLiveCounter: true,
    shareTemplate: '',
    status: 'ACTIVE',
    closedAt: null,
    arrivedAt: null,
    createdAt: now,
    updatedAt: now,
    product,
    organization: org,
    ...over.campaign,
  };
  return {
    id: 'link_1',
    campaignId: 'camp_1',
    code: 'Ab3dE7x',
    label: 'Lien principal',
    isDefault: true,
    openCount: 0,
    createdAt: now,
    updatedAt: now,
    campaign,
  };
}

function given(link: ReturnType<typeof fixture>, interested = 64) {
  prismaMock.campaignLink.findUnique.mockResolvedValue(link as never);
  prismaMock.deliveryZone.findMany.mockResolvedValue([
    { id: 'zone_1', name: 'Médina' },
    { id: 'zone_2', name: 'Parcelles' },
  ] as never);
  prismaMock.response.count.mockResolvedValue(interested);
}

describe('getPublicCampaign', () => {
  it('never exposes whatsappPhone, costPrice, plannedQuantity or respondents', async () => {
    given(fixture({ campaign: { showStock: true } }));
    const result = await getPublicCampaign(prismaMock, 'Ab3dE7x', now);
    const json = JSON.stringify(result);
    expect(json).not.toContain('+221770000099');
    expect(json).not.toContain('4100');
    expect(json).not.toContain('777');
    expect(Object.keys(result!).sort()).toEqual(
      [
        'accepting',
        'availability',
        'availabilityText',
        'campaignId',
        'code',
        'deliveryEnabled',
        'interestedCount',
        'linkId',
        'poweredByBadge',
        'product',
        'shop',
        'status',
        'stockQuantity',
        'timingOptions',
        'title',
        'zones',
      ].sort(),
    );
    expect(result).toMatchObject({
      code: 'Ab3dE7x',
      linkId: 'link_1',
      campaignId: 'camp_1',
      status: 'ACTIVE',
      accepting: true,
      availabilityText: 'Arrivage dans 10 jours',
      timingOptions: ['ON_ARRIVAL', 'WEEK_AFTER', 'LATER'],
      shop: {
        name: 'Diallo Import',
        slug: 'diallo-import',
        logoUrl: null,
        description: null,
        dialCode: '+221',
        country: 'SN',
      },
      interestedCount: 64,
      stockQuantity: 200,
    });
  });

  it('a CLOSED campaign gives accepting: false', async () => {
    given(fixture({ campaign: { endsAt: new Date(now.getTime() - DAY) } }));
    expect(await getPublicCampaign(prismaMock, 'Ab3dE7x', now)).toMatchObject({
      status: 'CLOSED',
      accepting: false,
    });
  });

  it('an archived product closes the popup', async () => {
    given(fixture({ product: { archivedAt: new Date(now.getTime() - DAY) } }));
    expect(await getPublicCampaign(prismaMock, 'Ab3dE7x', now)).toMatchObject({
      status: 'ACTIVE',
      accepting: false,
    });
  });

  it('hides the counter and the stock unless the campaign shows them', async () => {
    given(fixture({ campaign: { showLiveCounter: false, showStock: false } }));
    const result = await getPublicCampaign(prismaMock, 'Ab3dE7x', now);
    expect(result).toMatchObject({ interestedCount: null, stockQuantity: null });
    expect(prismaMock.response.count).not.toHaveBeenCalled();
  });

  it('counts complete, interested, non-suspicious responses', async () => {
    given(fixture());
    await getPublicCampaign(prismaMock, 'Ab3dE7x', now);
    expect(prismaMock.response.count).toHaveBeenCalledWith({
      where: {
        campaignId: 'camp_1',
        interested: true,
        completedAt: { not: null },
        suspicious: false,
      },
    });
  });

  it('poweredByBadge follows the effective plan', async () => {
    given(fixture());
    expect((await getPublicCampaign(prismaMock, 'Ab3dE7x', now))?.poweredByBadge).toBe(true);
    given(
      fixture({
        org: {
          subscription: {
            plan: 'PRO',
            currentPeriodEnd: new Date(now.getTime() + 20 * DAY),
            graceUntil: new Date(now.getTime() + 25 * DAY),
          },
        },
      }),
    );
    expect((await getPublicCampaign(prismaMock, 'Ab3dE7x', now))?.poweredByBadge).toBe(false);
  });

  it('returns null for an unknown or malformed code', async () => {
    expect(await getPublicCampaign(prismaMock, 'abc', now)).toBeNull();
    expect(prismaMock.campaignLink.findUnique).not.toHaveBeenCalled();
    prismaMock.campaignLink.findUnique.mockResolvedValue(null);
    expect(await getPublicCampaign(prismaMock, 'Zz9Zz9Z', now)).toBeNull();
  });

  it('lists zones only when delivery is offered', async () => {
    given(fixture());
    expect((await getPublicCampaign(prismaMock, 'Ab3dE7x', now))?.zones).toEqual([
      { id: 'zone_1', name: 'Médina' },
      { id: 'zone_2', name: 'Parcelles' },
    ]);
    expect(prismaMock.deliveryZone.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_1' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true },
    });
    prismaMock.deliveryZone.findMany.mockClear();
    given(fixture({ campaign: { deliveryEnabled: false } }));
    prismaMock.deliveryZone.findMany.mockClear();
    expect((await getPublicCampaign(prismaMock, 'Ab3dE7x', now))?.zones).toEqual([]);
    expect(prismaMock.deliveryZone.findMany).not.toHaveBeenCalled();
  });
});
