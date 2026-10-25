import { describe, it, expect } from 'vitest';
import { canTransitionCampaign } from '@/lib/server/tamani/campaign-status';
import { CAMPAIGN_STATUS_LABELS, campaignActions, type CampaignStatus } from './campaign-actions';

const STATUSES: CampaignStatus[] = ['DRAFT', 'ACTIVE', 'CLOSED', 'ARRIVED'];

describe('campaign actions', () => {
  it('labels statuses and actions in French', () => {
    expect(CAMPAIGN_STATUS_LABELS).toEqual({
      DRAFT: 'Brouillon',
      ACTIVE: 'En cours',
      CLOSED: 'Terminée',
      ARRIVED: 'Arrivée',
    });
    expect(campaignActions('DRAFT')).toEqual([{ to: 'ACTIVE', label: 'Lancer' }]);
    expect(campaignActions('ACTIVE')).toEqual([
      { to: 'CLOSED', label: 'Terminer' },
      { to: 'ARRIVED', label: 'Produit arrivé' },
    ]);
    expect(campaignActions('CLOSED')).toEqual([
      { to: 'ACTIVE', label: 'Rouvrir' },
      { to: 'ARRIVED', label: 'Produit arrivé' },
    ]);
    expect(campaignActions('ARRIVED')).toEqual([{ to: 'CLOSED', label: 'Terminer' }]);
  });

  it('campaign actions follow the server transitions', () => {
    for (const from of STATUSES) {
      for (const a of campaignActions(from)) {
        expect(canTransitionCampaign(from, a.to), `${from} → ${a.to}`).toBe(true);
      }
    }
  });
});
