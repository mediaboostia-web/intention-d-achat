// Tells the shop about each completed answer (porteur's feedback §2): one
// bell notification per member, then a Web Push to the browsers they
// enabled. Runs in after(), past the respondent's reply, so it never throws.
// Never a first name or a number: a phone is read over a shoulder.
import 'server-only';
import type { PrismaClient } from '@prisma/client';
import {
  NOT_INTERESTED_REASON_LABELS,
  type BuyerType,
  type NotInterestedReason,
} from '@/lib/tamani/labels';
import { pluralizeUnit } from '@/lib/tamani/verdict-display';
import { createNotification } from '@/lib/server/notifications';
import { log } from '@/lib/server/observability/log';
import { pushConfigured, sendPush } from '@/lib/server/push/web-push';
import { interestedWhere } from './public-campaign';

export interface ResponseNotificationInput {
  campaignTitle: string;
  unitLabel: string;
  interested: boolean;
  buyerType: BuyerType | null;
  quantity: number | null;
  reason: NotInterestedReason | null;
  interestedTotal: number;
  locked: boolean;
}

export function responseNotificationText(r: ResponseNotificationInput): {
  title: string;
  body: string;
} {
  const title = `Nouvelle réponse · ${r.campaignTitle}`;
  if (r.locked) {
    return {
      title,
      body: "Une nouvelle réponse t'attend. Ton forfait du mois est plein : passe à Pro pour la voir.",
    };
  }
  if (!r.interested) {
    const reason = r.reason ? ` : ${NOT_INTERESTED_REASON_LABELS[r.reason].toLowerCase()}` : '';
    return { title, body: `Une personne n'est pas intéressée${reason}.` };
  }
  const qty = r.quantity ?? 1;
  const use = r.buyerType === 'RESELLER' ? 'pour revendre' : 'pour son usage';
  const total = `${r.interestedTotal} intéressé${r.interestedTotal > 1 ? 's' : ''} au total.`;
  return {
    title,
    body: `Quelqu'un en veut ${qty} ${pluralizeUnit(r.unitLabel, qty)} (${use}). ${total}`,
  };
}

export async function notifyShopOfResponse(db: PrismaClient, responseId: string): Promise<void> {
  try {
    const response = await db.response.findUnique({
      where: { id: responseId },
      include: { campaign: { include: { product: { select: { unitLabel: true } } } } },
    });
    if (!response?.completedAt) return;
    const { campaign } = response;
    const [members, interestedTotal] = await Promise.all([
      db.organizationMember.findMany({
        where: { organizationId: response.organizationId },
        select: { userId: true },
      }),
      db.response.count({ where: { ...interestedWhere(campaign.id), locked: false } }),
    ]);
    const { title, body } = responseNotificationText({
      campaignTitle: campaign.title,
      unitLabel: campaign.product.unitLabel,
      interested: response.interested === true,
      buyerType: response.buyerType as BuyerType | null,
      quantity: response.quantity,
      reason: response.notInterestedReason as NotInterestedReason | null,
      interestedTotal,
      locked: response.locked,
    });
    const url = `/app/campagnes/${campaign.id}`;

    const notified: string[] = [];
    for (const { userId } of members) {
      const created = await createNotification(db, {
        userId,
        type: 'tamani.response',
        title,
        body,
        data: { campaignId: campaign.id, responseId, url },
        dedupeKey: `tamani.response:${responseId}:${userId}`,
      });
      // null: already notified for this answer (a retried completion).
      if (created) notified.push(userId);
    }
    if (notified.length === 0 || !pushConfigured()) return;

    const subscriptions = await db.pushSubscription.findMany({
      where: { userId: { in: notified } },
    });
    await Promise.all(
      subscriptions.map(async (sub) => {
        // One notification per campaign on the phone, replaced by the next.
        const result = await sendPush(sub, { title, body, url, tag: `campaign:${campaign.id}` });
        if (result === 'GONE') {
          await db.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
        }
      }),
    );
  } catch {
    log.warn('response notification failed', { responseId });
  }
}
