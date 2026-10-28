import { describe, it, expect } from 'vitest';
import { canTransitionCampaign } from '@/lib/server/tamani/campaign-status';
import { CAMPAIGN_STATUS_LABELS, campaignActions, type CampaignStatus } from './campaign-actions';

const STATUSES: CampaignStatus[] = ['DRAFT', 'ACTIVE', 'CLOSED', 'ARRIVED'];
const AVAILABILITIES = ['INCOMING', 'IN_STOCK'] as const;

describe('campaign actions', () => {
  it('labels statuses and actions in French', () => {
    expect(CAMPAIGN_STATUS_LABELS).toEqual({
      DRAFT: 'Brouillon',
      ACTIVE: 'En cours',
      CLOSED: 'Terminée',
      ARRIVED: 'Arrivée',
    });
    expect(campaignActions('DRAFT', 'INCOMING')).toEqual([
      { to: 'ACTIVE', label: 'Lancer la campagne', emphasis: 'primary' },
    ]);
    expect(campaignActions('ACTIVE', 'INCOMING')).toEqual([
      { to: 'ARRIVED', label: 'Le produit est arrivé', emphasis: 'primary' },
      { to: 'CLOSED', label: 'Terminer la campagne', emphasis: 'quiet' },
    ]);
    expect(campaignActions('CLOSED', 'INCOMING')).toEqual([
      { to: 'ARRIVED', label: 'Le produit est arrivé', emphasis: 'primary' },
      { to: 'ACTIVE', label: 'Rouvrir la campagne', emphasis: 'quiet' },
    ]);
    expect(campaignActions('ARRIVED', 'INCOMING')).toEqual([
      { to: 'CLOSED', label: 'Terminer la campagne', emphasis: 'quiet' },
    ]);
  });

  it('never offers an arrival to a product already in stock', () => {
    expect(campaignActions('ACTIVE', 'IN_STOCK')).toEqual([
      { to: 'CLOSED', label: 'Terminer la campagne', emphasis: 'quiet' },
    ]);
    expect(campaignActions('CLOSED', 'IN_STOCK')).toEqual([
      { to: 'ACTIVE', label: 'Rouvrir la campagne', emphasis: 'quiet' },
    ]);
    for (const from of STATUSES) {
      expect(campaignActions(from, 'IN_STOCK').some((a) => a.to === 'ARRIVED')).toBe(false);
    }
  });

  it('campaign actions follow the server transitions', () => {
    for (const from of STATUSES) {
      for (const availability of AVAILABILITIES) {
        for (const a of campaignActions(from, availability)) {
          expect(canTransitionCampaign(from, a.to), `${from} → ${a.to}`).toBe(true);
        }
      }
    }
  });
});
