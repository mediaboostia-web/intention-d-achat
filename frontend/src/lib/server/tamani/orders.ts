// The rules of a shop's orders (lot 7, spec §5.5.1): the price frozen when
// the order is made, the status moves, and the one-gesture conversion of a
// « Oui » answer into an order. One order per answer: the unique
// SaleOrder.responseId settles two taps at once.
import 'server-only';
import type { NextResponse } from 'next/server';
import { BUYER_TYPES, type BuyerType } from '@/lib/tamani/labels';
import { orderUnitPrice } from '@/lib/tamani/orders-view';
import { COUNTED } from './campaign-responses';
import { isUniqueViolation, tamaniError, type TamaniErrorCode } from './errors';
import { validationFailed } from './http';
import type { Db } from './locks';

// The price rule and the status moves live with the shared views: the order
// form previews the same price and the order page offers the same moves.
export { ORDER_TRANSITIONS, canTransition, orderUnitPrice } from '@/lib/tamani/orders-view';

/** A refusal of the order rules, turned into the route's answer by orderFailure. */
export class OrderError extends Error {
  constructor(
    readonly code: TamaniErrorCode | 'VALIDATION_FAILED',
    readonly status: 400 | 404 | 409,
  ) {
    super(code);
    this.name = 'OrderError';
  }
}

/** The largest amount a Postgres Int holds: a bigger total is a 400, never a 500. */
export const MAX_ORDER_TOTAL = 2_147_483_647;

/** Unit price × quantity, in whole FCFA. */
export function orderTotal(unitPrice: number, quantity: number): number {
  const total = unitPrice * quantity;
  if (total > MAX_ORDER_TOTAL) throw new OrderError('VALIDATION_FAILED', 400);
  return total;
}

/** The answer of an OrderError; anything else is rethrown. */
export function orderFailure(err: unknown): NextResponse {
  if (!(err instanceof OrderError)) throw err;
  if (err.code === 'VALIDATION_FAILED') return validationFailed('Order total too large');
  return tamaniError(err.code, err.status);
}

function buyerTypeOf(raw: string | null): BuyerType {
  return BUYER_TYPES.find((t) => t === raw) ?? 'CONSUMER';
}

/**
 * Turns a counted « Oui » answer of the shop into a TO_CONFIRM order,
 * filled from the answer: product, quantity (1 when unsaid), buyer type
 * (consumer when unsaid), delivery and zone, the price frozen now. An
 * « Autre endroit » place goes into the note. With `campaignId`, the
 * answer must also belong to that campaign. The order is dated `now`.
 */
export async function convertResponseToOrder(
  tx: Db,
  organizationId: string,
  responseId: string,
  now: Date,
  opts: { campaignId?: string } = {},
): Promise<{ id: string }> {
  const answer = await tx.response.findFirst({
    where: {
      id: responseId,
      organizationId,
      ...(opts.campaignId !== undefined && { campaignId: opts.campaignId }),
      ...COUNTED,
    },
    select: {
      id: true,
      campaignId: true,
      respondentId: true,
      interested: true,
      buyerType: true,
      quantity: true,
      wantsDelivery: true,
      zoneId: true,
      deliveryPlace: true,
      option: true,
      campaign: {
        select: {
          productId: true,
          product: {
            select: {
              unitPrice: true,
              wholesalePrice: true,
              wholesaleMinQty: true,
              optionLabel: true,
            },
          },
        },
      },
      order: { select: { id: true } },
    },
  });
  if (!answer || answer.respondentId === null) throw new OrderError('RESPONSE_NOT_FOUND', 404);
  if (answer.interested !== true) throw new OrderError('RESPONSE_NOT_INTERESTED', 409);
  if (answer.order) throw new OrderError('ORDER_ALREADY_EXISTS', 409);

  const buyerType = buyerTypeOf(answer.buyerType);
  const quantity = answer.quantity !== null && answer.quantity > 0 ? answer.quantity : 1;
  const unitPrice = orderUnitPrice(answer.campaign.product, buyerType, quantity);
  const delivery = answer.wantsDelivery === true;
  const place = delivery && answer.zoneId === null ? answer.deliveryPlace : null;
  // What the round needs and the order has no field for: the size or colour, then where.
  const notes = [
    answer.option ? `${answer.campaign.product.optionLabel ?? 'Option'} : ${answer.option}` : null,
    place ? `Lieu : ${place}` : null,
  ].filter((line) => line !== null);
  try {
    return await tx.saleOrder.create({
      data: {
        organizationId,
        respondentId: answer.respondentId,
        productId: answer.campaign.productId,
        campaignId: answer.campaignId,
        responseId: answer.id,
        buyerType,
        quantity,
        unitPrice,
        totalAmount: orderTotal(unitPrice, quantity),
        fulfillment: delivery ? 'DELIVERY' : 'PICKUP',
        zoneId: delivery ? answer.zoneId : null,
        status: 'TO_CONFIRM',
        notes: notes.length > 0 ? notes.join('\n') : null,
        createdAt: now,
      },
      select: { id: true },
    });
  } catch (err) {
    if (isUniqueViolation(err, 'responseId')) throw new OrderError('ORDER_ALREADY_EXISTS', 409);
    throw err;
  }
}
