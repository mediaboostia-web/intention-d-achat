// The orders of a shop (lot 7, spec §5.5.1): the filtered list, the
// confirmed deliveries grouped by zone for the rounds, the manual order,
// the changes of an order and a campaign's ordered quantities. Every query
// carries the shop's organizationId; without the plan's contacts (Free) no
// full number leaves here.
import 'server-only';
import type { Prisma } from '@prisma/client';
import type { CountryCode } from 'libphonenumber-js/min';
import type { BuyerType } from '@/lib/tamani/labels';
import {
  ORDER_STATUSES,
  type Fulfillment,
  type OrderFilters,
  type OrderRow,
  type OrderStatus,
  type ToDeliverGroup,
} from '@/lib/tamani/orders-view';
import type { Cursor } from '@/lib/server/notifications/cursor';
import { buildPage } from '@/lib/server/pagination/paginate';
import type { Db } from './locks';
import { OrderError, canTransition, orderTotal, orderUnitPrice } from './orders';
import { normalizePhone } from './phone';
import { ORDER_SELECT, toOrderRow } from './serializers';

/** A delivery round larger than this is cut: a bound on one read, far above a real day. */
const MAX_TO_DELIVER = 1000;

function filterWhere(organizationId: string, f: OrderFilters): Prisma.SaleOrderWhereInput {
  return {
    organizationId,
    ...(f.status && { status: f.status }),
    ...(f.campaignId && { campaignId: f.campaignId }),
    ...(f.productId && { productId: f.productId }),
    ...(f.zoneId && { zoneId: f.zoneId }),
  };
}

async function countByStatus(db: Db, organizationId: string): Promise<Record<OrderStatus, number>> {
  const groups = await db.saleOrder.groupBy({
    by: ['status'],
    where: { organizationId },
    _count: { _all: true },
  });
  const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<
    OrderStatus,
    number
  >;
  for (const g of groups) {
    const status = ORDER_STATUSES.find((s) => s === g.status);
    if (status) counts[status] = g._count._all;
  }
  return counts;
}

/**
 * The shop's orders, newest first, with a cursor. The first page carries
 * the counts per status for the whole shop (not the filters), unless
 * `counts: false`.
 */
export async function listOrders(
  db: Db,
  organizationId: string,
  filters: OrderFilters,
  cursor: Cursor | null,
  opts: { canSeeContacts: boolean; limit: number; counts?: boolean },
): Promise<{
  items: OrderRow[];
  nextCursor: string | null;
  counts: Record<OrderStatus, number> | null;
}> {
  const after: Prisma.SaleOrderWhereInput[] = cursor
    ? [
        {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        },
      ]
    : [];
  const [rows, counts] = await Promise.all([
    db.saleOrder.findMany({
      where: { ...filterWhere(organizationId, filters), AND: after },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: opts.limit + 1,
      select: ORDER_SELECT,
    }),
    cursor || opts.counts === false ? null : countByStatus(db, organizationId),
  ]);
  const page = buildPage(rows, opts.limit);
  return {
    items: page.items.map((o) => toOrderRow(o, opts.canSeeContacts)),
    nextCursor: page.nextCursor,
    counts,
  };
}

/**
 * « À livrer par quartier »: the confirmed deliveries (pickups never),
 * oldest first, grouped by zone in the shop's order (« Sans quartier »
 * last), with the pieces to load per product.
 */
export async function ordersToDeliver(
  db: Db,
  organizationId: string,
  opts: { canSeeContacts: boolean },
): Promise<ToDeliverGroup[]> {
  const rows = await db.saleOrder.findMany({
    where: { organizationId, status: 'CONFIRMED', fulfillment: 'DELIVERY' },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: MAX_TO_DELIVER,
    select: { ...ORDER_SELECT, zone: { select: { name: true, sortOrder: true } } },
  });

  const groups = new Map<string | null, { sortOrder: number; group: ToDeliverGroup }>();
  for (const row of rows) {
    const zoneId = row.zone ? row.zoneId : null;
    let entry = groups.get(zoneId);
    if (!entry) {
      entry = {
        sortOrder: row.zone?.sortOrder ?? 0,
        group: { zoneId, zoneName: row.zone?.name ?? null, orders: [], totals: [] },
      };
      groups.set(zoneId, entry);
    }
    entry.group.orders.push(toOrderRow(row, opts.canSeeContacts));
  }

  const byName = (a: string | null, b: string | null) => (a ?? '').localeCompare(b ?? '', 'fr');
  return [...groups.values()]
    .sort((a, b) => {
      if (a.group.zoneId === null || b.group.zoneId === null) {
        return Number(a.group.zoneId === null) - Number(b.group.zoneId === null);
      }
      return a.sortOrder - b.sortOrder || byName(a.group.zoneName, b.group.zoneName);
    })
    .map(({ group }) => ({ ...group, totals: totalsByProduct(group.orders) }));
}

