// The effective status of a campaign is computed at read time: an ACTIVE
// campaign whose end date has passed reads CLOSED, with no cron (spec §6.2).
import 'server-only';
import type { Prisma } from '@prisma/client';

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARRIVED';

const STATUSES: readonly string[] = ['DRAFT', 'ACTIVE', 'CLOSED', 'ARRIVED'];

type StatusSource = { status: string; endsAt: Date | null };

/** An unknown stored status reads DRAFT: closed to responses. */
export function effectiveStatus(c: StatusSource, now: Date): CampaignStatus {
  if (!STATUSES.includes(c.status)) return 'DRAFT';
  if (c.status === 'ACTIVE' && c.endsAt !== null && c.endsAt <= now) return 'CLOSED';
  return c.status as CampaignStatus;
}

export function isAcceptingResponses(c: StatusSource, now: Date): boolean {
  const s = effectiveStatus(c, now);
  return s === 'ACTIVE' || s === 'ARRIVED';
}

export function isFinished(c: StatusSource, now: Date): boolean {
  const s = effectiveStatus(c, now);
  return s === 'CLOSED' || s === 'ARRIVED';
}

/** Moves a wholesaler may make, from the effective status. */
export const CAMPAIGN_TRANSITIONS: Readonly<Record<CampaignStatus, readonly CampaignStatus[]>> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['CLOSED', 'ARRIVED'],
  CLOSED: ['ACTIVE', 'ARRIVED'],
  ARRIVED: ['CLOSED'],
};

export function canTransitionCampaign(from: CampaignStatus, to: CampaignStatus): boolean {
  return CAMPAIGN_TRANSITIONS[from].includes(to);
}

/** Campaigns whose effective status is ACTIVE (the FREE plan counts these). */
export function activeCampaignWhere(now: Date): Prisma.CampaignWhereInput {
  return { status: 'ACTIVE', OR: [{ endsAt: null }, { endsAt: { gt: now } }] };
}

export function effectiveStatusWhere(status: CampaignStatus, now: Date): Prisma.CampaignWhereInput {
  switch (status) {
    case 'ACTIVE':
      return activeCampaignWhere(now);
    case 'CLOSED':
      return { OR: [{ status: 'CLOSED' }, { status: 'ACTIVE', endsAt: { lte: now } }] };
    default:
      return { status };
  }
}
