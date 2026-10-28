// Lot 7 order rules: the frozen price, the status moves and the one-gesture
// conversion of a « Oui » answer into an order.
import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, it, expect } from 'vitest';
import { ORDER_STATUSES } from '@/lib/tamani/orders-view';
import { ORDER_SELECT, toOrderRow } from './serializers';
import {
  MAX_ORDER_TOTAL,
  ORDER_TRANSITIONS,
  OrderError,
  canTransition,
  convertResponseToOrder,
  orderTotal,
  orderUnitPrice,
} from './orders';

const now = new Date('2026-10-28T10:00:00Z');
const product = { unitPrice: 7500, wholesalePrice: 6000, wholesaleMinQty: 12 };
const counted = { completedAt: { not: null }, locked: false, suspicious: false };

describe('orderUnitPrice', () => {
  it('gives the wholesale price to a reseller who reaches the minimum, else the unit price', () => {
    expect(orderUnitPrice(product, 'RESELLER', 12)).toBe(6000);
    expect(orderUnitPrice(product, 'RESELLER', 11)).toBe(7500);
    expect(orderUnitPrice(product, 'CONSUMER', 50)).toBe(7500);
    expect(
      orderUnitPrice(
        { unitPrice: 7500, wholesalePrice: null, wholesaleMinQty: null },
        'RESELLER',
        99,
      ),
    ).toBe(7500);
  });
});

describe('ORDER_TRANSITIONS', () => {
  const allowed = new Set([
    'TO_CONFIRM>CONFIRMED',
    'TO_CONFIRM>CANCELLED',
    'CONFIRMED>FULFILLED',
    'CONFIRMED>CANCELLED',
  ]);

  it('allows only TO_CONFIRM → CONFIRMED | CANCELLED and CONFIRMED → FULFILLED | CANCELLED', () => {
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        expect(canTransition(from, to), `${from} → ${to}`).toBe(allowed.has(`${from}>${to}`));
      }
    }
  });

  it('a delivered order cannot be cancelled, a cancelled one goes nowhere', () => {
    expect(canTransition('FULFILLED', 'CANCELLED')).toBe(false);
    expect(ORDER_TRANSITIONS.FULFILLED).toEqual([]);
    expect(ORDER_TRANSITIONS.CANCELLED).toEqual([]);
  });
});

describe('orderTotal', () => {
  it('is the unit price times the quantity, in whole FCFA', () => {
    expect(orderTotal(7500, 3)).toBe(22_500);
  });

  it('refuses a total the database cannot hold (400, never a 500)', () => {
    expect(orderTotal(MAX_ORDER_TOTAL, 1)).toBe(MAX_ORDER_TOTAL);
    expect(() => orderTotal(100_000_000, 100_000)).toThrow(OrderError);
    try {
      orderTotal(100_000_000, 100_000);
    } catch (err) {
      expect(err).toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    }
  });
});

