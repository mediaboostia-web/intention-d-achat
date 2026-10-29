import { describe, it, expect } from 'vitest';
import {
  activeCampaignWhere,
  canTransitionCampaign,
  effectiveStatus,
  effectiveStatusWhere,
  finishedCampaignWhere,
  isAcceptingResponses,
  isFinished,
  type CampaignStatus,
} from './campaign-status';

const now = new Date('2026-10-24T10:00:00Z');
const past = new Date('2026-10-23T10:00:00Z');
const future = new Date('2026-10-25T10:00:00Z');
const c = (status: string, endsAt: Date | null = null) => ({ status, endsAt });

describe('effectiveStatus', () => {
  it('closes an ACTIVE campaign once endsAt is reached', () => {
    expect(effectiveStatus(c('ACTIVE', past), now)).toBe('CLOSED');
    expect(effectiveStatus(c('ACTIVE', now), now)).toBe('CLOSED');
    expect(effectiveStatus(c('ACTIVE', future), now)).toBe('ACTIVE');
    expect(effectiveStatus(c('ACTIVE'), now)).toBe('ACTIVE');
  });

  it('keeps the other statuses, and reads an unknown one as DRAFT', () => {
    expect(effectiveStatus(c('ARRIVED', past), now)).toBe('ARRIVED');
    expect(effectiveStatus(c('CLOSED'), now)).toBe('CLOSED');
    expect(effectiveStatus(c('DRAFT', past), now)).toBe('DRAFT');
    expect(effectiveStatus(c('BOGUS'), now)).toBe('DRAFT');
  });
});

describe('isAcceptingResponses / isFinished', () => {
  it.each([
    ['DRAFT', false, false],
    ['ACTIVE', true, false],
    ['CLOSED', false, true],
    ['ARRIVED', true, true],
  ] as const)('%s → accepting %s, finished %s', (status, accepting, finished) => {
    expect(isAcceptingResponses(c(status), now)).toBe(accepting);
    expect(isFinished(c(status), now)).toBe(finished);
  });

  it('an expired ACTIVE campaign is finished and closed to responses', () => {
    expect(isAcceptingResponses(c('ACTIVE', past), now)).toBe(false);
    expect(isFinished(c('ACTIVE', past), now)).toBe(true);
  });
});

describe('canTransitionCampaign', () => {
  const allowed: Array<[CampaignStatus, CampaignStatus]> = [
    ['DRAFT', 'ACTIVE'],
    ['ACTIVE', 'CLOSED'],
    ['ACTIVE', 'ARRIVED'],
    ['CLOSED', 'ACTIVE'],
    ['CLOSED', 'ARRIVED'],
    ['ARRIVED', 'CLOSED'],
  ];
  it.each(allowed)('%s → %s is allowed', (from, to) => {
    expect(canTransitionCampaign(from, to)).toBe(true);
  });

  it.each([
    ['DRAFT', 'ARRIVED'],
    ['ARRIVED', 'ACTIVE'],
    ['CLOSED', 'DRAFT'],
    ['ACTIVE', 'DRAFT'],
  ] as Array<[CampaignStatus, CampaignStatus]>)('%s → %s is refused', (from, to) => {
    expect(canTransitionCampaign(from, to)).toBe(false);
  });
});

describe('where fragments', () => {
  it('activeCampaignWhere matches ACTIVE campaigns not past their end', () => {
    expect(activeCampaignWhere(now)).toEqual({
      status: 'ACTIVE',
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    });
  });

  it('effectiveStatusWhere mirrors effectiveStatus', () => {
    expect(effectiveStatusWhere('ACTIVE', now)).toEqual(activeCampaignWhere(now));
    expect(effectiveStatusWhere('CLOSED', now)).toEqual({
      OR: [{ status: 'CLOSED' }, { status: 'ACTIVE', endsAt: { lte: now } }],
    });
    expect(effectiveStatusWhere('DRAFT', now)).toEqual({ status: 'DRAFT' });
    expect(effectiveStatusWhere('ARRIVED', now)).toEqual({ status: 'ARRIVED' });
  });

  it('finishedCampaignWhere mirrors isFinished: CLOSED, expired or ARRIVED', () => {
    expect(finishedCampaignWhere(now)).toEqual({
      OR: [effectiveStatusWhere('CLOSED', now), effectiveStatusWhere('ARRIVED', now)],
    });
  });
});