function totalsByProduct(orders: readonly OrderRow[]): ToDeliverGroup['totals'] {
  const totals = new Map<string, ToDeliverGroup['totals'][number]>();
  for (const o of orders) {
    const t = totals.get(o.productId);
    if (t) t.quantity += o.quantity;
    else
      totals.set(o.productId, {
        productId: o.productId,
        productName: o.productName,
        unitLabel: o.unitLabel,
        quantity: o.quantity,
      });
  }
  return [...totals.values()].sort((a, b) => a.productName.localeCompare(b.productName, 'fr'));
}

/** One order of the shop; null when absent or another shop's. */
export async function getOrder(
  db: Db,
  organizationId: string,
  orderId: string,
  opts: { canSeeContacts: boolean },
): Promise<OrderRow | null> {
  const row = await db.saleOrder.findFirst({
    where: { id: orderId, organizationId },
    select: ORDER_SELECT,
  });
  return row ? toOrderRow(row, opts.canSeeContacts) : null;
}

export interface ManualOrderInput {
  productId: string;
  firstName: string;
  phone: string;
  quantity: number;
  buyerType: BuyerType;
  fulfillment: Fulfillment;
  zoneId: string | null;
  campaignId: string | null;
}

/**
 * An order typed by hand (« Nouvelle commande »). The number is read in
 * the shop's country; the client is the one the book already has under
 * that number (their first name kept when they have one), else a new one.
 * The product, the campaign (one of this product's) and the zone must be
 * the shop's. The price is frozen with the same rule as a conversion.
 */
export async function createManualOrder(
  tx: Db,
  organizationId: string,
  input: ManualOrderInput,
  country: CountryCode,
  now: Date,
): Promise<{ id: string }> {
  const phoneE164 = normalizePhone(input.phone, country);
  if (!phoneE164) throw new OrderError('INVALID_PHONE', 400);

  const product = await tx.product.findFirst({
    where: { id: input.productId, organizationId },
    select: { id: true, unitPrice: true, wholesalePrice: true, wholesaleMinQty: true },
  });
  if (!product) throw new OrderError('PRODUCT_NOT_FOUND', 404);

  if (input.campaignId !== null) {
    const campaign = await tx.campaign.findFirst({
      where: { id: input.campaignId, organizationId, productId: product.id },
      select: { id: true },
    });
    if (!campaign) throw new OrderError('CAMPAIGN_NOT_FOUND', 404);
  }

  const zoneId = input.fulfillment === 'DELIVERY' ? input.zoneId : null;
  if (zoneId !== null) {
    const zone = await tx.deliveryZone.findFirst({
      where: { id: zoneId, organizationId },
      select: { id: true },
    });
    if (!zone) throw new OrderError('ZONE_NOT_FOUND', 404);
  }

  const unitPrice = orderUnitPrice(product, input.buyerType, input.quantity);
  const totalAmount = orderTotal(unitPrice, input.quantity);

  const client = await tx.respondent.upsert({
    where: { organizationId_phoneE164: { organizationId, phoneE164 } },
    create: {
      organizationId,
      phoneE164,
      firstName: input.firstName,
      firstSeenAt: now,
      lastSeenAt: now,
    },
    update: {},
    select: { id: true, firstName: true },
  });
  if (client.firstName === null) {
    await tx.respondent.updateMany({
      where: { id: client.id, organizationId },
      data: { firstName: input.firstName },
    });
  }

  return tx.saleOrder.create({
    data: {
      organizationId,
      respondentId: client.id,
      productId: product.id,
      campaignId: input.campaignId,
      responseId: null,
      buyerType: input.buyerType,
      quantity: input.quantity,
      unitPrice,
      totalAmount,
      fulfillment: input.fulfillment,
      zoneId,
      status: 'TO_CONFIRM',
      createdAt: now,
    },
    select: { id: true },
  });
}

