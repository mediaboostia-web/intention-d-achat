// The pass's two banners above every shop page (lot 8): the grace that runs
// out, then the answers waiting for a pass. Nothing when all is well.
import { Button, Notice } from '@/components/ui';
import { graceDaysLeft, graceLine, pendingLine } from '@/lib/tamani/billing-view';
import type { Shop } from './shop-context';

export function ShellBanners({
  plan,
  pending,
  now,
}: {
  plan: Shop['plan'];
  pending: number;
  now: Date;
}) {
  const days = plan.inGrace ? graceDaysLeft(plan.endsAt, now) : 0;
  const waiting = pendingLine(pending);
  if (days === 0 && !waiting) return null;
  const action = (
    <Button href="/app/abonnement" variant="secondary">
      Prendre un pass
    </Button>
  );
  return (
    <div className="mb-6 flex flex-col gap-3">
      {days > 0 && (
        <Notice tone="warning" action={action}>
          {graceLine(days)}
        </Notice>
      )}
      {waiting && (
        <Notice tone="info" action={days > 0 ? undefined : action}>
          {waiting}
        </Notice>
      )}
    </div>
  );
}
