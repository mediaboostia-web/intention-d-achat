'use client';

import { Button } from '@/components/ui';
import { campaignActions, type CampaignStatus } from '@/lib/tamani/campaign-actions';
import type { Availability } from '@/lib/tamani/timing';
import { cn } from '@/lib/utils';

/**
 * The status moves a campaign page offers (the server's transition table),
 * each named by what it does: the forward move as a button, the others
 * quiet and underlined, so they never read like the tabs below.
 */
export function CampaignActions({
  status,
  availability,
  busy,
  onMove,
  className,
}: {
  status: CampaignStatus;
  availability: Availability;
  busy: boolean;
  onMove: (to: CampaignStatus) => void;
  className?: string | undefined;
}) {
  const actions = campaignActions(status, availability);
  if (actions.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-3', className)}>
      {actions.map((a) =>
        a.emphasis === 'primary' ? (
          <Button key={a.to} disabled={busy} onClick={() => onMove(a.to)}>
            {a.label}
          </Button>
        ) : (
          <Button
            key={a.to}
            variant="ghost"
            className="underline decoration-2 underline-offset-4"
            disabled={busy}
            onClick={() => onMove(a.to)}
          >
            {a.label}
          </Button>
        ),
      )}
    </div>
  );
}
