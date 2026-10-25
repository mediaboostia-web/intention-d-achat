import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Icon, type IconName } from './icons';

/**
 * Horizontally scrolling filter chips, as on WhatsApp; each chip is a link
 * (URL-synced filters). A chip with nothing to show (count 0) is left out
 * unless it is the active one; a chip without a count always shows.
 */
export function FilterBar({
  label,
  items,
  className,
}: {
  label: string;
  items: ReadonlyArray<{
    id: string;
    label: string;
    href: string;
    active?: boolean;
    count?: number;
    icon?: IconName;
  }>;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn('overflow-x-auto [scrollbar-width:none]', className)}>
      <ul className="flex w-max gap-2 py-1">
        {items
          .filter((item) => item.active || item.count !== 0)
          .map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={item.active ? 'true' : undefined}
                className={cn(
                  'frame inline-flex min-h-12 items-center gap-1.5 rounded-full px-4 text-sm font-bold whitespace-nowrap',
                  item.active ? 'bg-accent text-accent-ink' : 'bg-surface text-ink hover:bg-bg',
                )}
              >
                {item.icon && <Icon name={item.icon} className="size-[18px]" />}
                {item.label}
                {item.count !== undefined && (
                  <span className={cn('font-normal', !item.active && 'text-ink-soft')}>
                    {item.count}
                  </span>
                )}
              </Link>
            </li>
          ))}
      </ul>
    </nav>
  );
}
