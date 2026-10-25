import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Page tabs as links (the tab lives in the URL); the active one is the yellow tab. */
export function Tabs({
  label,
  items,
  className,
}: {
  label: string;
  items: ReadonlyArray<{ id: string; label: string; href: string; active?: boolean }>;
  className?: string | undefined;
}) {
  return (
    <nav aria-label={label} className={cn('overflow-x-auto [scrollbar-width:none]', className)}>
      <ul className="flex w-max gap-2 py-1">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              className={cn(
                'frame inline-flex min-h-12 items-center rounded-control px-4 font-bold whitespace-nowrap',
                item.active ? 'bg-accent text-accent-ink' : 'bg-surface text-ink',
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
