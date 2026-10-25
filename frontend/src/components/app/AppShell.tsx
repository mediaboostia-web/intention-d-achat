'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar, BottomNav, Logo, SideNav } from '@/components/ui';
import { PLANS } from '@/lib/tamani/plans';
import { NotificationBell } from './NotificationBell';
import { useShop } from './shop-context';

/**
 * The shop space: sidebar from 1024px, bottom bar below, the page in
 * between. On a phone the top row carries the shop, the bell and the
 * avatar; on a desktop the bell and the avatar sit on the page's title line.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { shop, usage, me } = useShop();
  return (
    <div className="min-h-dvh bg-paper lg:flex">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-3 focus:font-bold focus:text-ink"
      >
        Aller au contenu
      </a>
      <SideNav
        pathname={pathname}
        shop={{ name: shop.name, logoUrl: shop.logoUrl, planLabel: PLANS[shop.plan.id].label }}
        usage={{ used: usage.responsesThisMonth, limit: usage.monthlyLimit }}
        upgrade={shop.plan.id === 'FREE'}
      />
      <div className="relative min-w-0 flex-1">
        <header className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 pt-4 sm:px-6 lg:p-0">
          <Logo variant="mark" size={26} className="lg:hidden" />
          <span className="truncate font-hand text-lg font-bold text-primary lg:hidden">
            {shop.name}
          </span>
          <div className="ml-auto flex items-center gap-2 lg:absolute lg:top-6 lg:right-6 lg:z-10">
            <NotificationBell />
            <Link href="/app/plus" aria-label="Compte et forfait" className="rounded-full">
              <Avatar name={me.name ?? shop.name} src={shop.logoUrl} size="sm" />
            </Link>
          </div>
        </header>
        <main
          id="contenu"
          className="mx-auto w-full max-w-3xl px-4 pt-6 pb-36 sm:px-6 lg:pt-8 lg:pb-12 lg:[--shell-tools:7rem]"
        >
          {children}
        </main>
      </div>
      <BottomNav pathname={pathname} />
    </div>
  );
}
