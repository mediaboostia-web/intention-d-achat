'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui';
import { FEED_HOME, FEED_UNREAD_CAP, unreadLabel } from '@/lib/tamani/admin-feed';
import { ADMIN_NAV, isAdminLinkActive } from '@/lib/tamani/admin-nav';
import { cn } from '@/lib/utils';

/**
 * The back-office sections: tabs (icon over label) on a phone, three to a
 * row, the sidebar's list from 1024px. The current one is filled in violet.
 * Notifications carries the count of what is new for this admin (lot 13a).
 */
export function AdminNav({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Support-admin">
      <ul className="grid grid-cols-3 gap-1 sm:grid-cols-6 lg:flex lg:flex-col">
        {ADMIN_NAV.map((link) => {
          const active = isAdminLinkActive(link.href, pathname);
          const badge = link.href === FEED_HOME && unread > 0;
          return (
            <li key={link.href} className="min-w-0">
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-control px-1 py-2 text-center text-xs leading-tight font-bold transition-colors',
                  'lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-0 lg:text-left lg:text-base',
                  active
                    ? 'bg-admin text-admin-ink'
                    : 'text-ink-soft hover:bg-admin-soft hover:text-admin',
                )}
              >
                <span className="relative">
                  <Icon name={link.icon} className="size-5 shrink-0" />
                  {badge && (
                    <span
                      data-unread={unread}
                      aria-hidden="true"
                      className="absolute -top-2 -right-3 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] leading-none font-bold text-surface lg:hidden"
                    >
                      {unread >= FEED_UNREAD_CAP ? `${FEED_UNREAD_CAP}+` : unread}
                    </span>
                  )}
                </span>
                <span className="lg:flex-1">{link.label}</span>
                {badge && (
                  <span
                    aria-hidden="true"
                    className="hidden h-6 min-w-6 place-items-center rounded-full bg-danger px-1.5 text-xs font-bold text-surface lg:grid"
                  >
                    {unread >= FEED_UNREAD_CAP ? `${FEED_UNREAD_CAP}+` : unread}
                  </span>
                )}
                {badge && <span className="sr-only">, {unreadLabel(unread)}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
