import Link from 'next/link';
import { APP_NAV, DESKTOP_EXTRA_NAV, isNavActive } from '@/lib/tamani/nav';
import { cn } from '@/lib/utils';
import { Icon } from './icons';
import { Logo } from './Logo';

// Client-side links: the shop stays loaded from one page to the next.

/** The phone's bottom bar: five entries, the current one on the yellow tab. */
export function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Menu principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t-[2.5px] border-ink bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-xl">
        {APP_NAV.map((item) => {
          const active = isNavActive(item.href, pathname);
          return (
            // Sized by content, not fifths: "Commandes" (70px) fits a 320px phone.
            <li key={item.id} className="min-w-0 flex-auto">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold text-ink"
              >
                <span
                  className={cn(
                    'flex h-8 w-12 items-center justify-center rounded-control border-2',
                    active ? 'border-ink bg-accent text-accent-ink' : 'border-transparent',
                  )}
                >
                  <Icon name={item.icon} className="size-[22px]" />
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The desktop sidebar: the shop's name at the top, every section below. */
export function SideNav({ pathname, shopName }: { pathname: string; shopName: string }) {
  const items = [...APP_NAV.filter((item) => item.id !== 'more'), ...DESKTOP_EXTRA_NAV];
  return (
    <nav
      aria-label="Menu principal"
      className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r-[2.5px] border-ink bg-surface px-4 py-6 lg:flex"
    >
      <Link href="/app" className="flex flex-col gap-2 rounded-control px-2 pb-6">
        <Logo size={30} />
        <span className="font-hand text-xl leading-snug font-bold break-words text-primary">
          {shopName}
        </span>
      </Link>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => {
          const active = isNavActive(item.href, pathname);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-12 items-center gap-3 rounded-control border-2 px-3 font-bold',
                  active
                    ? 'border-ink bg-accent text-accent-ink'
                    : 'border-transparent text-ink hover:border-grid',
                )}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
