// Status words and the buttons a campaign page offers. Mirrors the server
// transition table (lib/server/tamani/campaign-status.ts, server only);
// a test checks every button is a move the server accepts. Each button
// names what happens (lot 6b): the forward move is primary, the others
// quiet, and a product already in stock never "arrives".
import type { Availability } from './timing';

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARRIVED';

export const CAMPAIGN_STATUS_LABELS: Readonly<Record<CampaignStatus, string>> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'En cours',
  CLOSED: 'Terminée',
  ARRIVED: 'Arrivée',
};

export interface CampaignAction {
  to: CampaignStatus;
  label: string;
  emphasis: 'primary' | 'quiet';
}

const LAUNCH: CampaignAction = { to: 'ACTIVE', label: 'Lancer la campagne', emphasis: 'primary' };
const ARRIVE: CampaignAction = {
  to: 'ARRIVED',
  label: 'Le produit est arrivé',
  emphasis: 'primary',
};
const CLOSE: CampaignAction = { to: 'CLOSED', label: 'Terminer la campagne', emphasis: 'quiet' };
const REOPEN: CampaignAction = { to: 'ACTIVE', label: 'Rouvrir la campagne', emphasis: 'quiet' };

const ACTIONS: Readonly<Record<CampaignStatus, readonly CampaignAction[]>> = {
  DRAFT: [LAUNCH],
  ACTIVE: [ARRIVE, CLOSE],
  CLOSED: [ARRIVE, REOPEN],
  ARRIVED: [CLOSE],
};

export function campaignActions(
  status: CampaignStatus,
  availability: Availability,
): readonly CampaignAction[] {
  const actions = ACTIONS[status];
  return availability === 'IN_STOCK' ? actions.filter((a) => a.to !== 'ARRIVED') : actions;
}
