'use client';

import { Button } from '@/components/ui';
import { campaignActions, type CampaignStatus } from '@/lib/tamani/campaign-actions';
import { cn } from '@/lib/utils';

/** The status moves a campaign page offers (the server's transition table). */
export function CampaignActions({
  status,
  busy,
  onMove,
  className,
}: {
  status: CampaignStatus;
  busy: boolean;
  onMove: (to: CampaignStatus) => void;
  className?: string | undefined;
}) {
  const actions = campaignActions(status);
  if (actions.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {actions.map((a) => (
        <Button
          key={a.to}
          // Launching a draft is the one forward move; the others are secondary.
          variant={status === 'DRAFT' && a.to === 'ACTIVE' ? 'primary' : 'secondary'}
          disabled={busy}
          onClick={() => onMove(a.to)}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}
