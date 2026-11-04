'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_NAV, isAdminLinkActive } from '@/lib/tamani/admin-nav';
import { cn } from '@/lib/utils';

/** The back-office sections; the current one is underlined in yellow. */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Support-admin" className="overflow-x-auto">
      <ul className="flex gap-1">
        {ADMIN_NAV.map((link) => {
          const active = isAdminLinkActive(link.href, pathname);
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center border-b-4 px-3 font-bold',
                  active ? 'border-accent' : 'border-transparent opacity-80 hover:opacity-100',
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
