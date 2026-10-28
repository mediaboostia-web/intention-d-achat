import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Page tabs as links (the tab lives in the URL): a tab bar, text underlined
 * in yellow for the open tab, so it never reads like a row of buttons
 * (lot 6b). Four tabs share a phone's width; more scroll.
 */
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
    <nav
      aria-label={label}
      className={cn('overflow-x-auto border-b-2 border-grid [scrollbar-width:none]', className)}
    >
      <ul className="flex min-w-full">
        {items.map((item) => (
          <li key={item.id} className="flex-1">
            <Link
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              className={cn(
                '-mb-0.5 flex min-h-12 items-center justify-center border-b-4 px-2 text-[0.95rem] whitespace-nowrap sm:px-4 sm:text-base',
                item.active
                  ? 'border-accent font-bold text-ink'
                  : 'border-transparent text-ink-soft hover:text-ink',
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