describe('convertResponseToOrder', () => {
  const answer = (over: object = {}) => ({
    id: 'resp_1',
    campaignId: 'camp_1',
    respondentId: 'r1',
    interested: true,
    buyerType: 'RESELLER',
    quantity: 12,
    wantsDelivery: true,
    zoneId: 'zone_1',
    deliveryPlace: null,
    campaign: { productId: 'prod_1', product },
    order: null,
    ...over,
  });
  const created = () => prismaMock.saleOrder.create.mock.calls[0]![0]!;
  const convert = (campaignId?: string) =>
    campaignId === undefined
      ? convertResponseToOrder(prismaMock, 'org_1', 'resp_1', now)
      : convertResponseToOrder(prismaMock, 'org_1', 'resp_1', now, { campaignId });

  beforeEach(() => {
    prismaMock.response.findFirst.mockResolvedValue(answer() as never);
    prismaMock.saleOrder.create.mockResolvedValue({ id: 'order_1' } as never);
  });

  it('reads only a counted answer of the shop', async () => {
    await convert();
    expect(prismaMock.response.findFirst.mock.calls[0]![0]!.where).toEqual({
      id: 'resp_1',
      organizationId: 'org_1',
      ...counted,
    });
  });

  it('keeps to the campaign of the address when one is given', async () => {
    await convert('camp_1');
    expect(prismaMock.response.findFirst.mock.calls[0]![0]!.where).toEqual({
      id: 'resp_1',
      organizationId: 'org_1',
      campaignId: 'camp_1',
      ...counted,
    });
  });

  it('makes a TO_CONFIRM order with the frozen price, the total, the delivery and the zone', async () => {
    await expect(convert()).resolves.toEqual({ id: 'order_1' });
    expect(created()).toEqual({
      data: {
        organizationId: 'org_1',
        respondentId: 'r1',
        productId: 'prod_1',
        campaignId: 'camp_1',
        responseId: 'resp_1',
        buyerType: 'RESELLER',
        quantity: 12,
        unitPrice: 6000,
        totalAmount: 72_000,
        fulfillment: 'DELIVERY',
        zoneId: 'zone_1',
        status: 'TO_CONFIRM',
        notes: null,
        createdAt: now,
      },
      select: { id: true },
    });
  });

  it('a pickup carries no zone', async () => {
    prismaMock.response.findFirst.mockResolvedValue(
      answer({ wantsDelivery: false, zoneId: 'zone_1' }) as never,
    );
    await convert();
    expect(created().data).toMatchObject({ fulfillment: 'PICKUP', zoneId: null });
  });

  it('an answer that never spoke of delivery is a pickup', async () => {
    prismaMock.response.findFirst.mockResolvedValue(
      answer({ wantsDelivery: null, zoneId: null }) as never,
    );
    await convert();
    expect(created().data).toMatchObject({ fulfillment: 'PICKUP', zoneId: null });
  });

  it('keeps an « Autre endroit » place in the note of a delivery without zone', async () => {
    prismaMock.response.findFirst.mockResolvedValue(
      answer({ zoneId: null, deliveryPlace: 'Keur Massar' }) as never,
    );
    await convert();
    expect(created().data).toMatchObject({
      fulfillment: 'DELIVERY',
      zoneId: null,
      notes: 'Lieu : Keur Massar',
    });
  });

  it('defaults to a consumer and one piece when the answer says neither', async () => {
    prismaMock.response.findFirst.mockResolvedValue(
      answer({ buyerType: null, quantity: null }) as never,
    );
    await convert();
    expect(created().data).toMatchObject({
      buyerType: 'CONSUMER',
      quantity: 1,
      unitPrice: 7500,
      totalAmount: 7500,
    });
  });

  it('a later product price change leaves the order price', async () => {
    prismaMock.response.findFirst.mockResolvedValue(
      answer({ buyerType: 'CONSUMER', quantity: 3 }) as never,
    );
    await convert();
    const data = created().data as { unitPrice: number; totalAmount: number };
    expect(data).toMatchObject({ unitPrice: 7500, totalAmount: 22_500 });

    // The product then sells at 9 000: an order is read from its own row
    // (the order select never names the product's price) and nothing
    // went back to the product after the creation.
    expect(ORDER_SELECT.product).toEqual({ select: { name: true, unitLabel: true } });
    expect(prismaMock.product.findFirst).not.toHaveBeenCalled();
    const row = toOrderRow(
      {
        id: 'order_1',
        status: 'TO_CONFIRM',
        paid: false,
        paidAt: null,
        createdAt: now,
        quantity: 3,
        unitPrice: data.unitPrice,
        totalAmount: data.totalAmount,
        fulfillment: 'DELIVERY',
        zoneId: 'zone_1',
        productId: 'prod_1',
        campaignId: 'camp_1',
        responseId: 'resp_1',
        buyerType: 'CONSUMER',
        notes: null,
        zone: { name: 'Médina' },
        product: { name: 'Marmites inox 5 L', unitLabel: 'pièce' },
        campaign: { title: 'Marmites' },
        respondent: { id: 'r1', firstName: 'Awa', phoneE164: '+221771234512', anonymizedAt: null },
      },
      true,
    );
    expect(row).toMatchObject({ unitPrice: 7500, totalAmount: 22_500 });
  });

  it('converting twice gives ORDER_ALREADY_EXISTS, also on P2002', async () => {
    prismaMock.response.findFirst.mockResolvedValue(answer({ order: { id: 'order_1' } }) as never);
    await expect(convert()).rejects.toMatchObject({ code: 'ORDER_ALREADY_EXISTS', status: 409 });
    expect(prismaMock.saleOrder.create).not.toHaveBeenCalled();

    // Two taps at once: both read no order, the unique responseId stops the second.
    prismaMock.response.findFirst.mockResolvedValue(answer() as never);
    prismaMock.saleOrder.create.mockRejectedValue(
      Object.assign(new Error('Unique'), { code: 'P2002', meta: { target: ['responseId'] } }),
    );
    const err = await convert().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OrderError);
    expect(err).toMatchObject({ code: 'ORDER_ALREADY_EXISTS', status: 409 });
  });

  it('lets any other database failure through', async () => {
    prismaMock.saleOrder.create.mockRejectedValue(new Error('connection lost'));
    await expect(convert()).rejects.toThrow('connection lost');
  });

  it('a « Non » gives RESPONSE_NOT_INTERESTED', async () => {
    prismaMock.response.findFirst.mockResolvedValue(answer({ interested: false }) as never);
    await expect(convert()).rejects.toMatchObject({ code: 'RESPONSE_NOT_INTERESTED', status: 409 });
    expect(prismaMock.saleOrder.create).not.toHaveBeenCalled();
  });

  it('an answer of another shop, not counted or without its client gives RESPONSE_NOT_FOUND', async () => {
    prismaMock.response.findFirst.mockResolvedValue(null);
    await expect(convert()).rejects.toMatchObject({ code: 'RESPONSE_NOT_FOUND', status: 404 });
    prismaMock.response.findFirst.mockResolvedValue(answer({ respondentId: null }) as never);
    await expect(convert()).rejects.toMatchObject({ code: 'RESPONSE_NOT_FOUND', status: 404 });
    expect(prismaMock.saleOrder.create).not.toHaveBeenCalled();
  });
});
