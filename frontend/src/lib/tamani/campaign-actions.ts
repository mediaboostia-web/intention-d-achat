// Status words and the buttons a campaign page offers. Mirrors the server
// transition table (lib/server/tamani/campaign-status.ts, server only);
// a test checks every button is a move the server accepts.

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARRIVED';

export const CAMPAIGN_STATUS_LABELS: Readonly<Record<CampaignStatus, string>> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'En cours',
  CLOSED: 'Terminée',
  ARRIVED: 'Arrivée',
};

const ACTIONS: Readonly<
  Record<CampaignStatus, ReadonlyArray<{ to: CampaignStatus; label: string }>>
> = {
  DRAFT: [{ to: 'ACTIVE', label: 'Lancer' }],
  ACTIVE: [
    { to: 'CLOSED', label: 'Terminer' },
    { to: 'ARRIVED', label: 'Produit arrivé' },
  ],
  CLOSED: [
    { to: 'ACTIVE', label: 'Rouvrir' },
    { to: 'ARRIVED', label: 'Produit arrivé' },
  ],
  ARRIVED: [{ to: 'CLOSED', label: 'Terminer' }],
};

export function campaignActions(
  status: CampaignStatus,
): ReadonlyArray<{ to: CampaignStatus; label: string }> {
  return ACTIONS[status];
}
