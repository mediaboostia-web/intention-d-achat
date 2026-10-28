// Lot 7 order queries: the list, « À livrer par quartier », the manual
// order, the changes of an order and a campaign's quantities.
import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, it, expect, type Mock } from 'vitest';
import { encodeCursor } from '@/lib/server/notifications/cursor';
import { NO_ORDER_FILTERS } from '@/lib/tamani/orders-view';
import { ORDER_SELECT } from './serializers';
import {
  campaignOrderSummary,
  createManualOrder,
  getOrder,
  listOrders,
  ordersToDeliver,
  updateOrder,
  type ManualOrderInput,
} from './order-queries';

const now = new Date('2026-10-28T10:00:00Z');
/** Prisma's groupBy overloads defeat the deep mock's types (as in home-bulletin.test.ts). */
const groupBy = () => prismaMock.saleOrder.groupBy as unknown as Mock;

const at = (iso: string) => new Date(iso);

function order(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    status: 'TO_CONFIRM',
    paid: false,
    paidAt: null,
    createdAt: at('2026-10-27T10:00:00Z'),
    quantity: 3,
    unitPrice: 7500,
    totalAmount: 22_500,
    fulfillment: 'DELIVERY',
    zoneId: 'zone_m',
    productId: 'prod_riz',
    campaignId: 'camp_1',
    responseId: null,
    buyerType: 'CONSUMER',
    notes: null,
    zone: { name: 'Médina', sortOrder: 1 },
    product: { name: 'Riz parfumé', unitLabel: 'sac' },
    campaign: { title: 'Riz' },
    respondent: { id: 'r1', firstName: 'Awa', phoneE164: '+221771234512', anonymizedAt: null },
    ...over,
  };
}

describe('listOrders', () => {
  const filters = {
    status: 'CONFIRMED',
    campaignId: 'camp_1',
    productId: 'prod_riz',
    zoneId: 'zone_m',
    view: 'list',
  } as const;

  it('lists the shop orders newest first, with the filters and the counts of the whole shop', async () => {
    prismaMock.saleOrder.findMany.mockResolvedValue([order('o1')] as never);
    groupBy().mockResolvedValue([
      { status: 'TO_CONFIRM', _count: { _all: 4 } },
      { status: 'CONFIRMED', _count: { _all: 2 } },
    ] as never);
    const page = await listOrders(prismaMock, 'org_1', filters, null, {
      canSeeContacts: true,
      limit: 20,
    });
    expect(prismaMock.saleOrder.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org_1',
        status: 'CONFIRMED',
        campaignId: 'camp_1',
        productId: 'prod_riz',
        zoneId: 'zone_m',
        AND: [],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 21,
      select: ORDER_SELECT,
    });
    expect(groupBy().mock.calls[0]![0]).toMatchObject({
      by: ['status'],
      where: { organizationId: 'org_1' },
    });
    expect(page.counts).toEqual({ TO_CONFIRM: 4, CONFIRMED: 2, FULFILLED: 0, CANCELLED: 0 });
    expect(page.items[0]).toMatchObject({ id: 'o1', client: { phone: '+221 77 123 45 12' } });
    expect(page.nextCursor).toBeNull();
  });

  it('after a cursor: older orders only, no counts', async () => {
    prismaMock.saleOrder.findMany.mockResolvedValue([] as never);
    const cursor = { createdAt: at('2026-10-27T10:00:00Z'), id: 'o5' };
    const page = await listOrders(prismaMock, 'org_1', NO_ORDER_FILTERS, cursor, {
      canSeeContacts: true,
      limit: 20,
    });
    expect(prismaMock.saleOrder.findMany.mock.calls[0]![0]!.where).toEqual({
      organizationId: 'org_1',
      AND: [
        {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: 'o5' } },
          ],
        },
      ],
    });
    expect(prismaMock.saleOrder.groupBy).not.toHaveBeenCalled();
    expect(page.counts).toBeNull();
  });

  it('gives the next cursor when there are more orders', async () => {
    prismaMock.saleOrder.findMany.mockResolvedValue([order('o1'), order('o2')] as never);
    groupBy().mockResolvedValue([] as never);
    const page = await listOrders(prismaMock, 'org_1', NO_ORDER_FILTERS, null, {
      canSeeContacts: true,
      limit: 1,
    });
    expect(page.items.map((o) => o.id)).toEqual(['o1']);
    expect(page.nextCursor).toBe(encodeCursor({ createdAt: at('2026-10-27T10:00:00Z'), id: 'o1' }));
  });

  it('masks the numbers on the free plan', async () => {
    prismaMock.saleOrder.findMany.mockResolvedValue([order('o1')] as never);
    groupBy().mockResolvedValue([] as never);
    const page = await listOrders(prismaMock, 'org_1', NO_ORDER_FILTERS, null, {
      canSeeContacts: false,
      limit: 20,
    });
    expect(page.items[0]!.client).toEqual({
      id: 'r1',
      firstName: 'Awa',
      phone: '77 •• •• 12',
      phoneE164: null,
    });
  });

  it('can skip the counts (the campaign tab has its own summary)', async () => {
    prismaMock.saleOrder.findMany.mockResolvedValue([] as never);
    const page = await listOrders(prismaMock, 'org_1', NO_ORDER_FILTERS, null, {
      canSeeContacts: true,
      limit: 20,
      counts: false,
    });
    expect(prismaMock.saleOrder.groupBy).not.toHaveBeenCalled();
    expect(page.counts).toBeNull();
  });
});

