import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui';
import {
  FEED_DAYS,
  FEED_FILTERS,
  feedHref,
  type FeedFilter,
  type FeedItem,
  type FeedType,
} from '@/lib/tamani/admin-feed';
import { journalWhen } from '@/lib/tamani/admin-journal';
import { cn } from '@/lib/utils';
import { FeedSeen } from './FeedSeen';

const ICONS: Record<FeedType, IconName> = {
  SIGNUP: 'user',
  SHOP: 'home',
  PAYMENT: 'receipt',
  PAYMENT_FAILED: 'clock',
};

/** /support-admin/notifications (lot 13a): the feed, newest first, by filter. */
export function FeedView({
  items,
  next,
  type,
}: {
  items: FeedItem[];
  next: Date | null;
  type: FeedFilter;
}) {
  return (
    <div className="space-y-6">
      <FeedSeen />
      <header>
        <h1 className="text-2xl font-bold text-ink">Notifications</h1>
        <p className="text-ink-soft">
          Les inscriptions, les boutiques et les paiements des {FEED_DAYS} derniers jours.
        </p>
      </header>

      <nav aria-label="Filtrer les notifications">
        <ul className="flex flex-wrap gap-2">
          {FEED_FILTERS.map((f) => {
            const current = f.key === type;
            return (
              <li key={f.key}>
                <Link
                  href={feedHref({ type: f.key, before: null })}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-11 items-center rounded-control px-4 font-bold',
                    current ? 'bg-admin text-admin-ink' : 'frame bg-surface text-ink',
                  )}
                >
                  {f.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {items.length === 0 ? (
        <p className="text-ink-soft">Rien de nouveau sur les {FEED_DAYS} derniers jours.</p>
      ) : (
        <ol className="admin-card divide-y divide-grid">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex min-h-14 items-start gap-3 p-4 hover:bg-admin-soft"
              >
                <span
                  className={cn(
                    'mt-0.5 grid size-9 shrink-0 place-items-center rounded-full',
                    item.type === 'PAYMENT_FAILED'
                      ? 'bg-grid text-ink-soft'
                      : 'bg-admin-soft text-admin',
                  )}
                >
                  <Icon name={ICONS[item.type]} className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-ink">{item.title}</span>
                  <span className="block break-words text-ink-soft">{item.detail}</span>
                </span>
                <time
                  dateTime={item.at.toISOString()}
                  className="shrink-0 text-right text-sm text-ink-soft"
                >
                  {journalWhen(item.at.toISOString())}
                </time>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {next && (
        <Link
          href={feedHref({ type, before: next })}
          className="inline-flex min-h-11 items-center font-bold text-primary underline"
        >
          Voir plus
        </Link>
      )}
    </div>
  );
}
