// A respondent's answer, saved at every tap (spec §5.3). One response per
// device and per campaign while it is incomplete; the WhatsApp number at the
// last step completes it, puts the person in the shop's client book, and
// folds a second phone into the answer that number already gave.
import 'server-only';
import type { Response } from '@prisma/client';
import { TIMING_OPTIONS } from '@/lib/tamani/timing';
import { isAcceptingResponses } from './campaign-status';
import type { TamaniErrorCode } from './errors';
import { compact, type ResponseStepInput } from './inputs';
import type { Db } from './locks';
import { maskPhone, normalizePhone, shopCountry } from './phone';
import { interestedWhere } from './public-campaign';
import { recordDeviceNumber } from './public-limits';
import { shouldLockNewCompletion } from './quota';
import { signResponseToken, verifyResponseToken } from './response-token';

const SUSPICIOUS_NUMBERS = 3;

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
>;

const invalid = (message: string) => new ResponseWriteError('VALIDATION_FAILED', 400, message);

/** The fields this step sends; a "no" empties the yes-only ones. */
function answerData(input: ResponseStepInput): Partial<AnswerFields> {
  const data: Partial<AnswerFields> = compact({
    interested: input.interested,
    notInterestedReason: input.notInterestedReason,
    buyerType: input.buyerType,
    quantity: input.quantity,
    option: input.option,
    timing: input.timing,
    wantsDelivery: input.wantsDelivery,
    zoneId: input.zoneId,
  });
  if (input.interested === true) data.notInterestedReason = null;
  if (input.interested === false) {
    Object.assign(data, {
      buyerType: null,
      quantity: null,
      option: null,
      timing: null,
      wantsDelivery: null,
      zoneId: null,
    });
  }
  if (input.wantsDelivery === false) data.zoneId = null;
  return data;
}

function answersOf(r: Response): AnswerFields {
  return {
    interested: r.interested,
    notInterestedReason: r.notInterestedReason,
    buyerType: r.buyerType,
    quantity: r.quantity,
    option: r.option,
    timing: r.timing,
    wantsDelivery: r.wantsDelivery,
    zoneId: r.zoneId,
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
  if (input.zoneId != null) {
    const zone = campaign.deliveryEnabled
      ? await db.deliveryZone.findFirst({
          where: { id: input.zoneId, organizationId: org.id },
          select: { id: true },
        })
      : null;
    if (!zone) throw invalid('Unknown delivery zone');
  }
  let phoneE164: string | null = null;
  if (input.phone !== undefined) {
    phoneE164 = normalizePhone(input.phone, shopCountry(org.country));
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
  }

  const answers = answerData(input);
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
  let firstCompletion = false;
  if (phoneE164 !== null && input.firstName !== undefined) {
    if (!isComplete(row, campaign.deliveryEnabled)) throw invalid('Incomplete answer');
    const person = await db.respondent.upsert({
      where: { organizationId_phoneE164: { organizationId: org.id, phoneE164 } },
      create: {
        organizationId: org.id,
        phoneE164,
        firstName: input.firstName,
        firstSeenAt: now,
        lastSeenAt: now,
      },
      update: { firstName: input.firstName, lastSeenAt: now },
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
    row = await db.response.update({
      where: { id: row.id },
      data: {
        respondentId: person.id,
        completedAt: row.completedAt ?? now,
        locked: firstCompletion ? await shouldLockNewCompletion(db, org.id, now) : row.locked,
        suspicious: row.suspicious || numbers >= SUSPICIOUS_NUMBERS,
      },
    });
    respondent = { firstName: input.firstName, phoneE164, phoneMasked: maskPhone(phoneE164) };
  }

  return {
    responseId: row.id,
    token: await signResponseToken({ responseId: row.id, deviceId: input.deviceId }),
    completed: row.completedAt !== null,
    firstCompletion,
    respondent,
    interestedCount: campaign.showLiveCounter
      ? await db.response.count({ where: interestedWhere(campaign.id) })
      : null,
  };
}