describe('ordersToDeliver', () => {
  const plateau = { zoneId: 'zone_p', zone: { name: 'Plateau', sortOrder: 2 } };
  const none = { zoneId: null, zone: null };
  const huile = { productId: 'prod_huile', product: { name: 'Huile 5 L', unitLabel: 'bidon' } };

  it('groups the confirmed deliveries by zone, in the shop order, « Sans quartier » last', async () => {
    prismaMock.saleOrder.findMany.mockResolvedValue([
      order('o1', { ...plateau, quantity: 10 }),
      order('o2', { quantity: 4 }),
      order('o3', { ...none, ...huile, quantity: 2 }),
      order('o4', { ...huile, quantity: 3 }),
      order('o5', { quantity: 6 }),
    ] as never);
    const groups = await ordersToDeliver(prismaMock, 'org_1', { canSeeContacts: true });

    const call = prismaMock.saleOrder.findMany.mock.calls[0]![0]!;
    // Pickups and other statuses never enter the round.
    expect(call.where).toEqual({
      organizationId: 'org_1',
      status: 'CONFIRMED',
      fulfillment: 'DELIVERY',
    });
    expect(call.orderBy).toEqual([{ createdAt: 'asc' }, { id: 'asc' }]);

    expect(groups.map((g) => [g.zoneId, g.zoneName, g.orders.map((o) => o.id)])).toEqual([
      ['zone_m', 'Médina', ['o2', 'o4', 'o5']],
      ['zone_p', 'Plateau', ['o1']],
      [null, null, ['o3']],
    ]);
    expect(groups[0]!.totals).toEqual([
      { productId: 'prod_huile', productName: 'Huile 5 L', unitLabel: 'bidon', quantity: 3 },
      { productId: 'prod_riz', productName: 'Riz parfumé', unitLabel: 'sac', quantity: 10 },
    ]);
    expect(groups[2]!.totals).toEqual([
      { productId: 'prod_huile', productName: 'Huile 5 L', unitLabel: 'bidon', quantity: 2 },
    ]);
  });

  it('is empty without confirmed deliveries, and masks numbers on the free plan', async () => {
    prismaMock.saleOrder.findMany.mockResolvedValue([] as never);
    expect(await ordersToDeliver(prismaMock, 'org_1', { canSeeContacts: false })).toEqual([]);
    prismaMock.saleOrder.findMany.mockResolvedValue([order('o1')] as never);
    const [group] = await ordersToDeliver(prismaMock, 'org_1', { canSeeContacts: false });
    expect(group!.orders[0]!.client).toMatchObject({ phone: '77 •• •• 12', phoneE164: null });
  });
});

