'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui';
import { ADMIN_NAV, isAdminLinkActive } from '@/lib/tamani/admin-nav';
import { cn } from '@/lib/utils';

/**
 * The back-office sections: a row of pills on a phone, the sidebar's list
 * from 1024px. The current one is filled in violet.
 */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Support-admin" className="overflow-x-auto lg:overflow-visible">
      <ul className="flex gap-1 lg:flex-col">
        {ADMIN_NAV.map((link) => {
          const active = isAdminLinkActive(link.href, pathname);
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-control px-3 font-bold transition-colors',
                  active
                    ? 'bg-admin text-admin-ink'
                    : 'text-ink-soft hover:bg-admin-soft hover:text-admin',
                )}
              >
                <Icon name={link.icon} className="size-5 shrink-0" />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
