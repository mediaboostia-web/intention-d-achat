import { describe, it, expect } from 'vitest';
import { orderUnitPrice as serverOrderUnitPrice } from '@/lib/server/tamani/orders';
import {
  emptyOrderForm,
  submitOnce,
  orderFormToBody,
  orderPricePreview,
  orderPriceText,
  type OrderFormValues,
} from './order-form';
import type { BuyerType } from './labels';
import { orderUnitPrice } from './orders-view';

const riz = { unitPrice: 7500, wholesalePrice: 6000, wholesaleMinQty: 12 };

describe('orderPricePreview', () => {
  it('gives a reseller of 12 pieces the wholesale price', () => {
    expect(orderPricePreview(riz, 'RESELLER', '12')).toEqual({
      wholesale: true,
      unitPrice: 6000,
      quantity: 12,
      total: 72000,
      wholesaleFrom: null,
    });
  });

  it('keeps the unit price under the minimum and says from when the wholesale price starts', () => {
    expect(orderPricePreview(riz, 'RESELLER', '11')).toEqual({
      wholesale: false,
      unitPrice: 7500,
      quantity: 11,
      total: 82500,
      wholesaleFrom: 12,
    });
    expect(orderPricePreview(riz, 'CONSUMER', '50')).toMatchObject({
      wholesale: false,
      unitPrice: 7500,
      wholesaleFrom: null,
    });
    expect(orderPricePreview({ ...riz, wholesalePrice: null }, 'RESELLER', '50')).toMatchObject({
      wholesale: false,
      unitPrice: 7500,
      wholesaleFrom: null,
    });
  });

  it('waits for a product and a quantity', () => {
    expect(orderPricePreview(null, 'RESELLER', '12')).toBeNull();
    expect(orderPricePreview(riz, 'RESELLER', '')).toBeNull();
    expect(orderPricePreview(riz, 'RESELLER', '0')).toBeNull();
    expect(orderPricePreview(riz, 'RESELLER', '2,5')).toBeNull();
  });

  it('writes the calculation', () => {
    expect(orderPriceText(orderPricePreview(riz, 'RESELLER', '12')!)).toBe(
      'Prix de gros : 6 000 FCFA × 12 = 72 000 FCFA',
    );
    expect(orderPriceText(orderPricePreview(riz, 'CONSUMER', '3')!)).toBe(
      "Prix à l'unité : 7 500 FCFA × 3 = 22 500 FCFA",
    );
  });

  it('previews the rule the server freezes', () => {
    expect(orderUnitPrice).toBe(serverOrderUnitPrice);
    type Priced = {
      unitPrice: number;
      wholesalePrice: number | null;
      wholesaleMinQty: number | null;
    };
    const cases: Array<[Priced, BuyerType, number]> = [
      [riz, 'RESELLER', 12],
      [riz, 'RESELLER', 11],
      [riz, 'CONSUMER', 50],
      [{ ...riz, wholesalePrice: null }, 'RESELLER', 50],
      [{ ...riz, wholesaleMinQty: null }, 'RESELLER', 50],
    ];
    for (const [product, buyerType, quantity] of cases) {
      expect(orderPricePreview(product, buyerType, String(quantity))?.unitPrice).toBe(
        serverOrderUnitPrice(product, buyerType, quantity),
      );
    }
  });
});

describe('orderFormToBody', () => {
  const filled: OrderFormValues = {
    ...emptyOrderForm,
    productId: 'p1',
    firstName: '  Awa ',
    phone: '77 123 45 12',
    buyerType: 'RESELLER',
    quantity: '12',
    fulfillment: 'DELIVERY',
    zoneId: 'z1',
    campaignId: 'c1',
  };

  it('sends what the API takes', () => {
    expect(orderFormToBody(filled)).toEqual({
      ok: true,
      body: {
        productId: 'p1',
        firstName: 'Awa',
        phone: '77 123 45 12',
        buyerType: 'RESELLER',
        quantity: 12,
        fulfillment: 'DELIVERY',
        zoneId: 'z1',
        campaignId: 'c1',
      },
    });
  });

  it('a pickup has no zone, no campaign is null', () => {
    const r = orderFormToBody({ ...filled, fulfillment: 'PICKUP', campaignId: '' });
    expect(r.ok && r.body).toMatchObject({ fulfillment: 'PICKUP', zoneId: null, campaignId: null });
    const noZone = orderFormToBody({ ...filled, zoneId: '' });
    expect(noZone.ok && noZone.body.zoneId).toBeNull();
  });

  it('says what is missing', () => {
    const r = orderFormToBody({ ...emptyOrderForm, quantity: '0' });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors).toEqual({
      productId: 'Choisis un produit.',
      firstName: 'Écris le prénom du client.',
      phone: 'Écris le numéro WhatsApp du client.',
      quantity: 'Écris une quantité entre 1 et 100 000.',
    });
    const big = orderFormToBody({ ...filled, quantity: '100001' });
    expect(!big.ok && big.errors).toEqual({ quantity: 'Écris une quantité entre 1 et 100 000.' });
  });
});

describe('submitOnce', () => {
  it('stays busy after a success, while the page moves to the new order', async () => {
    const busy: boolean[] = [];
    await submitOnce(
      async () => true,
      (b) => busy.push(b),
    );
    expect(busy).toEqual([true]);
  });

  it('frees the button after a failure, or a throw', async () => {
    const busy: boolean[] = [];
    await submitOnce(
      async () => false,
      (b) => busy.push(b),
    );
    expect(busy).toEqual([true, false]);
    const again: boolean[] = [];
    await expect(
      submitOnce(
        () => Promise.reject(new Error('network')),
        (b) => again.push(b),
      ),
    ).rejects.toThrow('network');
    expect(again).toEqual([true, false]);
  });
});
