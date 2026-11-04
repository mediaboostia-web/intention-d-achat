'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui';
import { ADMIN_NAV, isAdminLinkActive } from '@/lib/tamani/admin-nav';
import { cn } from '@/lib/utils';

/**
 * The back-office sections: four tabs (icon over label) on a phone, the
 * sidebar's list from 1024px. The current one is filled in violet.
 */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Support-admin">
      <ul className="grid grid-cols-4 gap-1 lg:flex lg:flex-col">
        {ADMIN_NAV.map((link) => {
          const active = isAdminLinkActive(link.href, pathname);
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