describe('createManualOrder', () => {
  const input: ManualOrderInput = {
    productId: 'prod_1',
    firstName: 'Awa',
    phone: '77 123 45 12',
    quantity: 12,
    buyerType: 'RESELLER',
    fulfillment: 'DELIVERY',
    zoneId: 'zone_m',
    campaignId: 'camp_1',
  };
  const make = (over: Partial<ManualOrderInput> = {}) =>
    createManualOrder(prismaMock, 'org_1', { ...input, ...over }, 'SN', now);

  beforeEach(() => {
    prismaMock.product.findFirst.mockResolvedValue({
      id: 'prod_1',
      unitPrice: 7500,
      wholesalePrice: 6000,
      wholesaleMinQty: 12,
    } as never);
    prismaMock.campaign.findFirst.mockResolvedValue({ id: 'camp_1' } as never);
    prismaMock.deliveryZone.findFirst.mockResolvedValue({ id: 'zone_m' } as never);
    prismaMock.respondent.upsert.mockResolvedValue({ id: 'r1', firstName: 'Awa D.' } as never);
    prismaMock.saleOrder.create.mockResolvedValue({ id: 'order_1' } as never);
  });

  it('manual order finds the client by normalized number', async () => {
    await expect(make()).resolves.toEqual({ id: 'order_1' });
    expect(prismaMock.respondent.upsert).toHaveBeenCalledWith({
      where: { organizationId_phoneE164: { organizationId: 'org_1', phoneE164: '+221771234512' } },
      create: {
        organizationId: 'org_1',
        phoneE164: '+221771234512',
        firstName: 'Awa',
        firstSeenAt: now,
        lastSeenAt: now,
      },
      update: {},
      select: { id: true, firstName: true },
    });
    // The client already had a first name: it is kept.
    expect(prismaMock.respondent.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.saleOrder.create.mock.calls[0]![0]!.data).toMatchObject({
      respondentId: 'r1',
    });
  });

  it('a known client without a first name gets the one typed', async () => {
    prismaMock.respondent.upsert.mockResolvedValue({ id: 'r1', firstName: null } as never);
    await make();
    expect(prismaMock.respondent.updateMany).toHaveBeenCalledWith({
      where: { id: 'r1', organizationId: 'org_1' },
      data: { firstName: 'Awa' },
    });
  });

  it('makes a TO_CONFIRM order with the frozen price, the zone and the campaign', async () => {
    await make();
    expect(prismaMock.saleOrder.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org_1',
        respondentId: 'r1',
        productId: 'prod_1',
        campaignId: 'camp_1',
        responseId: null,
        buyerType: 'RESELLER',
        quantity: 12,
        unitPrice: 6000,
        totalAmount: 72_000,
        fulfillment: 'DELIVERY',
        zoneId: 'zone_m',
        status: 'TO_CONFIRM',
        createdAt: now,
      },
      select: { id: true },
    });
  });

  it('checks the product, the campaign and the zone in the shop', async () => {
    await make();
    expect(prismaMock.product.findFirst.mock.calls[0]![0]!.where).toEqual({
      id: 'prod_1',
      organizationId: 'org_1',
    });
    // The campaign must be one of this product's.
    expect(prismaMock.campaign.findFirst.mock.calls[0]![0]!.where).toEqual({
      id: 'camp_1',
      organizationId: 'org_1',
      productId: 'prod_1',
    });
    expect(prismaMock.deliveryZone.findFirst.mock.calls[0]![0]!.where).toEqual({
      id: 'zone_m',
      organizationId: 'org_1',
    });
  });

  it('refuses a product, a campaign or a zone of another shop with its own code', async () => {
    prismaMock.product.findFirst.mockResolvedValueOnce(null);
    await expect(make()).rejects.toMatchObject({ code: 'PRODUCT_NOT_FOUND', status: 404 });
    prismaMock.campaign.findFirst.mockResolvedValueOnce(null);
    await expect(make()).rejects.toMatchObject({ code: 'CAMPAIGN_NOT_FOUND', status: 404 });
    prismaMock.deliveryZone.findFirst.mockResolvedValueOnce(null);
    await expect(make()).rejects.toMatchObject({ code: 'ZONE_NOT_FOUND', status: 404 });
    expect(prismaMock.respondent.upsert).not.toHaveBeenCalled();
    expect(prismaMock.saleOrder.create).not.toHaveBeenCalled();
  });

  it('refuses a number that is not one (400 INVALID_PHONE)', async () => {
    await expect(make({ phone: '12' })).rejects.toMatchObject({
      code: 'INVALID_PHONE',
      status: 400,
    });
    expect(prismaMock.saleOrder.create).not.toHaveBeenCalled();
  });

  it('a pickup has no zone, and no campaign is fine', async () => {
    await make({ fulfillment: 'PICKUP', zoneId: 'zone_x', campaignId: null });
    expect(prismaMock.deliveryZone.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.campaign.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.saleOrder.create.mock.calls[0]![0]!.data).toMatchObject({
      fulfillment: 'PICKUP',
      zoneId: null,
      campaignId: null,
    });
  });
});

