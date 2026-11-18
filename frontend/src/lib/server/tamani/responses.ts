// A respondent's answer, saved at every tap (spec §5.3). One response per
// device and per campaign while it is incomplete; the WhatsApp number at the
// last step completes it, puts the person in the shop's client book, and
// folds a second phone into the answer that number already gave.
import 'server-only';
import { Prisma, type Response } from '@prisma/client';
import { freezePicks, offersOf, picksTotal, readPicks, type OfferPick } from '@/lib/tamani/offers';
import { optionSplit, splitTotal } from '@/lib/tamani/option-split';
import { TIMING_OPTIONS } from '@/lib/tamani/timing';
import { isAcceptingResponses } from './campaign-status';
import type { TamaniErrorCode } from './errors';
import { compact, type ResponseStepInput } from './inputs';
import type { Db } from './locks';
import type { CountryCode } from 'libphonenumber-js/min';
import { maskPhone, normalizePhone, shopCountry } from './phone';
import { interestedWhere } from './public-campaign';
import { recordDeviceNumber } from './public-limits';
import { campaignStock } from './stock';
import { answersClosed, shouldLockNewCompletion } from './quota';
import { signResponseToken, verifyResponseToken } from './response-token';

const SUSPICIOUS_NUMBERS = 3;
/** The most pieces one answer may ask, split or not (inputs.ts caps a quantity the same). */
const MAX_QUANTITY = 100_000;