export interface OrderPatch {
  status?: OrderStatus;
  paid?: boolean;
  unitPrice?: number;
  quantity?: number;
  notes?: string | null;
}

const STATUS_DATE = {
  CONFIRMED: 'confirmedAt',
  FULFILLED: 'fulfilledAt',
  CANCELLED: 'cancelledAt',
} as const;

interface OrderChange {
  status?: OrderStatus;
  confirmedAt?: Date;
  fulfilledAt?: Date;
  cancelledAt?: Date;
  paid?: boolean;
  paidAt?: Date | null;
  unitPrice?: number;
  quantity?: number;
  totalAmount?: number;
  notes?: string | null;
}

/**
 * Changes one order: a status move (each dated), « payé » (independent of
 * the status), the price and the quantity (TO_CONFIRM only, the total
 * recomputed) and the note. A value equal to the stored one is no change,
 * so a double tap on « Confirmer » is answered, not refused. A move is
 * written only if the status is still the one read: the loser of two tabs
 * gets 409 INVALID_ORDER_TRANSITION.
 */
export async function updateOrder(
  tx: Db,
  organizationId: string,
  orderId: string,
  patch: OrderPatch,
  now: Date,
  opts: { canSeeContacts: boolean },
): Promise<OrderRow> {
  const order = await tx.saleOrder.findFirst({
    where: { id: orderId, organizationId },
    select: ORDER_SELECT,
  });
  if (!order) throw new OrderError('ORDER_NOT_FOUND', 404);
  const from = order.status as OrderStatus;
  const data: OrderChange = {};

  const unitPrice = patch.unitPrice ?? order.unitPrice;
  const quantity = patch.quantity ?? order.quantity;
  if (unitPrice !== order.unitPrice || quantity !== order.quantity) {
    if (from !== 'TO_CONFIRM') throw new OrderError('INVALID_ORDER_TRANSITION', 409);
    data.unitPrice = unitPrice;
    data.quantity = quantity;
    data.totalAmount = orderTotal(unitPrice, quantity);
  }

  const to = patch.status;
  if (to !== undefined && to !== from) {
    if (to === 'TO_CONFIRM' || !canTransition(from, to)) {
      throw new OrderError('INVALID_ORDER_TRANSITION', 409);
    }
    data.status = to;
    data[STATUS_DATE[to]] = now;
  }

  if (patch.paid !== undefined && patch.paid !== order.paid) {
    data.paid = patch.paid;
    data.paidAt = patch.paid ? now : null;
  }
  if (patch.notes !== undefined && patch.notes !== order.notes) data.notes = patch.notes;

  if (Object.keys(data).length === 0) return toOrderRow(order, opts.canSeeContacts);

  const guarded = data.status !== undefined || data.unitPrice !== undefined;
  const { count } = await tx.saleOrder.updateMany({
    where: { id: order.id, organizationId, ...(guarded && { status: from }) },
    data,
  });
  if (count === 0) {
    throw guarded
      ? new OrderError('INVALID_ORDER_TRANSITION', 409)
      : new OrderError('ORDER_NOT_FOUND', 404);
  }
  return toOrderRow({ ...order, ...data }, opts.canSeeContacts);
}

/**
 * A campaign's ordered quantities: to confirm, confirmed, delivered, and
 * the stock left (stock − confirmed − delivered), a display that never
 * blocks an order and may go below zero; null without a stock quantity.
 */
export async function campaignOrderSummary(
  db: Db,
  organizationId: string,
  campaignId: string,
): Promise<{ confirmed: number; fulfilled: number; toConfirm: number; stockLeft: number | null }> {
  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, organizationId },
    select: { stockQuantity: true },
  });
  if (!campaign) throw new OrderError('CAMPAIGN_NOT_FOUND', 404);
  const sums = await db.saleOrder.groupBy({
    by: ['status'],
    where: { organizationId, campaignId },
    _sum: { quantity: true },
  });
  const qty = (s: OrderStatus) => sums.find((g) => g.status === s)?._sum.quantity ?? 0;
  const confirmed = qty('CONFIRMED');
  const fulfilled = qty('FULFILLED');
  return {
    confirmed,
    fulfilled,
    toConfirm: qty('TO_CONFIRM'),
    stockLeft:
      campaign.stockQuantity === null ? null : campaign.stockQuantity - confirmed - fulfilled,
  };
}