describe('updateOrder', () => {
  const change = (patch: Parameters<typeof updateOrder>[3], canSeeContacts = true) =>
    updateOrder(prismaMock, 'org_1', 'o1', patch, now, { canSeeContacts });
  const stored = (over: Record<string, unknown> = {}) =>
    prismaMock.saleOrder.findFirst.mockResolvedValue(order('o1', over) as never);
  const written = () => prismaMock.saleOrder.updateMany.mock.calls[0]![0]!;

  beforeEach(() => {
    stored();
    prismaMock.saleOrder.updateMany.mockResolvedValue({ count: 1 });
  });

  it('ORDER_NOT_FOUND for an order of another shop', async () => {
    prismaMock.saleOrder.findFirst.mockResolvedValue(null);
    await expect(change({ status: 'CONFIRMED' })).rejects.toMatchObject({
      code: 'ORDER_NOT_FOUND',
      status: 404,
    });
    expect(prismaMock.saleOrder.findFirst.mock.calls[0]![0]!.where).toEqual({
      id: 'o1',
      organizationId: 'org_1',
    });
    expect(prismaMock.saleOrder.updateMany).not.toHaveBeenCalled();
  });

  it('confirm then fulfil dates each step', async () => {
    const confirmed = await change({ status: 'CONFIRMED' });
    expect(written()).toEqual({
      where: { id: 'o1', organizationId: 'org_1', status: 'TO_CONFIRM' },
      data: { status: 'CONFIRMED', confirmedAt: now },
    });
    expect(confirmed.status).toBe('CONFIRMED');

    prismaMock.saleOrder.updateMany.mockClear();
    stored({ status: 'CONFIRMED' });
    const later = new Date('2026-10-29T10:00:00Z');
    await updateOrder(prismaMock, 'org_1', 'o1', { status: 'FULFILLED' }, later, {
      canSeeContacts: true,
    });
    expect(written()).toEqual({
      where: { id: 'o1', organizationId: 'org_1', status: 'CONFIRMED' },
      data: { status: 'FULFILLED', fulfilledAt: later },
    });
  });

  it('cancelling dates cancelledAt', async () => {
    await change({ status: 'CANCELLED' });
    expect(written().data).toEqual({ status: 'CANCELLED', cancelledAt: now });
  });

  it('refuses a forbidden move with INVALID_ORDER_TRANSITION', async () => {
    await expect(change({ status: 'FULFILLED' })).rejects.toMatchObject({
      code: 'INVALID_ORDER_TRANSITION',
      status: 409,
    });
    stored({ status: 'FULFILLED' });
    await expect(change({ status: 'CANCELLED' })).rejects.toMatchObject({
      code: 'INVALID_ORDER_TRANSITION',
    });
    stored({ status: 'CANCELLED' });
    await expect(change({ status: 'CONFIRMED' })).rejects.toMatchObject({
      code: 'INVALID_ORDER_TRANSITION',
    });
    expect(prismaMock.saleOrder.updateMany).not.toHaveBeenCalled();
  });

  it('the same status again changes nothing (a double tap on « Confirmer »)', async () => {
    stored({ status: 'CONFIRMED' });
    const row = await change({ status: 'CONFIRMED' });
    expect(prismaMock.saleOrder.updateMany).not.toHaveBeenCalled();
    expect(row.status).toBe('CONFIRMED');
  });

  it('a price or a quantity before confirmation recomputes the total', async () => {
    const row = await change({ unitPrice: 7000, quantity: 4 });
    expect(written()).toEqual({
      where: { id: 'o1', organizationId: 'org_1', status: 'TO_CONFIRM' },
      data: { unitPrice: 7000, quantity: 4, totalAmount: 28_000 },
    });
    expect(row).toMatchObject({ unitPrice: 7000, quantity: 4, totalAmount: 28_000 });
  });

  it('a price after confirmation is refused and the total stays', async () => {
    stored({ status: 'CONFIRMED' });
    await expect(change({ unitPrice: 5000 })).rejects.toMatchObject({
      code: 'INVALID_ORDER_TRANSITION',
      status: 409,
    });
    await expect(change({ quantity: 10 })).rejects.toMatchObject({
      code: 'INVALID_ORDER_TRANSITION',
    });
    expect(prismaMock.saleOrder.updateMany).not.toHaveBeenCalled();
    // Sending back the same price is no change.
    await expect(change({ unitPrice: 7500, quantity: 3 })).resolves.toMatchObject({
      totalAmount: 22_500,
    });
  });

  it('a price fixed and the order confirmed in one go', async () => {
    await change({ unitPrice: 7000, status: 'CONFIRMED' });
    expect(written().data).toEqual({
      unitPrice: 7000,
      quantity: 3,
      totalAmount: 21_000,
      status: 'CONFIRMED',
      confirmedAt: now,
    });
  });

  it('a move that lost a race to another tab is refused', async () => {
    prismaMock.saleOrder.updateMany.mockResolvedValue({ count: 0 });
    await expect(change({ status: 'CONFIRMED' })).rejects.toMatchObject({
      code: 'INVALID_ORDER_TRANSITION',
      status: 409,
    });
  });

  it('paid sets and clears paidAt, whatever the status', async () => {
    stored({ status: 'CANCELLED' });
    const paid = await change({ paid: true });
    expect(written()).toEqual({
      where: { id: 'o1', organizationId: 'org_1' },
      data: { paid: true, paidAt: now },
    });
    expect(paid).toMatchObject({ paid: true, paidAt: now.toISOString() });

    prismaMock.saleOrder.updateMany.mockClear();
    const first = at('2026-10-20T08:00:00Z');
    stored({ paid: true, paidAt: first });
    const again = await change({ paid: true });
    expect(prismaMock.saleOrder.updateMany).not.toHaveBeenCalled();
    expect(again.paidAt).toBe(first.toISOString());

    const unpaid = await change({ paid: false });
    expect(written().data).toEqual({ paid: false, paidAt: null });
    expect(unpaid).toMatchObject({ paid: false, paidAt: null });
  });

  it('writes the note', async () => {
    await change({ notes: 'Après 18 h' });
    expect(written().data).toEqual({ notes: 'Après 18 h' });
    stored({ notes: 'Après 18 h' });
    prismaMock.saleOrder.updateMany.mockClear();
    await change({ notes: null });
    expect(written().data).toEqual({ notes: null });
  });

  it('refuses a total the database cannot hold', async () => {
    await expect(change({ unitPrice: 100_000_000, quantity: 100_000 })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      status: 400,
    });
  });
});