export class ResponseWriteError extends Error {
  constructor(
    readonly code: TamaniErrorCode | 'VALIDATION_FAILED',
    readonly status: number,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export interface UpsertResult {
  responseId: string;
  token: string;
  completed: boolean;
  /** True only on the write that completed the response: the shop is told then. */
  firstCompletion: boolean;
  respondent: { firstName: string; phoneE164: string; phoneMasked: string } | null;
  /** The shop can see this number: the box ticked now or on an earlier answer. */
  contactShared: boolean;
  interestedCount: number | null;
}

type AnswerFields = Pick<
  Response,
  | 'interested'
  | 'notInterestedReason'
  | 'buyerType'
  | 'quantity'
  | 'option'
  | 'timing'
  | 'wantsDelivery'
  | 'zoneId'
  | 'deliveryPlace'
  | 'fulfillment'
> & {
  /** The split per option (2026-11-04), [{ option, quantity }]; DbNull clears it. */
  optionQuantities: Prisma.InputJsonValue | typeof Prisma.DbNull;
  /** The wholesale offers picked, frozen (2026-11-18); DbNull clears them. */
  offerPicks: Prisma.InputJsonValue | typeof Prisma.DbNull;
};

const invalid = (message: string) => new ResponseWriteError('VALIDATION_FAILED', 400, message);

/**
 * The fields this step sends; a "no" empties the yes-only ones. `picks`: the
 * offers of this step, checked and frozen; `keepSplit`: the split already
 * saved still adds up to them.
 */
function answerData(
  input: ResponseStepInput,
  picks: OfferPick[] | null = null,
  keepSplit = false,
): Partial<AnswerFields> {
  const data: Partial<AnswerFields> = compact({
    interested: input.interested,
    notInterestedReason: input.notInterestedReason,
    buyerType: input.buyerType,
    quantity: input.quantity,
    option: input.option,
    timing: input.timing,
    wantsDelivery: input.wantsDelivery,
    zoneId: input.zoneId,
    deliveryPlace: input.deliveryPlace,
    fulfillment: input.fulfillment,
  });
  // A split gives the total and, alone, the option; a bare quantity drops a split.
  if (input.optionQuantities !== undefined) {
    const split = input.optionQuantities;
    Object.assign(data, {
      quantity: splitTotal(split),
      option: split.length === 1 ? split[0]!.option : null,
      optionQuantities: split.map((e) => ({ option: e.option, quantity: e.quantity })),
    });
  } else if (input.quantity !== undefined) {
    data.optionQuantities = Prisma.DbNull;
  }
  // Offers give the pieces; a split sent with them, or kept, splits the same pieces.
  if (picks) {
    data.offerPicks = picks as unknown as Prisma.InputJsonValue;
    if (input.optionQuantities === undefined) {
      data.quantity = picksTotal(picks).pieces;
      if (!keepSplit) Object.assign(data, { optionQuantities: Prisma.DbNull, option: null });
    }
  } else if (input.quantity !== undefined || input.buyerType === 'CONSUMER') {
    data.offerPicks = Prisma.DbNull;
  }
  // The way to receive it sets wantsDelivery; an older popup sends wantsDelivery alone.
  if (input.fulfillment !== undefined) {
    data.wantsDelivery = input.fulfillment !== 'PICKUP';
    if (input.fulfillment === 'SHIPPING') data.zoneId = null;
  } else if (input.wantsDelivery !== undefined) {
    data.fulfillment = input.wantsDelivery ? 'DELIVERY' : 'PICKUP';
  }
  // A place is a delivery outside the zones: a zone drops it, and it drops a zone
  // chosen before. Sent together, the zone wins.
  if (input.zoneId != null) data.deliveryPlace = null;
  else if (typeof input.deliveryPlace === 'string') data.zoneId = null;
  if (input.interested === true) data.notInterestedReason = null;
  if (input.interested === false) {
    Object.assign(data, {
      buyerType: null,
      quantity: null,
      option: null,
      optionQuantities: Prisma.DbNull,
      offerPicks: Prisma.DbNull,
      timing: null,
      wantsDelivery: null,
      fulfillment: null,
      zoneId: null,
      deliveryPlace: null,
    });
  }
  if (input.wantsDelivery === false) Object.assign(data, { zoneId: null, deliveryPlace: null });
  return data;
}

function answersOf(r: Response): AnswerFields {
  return {
    interested: r.interested,
    notInterestedReason: r.notInterestedReason,
    buyerType: r.buyerType,
    quantity: r.quantity,
    option: r.option,
    optionQuantities: Array.isArray(r.optionQuantities)
      ? (r.optionQuantities as Prisma.InputJsonArray)
      : Prisma.DbNull,
    offerPicks: Array.isArray(r.offerPicks)
      ? (r.offerPicks as Prisma.InputJsonArray)
      : Prisma.DbNull,
    timing: r.timing,
    wantsDelivery: r.wantsDelivery,
    fulfillment: r.fulfillment,
    zoneId: r.zoneId,
    deliveryPlace: r.deliveryPlace,
  };
}

function isComplete(r: Response, deliveryEnabled: boolean): boolean {
  if (r.interested === false) return true;
  return (
    r.interested === true &&
    r.buyerType !== null &&
    r.quantity !== null &&
    r.timing !== null &&
    (!deliveryEnabled || r.wantsDelivery !== null)
  );
}

export async function upsertResponse(
  db: Db,
  input: ResponseStepInput & { token: string | null },
  now: Date,
): Promise<UpsertResult> {
  const link = await db.campaignLink.findUnique({
    where: { code: input.code },
    include: { campaign: { include: { product: true, organization: true } } },
  });
  if (!link) throw new ResponseWriteError('CAMPAIGN_NOT_FOUND', 404);
  const { campaign } = link;
  const { product, organization: org } = campaign;
  if (!isAcceptingResponses(campaign, now) || product.archivedAt !== null) {
    throw new ResponseWriteError('CAMPAIGN_CLOSED', 409);
  }

  // Everything is checked before the first write.
  const availability = campaign.availability === 'IN_STOCK' ? 'IN_STOCK' : 'INCOMING';
  if (input.timing !== undefined && !TIMING_OPTIONS[availability].includes(input.timing)) {
    throw invalid('Unknown timing for this campaign');
  }
  if (input.option != null && !product.options.includes(input.option)) {
    throw invalid('Unknown option');
  }
  if (input.optionQuantities !== undefined) {
    if (input.optionQuantities.some((e) => !product.options.includes(e.option))) {
      throw invalid('Unknown option');
    }
    if (splitTotal(input.optionQuantities) > MAX_QUANTITY) throw invalid('Too many pieces');
  }
  if (input.zoneId != null) {
    const zone = campaign.deliveryEnabled
      ? await db.deliveryZone.findFirst({
          where: { id: input.zoneId, organizationId: org.id },
          select: { id: true },
        })
      : null;
    if (!zone) throw invalid('Unknown delivery zone');
  }
  if (input.fulfillment === 'DELIVERY' && !campaign.deliveryEnabled) {
    throw invalid('This campaign does not deliver');
  }
  if (input.fulfillment === 'SHIPPING' && !campaign.shippingEnabled) {
    throw invalid('This campaign does not ship');
  }
  if (input.deliveryPlace != null && !campaign.deliveryEnabled && !campaign.shippingEnabled) {
    throw invalid('This campaign does not deliver');
  }
  let phoneE164: string | null = null;
  if (input.phone !== undefined) {
    // A respondent abroad says their country; an older popup does not, and gets the shop's.
    const country = input.phoneCountry
      ? (input.phoneCountry as CountryCode)
      : shopCountry(org.country);
    phoneE164 = normalizePhone(input.phone, country);
    if (!phoneE164) throw new ResponseWriteError('INVALID_PHONE', 422);
  }

  let row: Response | null;
  if (input.token !== null) {
    const claims = await verifyResponseToken(input.token);
    if (!claims || claims.deviceId !== input.deviceId) {
      throw new ResponseWriteError('INVALID_RESPONSE_TOKEN', 401);
    }
    row = await db.response.findFirst({
      where: { id: claims.responseId, campaignId: campaign.id },
    });
    if (!row) throw new ResponseWriteError('INVALID_RESPONSE_TOKEN', 401);
  } else {
    row = await db.response.findUnique({
      where: { campaignId_deviceId: { campaignId: campaign.id, deviceId: input.deviceId } },
    });
    // A finished answer changes only with the token handed out with it.
    if (row?.completedAt) throw new ResponseWriteError('INVALID_RESPONSE_TOKEN', 401);
    // Past the month's ceiling without a pass, no new answer starts; one begun stays open.
    if (!row && (await answersClosed(db, org.id, now))) {
      throw new ResponseWriteError('ANSWERS_CLOSED', 409);
    }
  }

  // Offers (2026-11-18): a reseller's, checked against the product and frozen.
  let picks: OfferPick[] | null = null;
  if (input.offerPicks !== undefined) {
    if ((input.buyerType ?? row?.buyerType) !== 'RESELLER')
      throw invalid('Offers are for resellers');
    const frozen = freezePicks(offersOf(product), product.unitPrice, input.offerPicks);
    if (!frozen.ok) throw invalid(frozen.message);
    picks = frozen.picks;
  }
  const dropsPicks = input.quantity !== undefined || input.buyerType === 'CONSUMER';
  const activePicks = picks ?? (dropsPicks ? null : readPicks(row?.offerPicks));
  const pieces = activePicks ? picksTotal(activePicks).pieces : null;
  if (
    input.optionQuantities !== undefined &&
    pieces !== null &&
    splitTotal(input.optionQuantities) !== pieces
  ) {
    throw invalid('The split must add up to the offers');
  }
  const savedSplit = row ? optionSplit(row) : [];
  const keepSplit =
    picks !== null && row?.optionQuantities != null && splitTotal(savedSplit) === pieces;

  // In stock, never more than what is left (paid orders taken off).
  const split = input.optionQuantities ?? (keepSplit ? savedSplit : null);
  const wanted = split ? splitTotal(split) : picks ? pieces : (input.quantity ?? null);
  if (wanted !== null) {
    const stock = await campaignStock(db, campaign);
    for (const e of split ?? []) {
      const left = stock.byOption?.[e.option];
      if (left !== undefined && e.quantity > left) {
        throw new ResponseWriteError(
          'STOCK_EXCEEDED',
          409,
          `Il n'en reste que ${left} en ${e.option}.`,
        );
      }
    }
    if (stock.total !== null && wanted > stock.total) {
      throw new ResponseWriteError('STOCK_EXCEEDED', 409, `Il n'en reste que ${stock.total}.`);
    }
  }

  // Shipping needs the city and country, sent now or before.
  if (input.fulfillment === 'SHIPPING' && !(input.deliveryPlace ?? row?.deliveryPlace)) {
    throw invalid('Shipping needs a place');
  }

  const answers = answerData(input, picks, keepSplit);
  row = row
    ? await db.response.update({ where: { id: row.id }, data: answers })
    : await db.response.create({
        data: {
          campaignId: campaign.id,
          organizationId: org.id,
          linkId: link.id,
          deviceId: input.deviceId,
          ...answers,
        },
      });

  let respondent: UpsertResult['respondent'] = null;
  let contactShared = false;
  let firstCompletion = false;
  if (phoneE164 !== null && input.firstName !== undefined) {
    if (!isComplete(row, campaign.deliveryEnabled || campaign.shippingEnabled)) {
      throw invalid('Incomplete answer');
    }
    const person = await db.respondent.upsert({
      where: { organizationId_phoneE164: { organizationId: org.id, phoneE164 } },
      create: {
        organizationId: org.id,
        phoneE164,
        firstName: input.firstName,
        firstSeenAt: now,
        lastSeenAt: now,
        contactConsentAt: input.contactConsent === true ? now : null,
      },
      // An unticked box leaves an earlier yes: the client takes it back by
      // asking the shop or Tamani (/confidentialite), not by forgetting a tick.
      update: {
        firstName: input.firstName,
        lastSeenAt: now,
        ...(input.contactConsent === true && { contactConsentAt: now }),
      },
    });
    // The same number already answered from another phone: that answer
    // takes this one's choices, and this row goes.
    const other = await db.response.findUnique({
      where: { campaignId_respondentId: { campaignId: campaign.id, respondentId: person.id } },
    });
    if (other && other.id !== row.id) {
      await db.response.delete({ where: { id: row.id } });
      row = await db.response.update({ where: { id: other.id }, data: answersOf(row) });
    }
    firstCompletion = row.completedAt === null;
    const numbers = await recordDeviceNumber(campaign.id, input.deviceId, phoneE164);
    const locked = firstCompletion ? await shouldLockNewCompletion(db, org.id, now) : row.locked;
    row = await db.response.update({
      where: { id: row.id },
      data: {
        respondentId: person.id,
        completedAt: row.completedAt ?? now,
        locked,
        // Counted in the pass at its first completion; a pending one when a pass opens it.
        ...(firstCompletion && !locked && { countedAt: now }),
        suspicious: row.suspicious || numbers >= SUSPICIOUS_NUMBERS,
      },
    });
    respondent = { firstName: input.firstName, phoneE164, phoneMasked: maskPhone(phoneE164) };
    contactShared = person.contactConsentAt != null;
  }

  return {
    responseId: row.id,
    token: await signResponseToken({ responseId: row.id, deviceId: input.deviceId }),
    completed: row.completedAt !== null,
    firstCompletion,
    respondent,
    contactShared,
    interestedCount: campaign.showLiveCounter
      ? await db.response.count({ where: interestedWhere(campaign.id) })
      : null,
  };
}
