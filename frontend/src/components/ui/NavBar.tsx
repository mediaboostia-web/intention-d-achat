import Link from 'next/link';
import { APP_NAV, DESKTOP_EXTRA_NAV, isNavActive, type NavItem } from '@/lib/tamani/nav';
import { cn } from '@/lib/utils';
import { Avatar } from './Avatar';
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
          // Products and settings live behind "Plus" on a phone.
          const active =
            isNavActive(item.href, pathname) ||
            (item.id === 'more' && DESKTOP_EXTRA_NAV.some((x) => isNavActive(x.href, pathname)));
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

/**
 * The desktop sidebar, drawn as the notebook's cover: the shop's card at
 * the top, every section below, this month's responses against the quota
 * at the foot.
 */
export function SideNav({
  pathname,
  shop,
  usage,
  upgrade,
}: {
  pathname: string;
  shop: { name: string; logoUrl: string | null; planLabel: string };
  usage: { used: number; limit: number };
  /** Free plan: offer the upgrade under the quota. */
  upgrade: boolean;
}) {
  const items = [...APP_NAV.filter((item) => item.id !== 'more'), ...DESKTOP_EXTRA_NAV];
  const filled = usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  return (
    <nav
      aria-label="Menu principal"
      className="bg-cover sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r-[2.5px] border-ink px-4 py-6 text-deep-ink lg:flex"
    >
      <Link href="/app" className="self-start rounded-control px-2 focus-visible:outline-accent">
        <Logo tone="inverse" size={30} />
      </Link>
      <div className="mt-6 flex items-center gap-3 rounded-card bg-deep-ink/10 p-3">
        <Avatar name={shop.name} src={shop.logoUrl} />
        <div className="min-w-0">
          <p className="font-hand text-lg leading-snug font-bold break-words">{shop.name}</p>
          <p className="text-sm">Forfait {shop.planLabel}</p>
        </div>
      </div>
      <ul className="mt-6 flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <SideLink item={item} pathname={pathname} />
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-3 pt-6">
        <div className="rounded-card bg-deep-ink/10 p-3">
          <p className="text-sm">
            <span className="font-bold">
              {usage.used} / {usage.limit}
            </span>{' '}
            réponses ce mois
          </p>
          <div
            role="meter"
            aria-label="Réponses du mois"
            aria-valuemin={0}
            aria-valuemax={usage.limit}
            aria-valuenow={usage.used}
            className="mt-2 h-2 overflow-hidden rounded-full bg-deep-ink/20"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${filled}%` }} />
          </div>
          {upgrade && (
            <Link
              href="/app/plus#forfait"
              className="mt-3 inline-flex min-h-12 items-center font-bold text-accent underline decoration-2 underline-offset-4 focus-visible:outline-accent"
            >
              Passer au Pro
            </Link>
          )}
        </div>
        {/* The phone's "Plus" page: plan and sign-out. */}
        <SideLink item={ACCOUNT} pathname={pathname} />
      </div>
    </nav>
  );
}

const ACCOUNT: NavItem = {
  id: 'account',
  label: 'Compte et forfait',
  href: '/app/plus',
  icon: 'more',
};

function SideLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isNavActive(item.href, pathname);
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-12 items-center gap-3 rounded-control border-2 px-3 font-bold focus-visible:outline-accent',
        'transition-colors motion-reduce:transition-none',
        active
          ? 'border-ink bg-accent text-accent-ink'
          : 'border-transparent text-deep-ink hover:bg-deep-ink/10',
      )}
    >
      <Icon name={item.icon} />
      {item.label}
    </Link>
  );
}