describe('campaignOrderSummary', () => {
  beforeEach(() => {
    prismaMock.campaign.findFirst.mockResolvedValue({ stockQuantity: 30 } as never);
    groupBy().mockResolvedValue([
      { status: 'CONFIRMED', _sum: { quantity: 12 } },
      { status: 'FULFILLED', _sum: { quantity: 8 } },
      { status: 'TO_CONFIRM', _sum: { quantity: 5 } },
      { status: 'CANCELLED', _sum: { quantity: 4 } },
    ] as never);
  });

  it('stockLeft = 30 − (confirmed + fulfilled); waiting and cancelled orders take nothing', async () => {
    expect(await campaignOrderSummary(prismaMock, 'org_1', 'camp_1')).toEqual({
      confirmed: 12,
      fulfilled: 8,
      toConfirm: 5,
      stockLeft: 10,
    });
    expect(prismaMock.campaign.findFirst.mock.calls[0]![0]!.where).toEqual({
      id: 'camp_1',
      organizationId: 'org_1',
    });
    expect(groupBy().mock.calls[0]![0]).toMatchObject({
      by: ['status'],
      where: { organizationId: 'org_1', campaignId: 'camp_1' },
      _sum: { quantity: true },
    });
  });

  it('no stock left without a stock quantity; zeros without orders', async () => {
    prismaMock.campaign.findFirst.mockResolvedValue({ stockQuantity: null } as never);
    groupBy().mockResolvedValue([] as never);
    expect(await campaignOrderSummary(prismaMock, 'org_1', 'camp_1')).toEqual({
      confirmed: 0,
      fulfilled: 0,
      toConfirm: 0,
      stockLeft: null,
    });
  });

  it('CAMPAIGN_NOT_FOUND for a campaign of another shop', async () => {
    prismaMock.campaign.findFirst.mockResolvedValue(null);
    await expect(campaignOrderSummary(prismaMock, 'org_1', 'camp_x')).rejects.toMatchObject({
      code: 'CAMPAIGN_NOT_FOUND',
      status: 404,
    });
    expect(prismaMock.saleOrder.groupBy).not.toHaveBeenCalled();
  });
});

describe('getOrder', () => {
  it('reads one order of the shop, null elsewhere', async () => {
    prismaMock.saleOrder.findFirst.mockResolvedValue(order('o1') as never);
    expect(await getOrder(prismaMock, 'org_1', 'o1', { canSeeContacts: true })).toMatchObject({
      id: 'o1',
    });
    expect(prismaMock.saleOrder.findFirst).toHaveBeenCalledWith({
      where: { id: 'o1', organizationId: 'org_1' },
      select: ORDER_SELECT,
    });
    prismaMock.saleOrder.findFirst.mockResolvedValue(null);
    expect(await getOrder(prismaMock, 'org_1', 'o9', { canSeeContacts: true })).toBeNull();
  });
});
