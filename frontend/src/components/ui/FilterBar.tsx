import { cn } from '@/lib/utils';

/** Horizontally scrolling filter chips; each chip is a link (URL-synced filters). */
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
  }>;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn('overflow-x-auto [scrollbar-width:none]', className)}>
      <ul className="flex w-max gap-2 py-1">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={item.href}
              aria-current={item.active ? 'true' : undefined}
              className={cn(
                'frame inline-flex min-h-12 items-center gap-1.5 rounded-control px-3.5 text-sm font-bold whitespace-nowrap',
                item.active ? 'bg-accent text-accent-ink' : 'bg-surface text-ink',
              )}
            >
              {item.label}
              {item.count !== undefined && (
                <span className="font-normal text-ink-soft">{item.count}</span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
