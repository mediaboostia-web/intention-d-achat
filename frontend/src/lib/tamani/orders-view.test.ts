import { describe, it, expect } from 'vitest';
import {
  NO_ORDER_FILTERS,
  ORDER_TRANSITIONS,
  canTransition,
  fulfillmentText,
  orderActions,
  orderSearch,
  orderStatusLabel,
  orderUnitPrice,
  orderWhatsappMessage,
  parseOrderSearch,
  productQuantity,
  type Fulfillment,
  type OrderStatus,
} from './orders-view';

const parse = (qs: string) => parseOrderSearch(new URLSearchParams(qs));

describe('orderStatusLabel', () => {
  it('names each status, a fulfilled pickup « Récupérée »', () => {
    expect(orderStatusLabel('TO_CONFIRM', 'DELIVERY')).toBe('À confirmer');
    expect(orderStatusLabel('CONFIRMED', 'PICKUP')).toBe('Confirmée');
    expect(orderStatusLabel('FULFILLED', 'DELIVERY')).toBe('Livrée');
    expect(orderStatusLabel('FULFILLED', 'PICKUP')).toBe('Récupérée');
    expect(orderStatusLabel('CANCELLED', 'DELIVERY')).toBe('Annulée');
  });
});

describe('parseOrderSearch', () => {
  it('reads every filter and the to-deliver view', () => {
    expect(parse('statut=a-confirmer&campagne=c1&produit=p1&quartier=z1')).toEqual({
      status: 'TO_CONFIRM',
      campaignId: 'c1',
      productId: 'p1',
      zoneId: 'z1',
      view: 'list',
    });
    expect(parse('vue=a-livrer')).toEqual({ ...NO_ORDER_FILTERS, view: 'to-deliver' });
    expect(parse('statut=confirmees')?.status).toBe('CONFIRMED');
    expect(parse('statut=livrees')?.status).toBe('FULFILLED');
    expect(parse('statut=annulees')?.status).toBe('CANCELLED');
    expect(parse('')).toEqual(NO_ORDER_FILTERS);
  });

  it('refuses what it does not know', () => {
    expect(parse('statut=livre')).toBeNull();
    expect(parse('vue=carte')).toBeNull();
    expect(parse('campagne=a%20b')).toBeNull();
  });

  it('writes an address the parser reads back', () => {
    const f = parse('statut=livrees&produit=p1&vue=a-livrer');
    expect(orderSearch(f!)).toBe('statut=livrees&produit=p1&vue=a-livrer');
    expect(parse(orderSearch(f!))).toEqual(f);
    expect(orderSearch(NO_ORDER_FILTERS)).toBe('');
  });
});

describe('orderWhatsappMessage', () => {
  const base = {
    firstName: 'Awa',
    shopName: 'Diallo Import',
    productName: 'Marmites inox 5 L',
    unitLabel: 'pièce',
    quantity: 3,
    totalAmount: 37500,
    fulfillment: 'DELIVERY' as const,
    zoneName: 'Médina',
    currency: 'XOF',
  };

  it('writes the total in the shop currency (lot 7b)', () => {
    expect(orderWhatsappMessage({ ...base, currency: 'CDF' })).toContain('Total : 37 500 FC.');
  });

  it('confirms the order with its total and where it goes', () => {
    expect(orderWhatsappMessage(base)).toBe(
      'Bonjour Awa, ta commande de 3 pièces de Marmites inox 5 L est confirmée. Total : 37 500 FCFA. Livraison à Médina. À bientôt, Diallo Import.',
    );
  });

  it('copes with no first name, no zone, a pickup and one piece', () => {
    expect(orderWhatsappMessage({ ...base, firstName: null })).toMatch(/^Bonjour, ta commande/);
    expect(orderWhatsappMessage({ ...base, zoneName: null })).toContain(' Livraison. ');
    expect(orderWhatsappMessage({ ...base, fulfillment: 'PICKUP' })).toContain(
      ' Retrait à la boutique. ',
    );
    expect(orderWhatsappMessage({ ...base, quantity: 1, totalAmount: 12500 })).toContain(
      'ta commande de 1 pièce de Marmites',
    );
  });
});

describe('orderUnitPrice', () => {
  const riz = { unitPrice: 17500, wholesalePrice: 16000, wholesaleMinQty: 12 };
  it('gives a reseller the wholesale price from the minimum, else the unit price', () => {
    expect(orderUnitPrice(riz, 'RESELLER', 12)).toBe(16000);
    expect(orderUnitPrice(riz, 'RESELLER', 11)).toBe(17500);
    expect(orderUnitPrice(riz, 'CONSUMER', 50)).toBe(17500);
    expect(orderUnitPrice({ ...riz, wholesalePrice: null }, 'RESELLER', 50)).toBe(17500);
    expect(orderUnitPrice({ ...riz, wholesaleMinQty: null }, 'RESELLER', 50)).toBe(17500);
  });
});

describe('ORDER_TRANSITIONS and orderActions', () => {
  it('allows the moves of the spec and no other', () => {
    expect(canTransition('TO_CONFIRM', 'CONFIRMED')).toBe(true);
    expect(canTransition('TO_CONFIRM', 'CANCELLED')).toBe(true);
    expect(canTransition('CONFIRMED', 'FULFILLED')).toBe(true);
    expect(canTransition('CONFIRMED', 'CANCELLED')).toBe(true);
    expect(canTransition('TO_CONFIRM', 'FULFILLED')).toBe(false);
    expect(canTransition('FULFILLED', 'CANCELLED')).toBe(false);
    expect(ORDER_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it('names the buttons of each status, « Marquer récupérée » for a pickup', () => {
    const labels = (s: OrderStatus, f: Fulfillment) => orderActions(s, f).map((a) => a.label);
    expect(labels('TO_CONFIRM', 'DELIVERY')).toEqual(['Confirmer', 'Annuler']);
    expect(labels('CONFIRMED', 'DELIVERY')).toEqual(['Marquer livrée', 'Annuler']);
    expect(labels('CONFIRMED', 'PICKUP')).toEqual(['Marquer récupérée', 'Annuler']);
    expect(labels('FULFILLED', 'PICKUP')).toEqual([]);
    expect(labels('CANCELLED', 'DELIVERY')).toEqual([]);
    expect(orderActions('CONFIRMED', 'PICKUP').map((a) => a.to)).toEqual([
      'FULFILLED',
      'CANCELLED',
    ]);
  });
});

describe('productQuantity and fulfillmentText', () => {
  it('writes the pieces of a product', () => {
    expect(productQuantity({ quantity: 24, unitLabel: 'sac', productName: 'Riz parfumé' })).toBe(
      '24 sacs de Riz parfumé',
    );
    expect(productQuantity({ quantity: 1, unitLabel: 'pièce', productName: 'Marmite' })).toBe(
      '1 pièce de Marmite',
    );
  });

  it('says where the order goes', () => {
    expect(fulfillmentText('PICKUP', null)).toBe('Retrait à la boutique');
    expect(fulfillmentText('DELIVERY', 'Médina')).toBe('Livraison à Médina');
    expect(fulfillmentText('DELIVERY', null)).toBe('Livraison, sans quartier');
  });
});
