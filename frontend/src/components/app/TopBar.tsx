'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Avatar, Logo } from '@/components/ui';
import { NotificationBell } from './NotificationBell';
import { useShop } from './shop-context';
import { SidebarToggle } from './SidebarToggle';
import { ThemeToggle } from './ThemeToggle';

/**
 * The shell's top row. On a phone: the shop, then day or night, the bell
 * and the profile. From 1024px it sticks to the top of the page and gains
 * the sidebar's fold button and the search. One bell at every width, so the
 * count is polled once.
 */
export function TopBar({ search }: { search?: ReactNode }) {
  const { shop, me } = useShop();
  const who = me.firstName ?? me.name ?? shop.name;
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 pt-4 sm:px-6 lg:sticky lg:top-0 lg:z-20 lg:h-[72px] lg:max-w-none lg:border-b-2 lg:border-grid lg:bg-bg/90 lg:px-8 lg:pt-0 lg:backdrop-blur">
      <Logo variant="mark" size={26} className="lg:hidden" />
      <span className="min-w-0 truncate font-hand text-lg font-bold text-primary lg:hidden">
        {shop.name}
      </span>
      <SidebarToggle className="hidden lg:grid" />
      {search && <div className="hidden min-w-0 flex-1 lg:block lg:max-w-xl">{search}</div>}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <NotificationBell />
        <Link
          href="/app/profil"
          aria-label="Ton profil"
          className="ml-1 flex items-center gap-2 rounded-full hover:bg-grid/70 xl:py-1 xl:pr-3 xl:pl-1"
        >
          <Avatar name={me.name ?? shop.name} src={shop.logoUrl} size="sm" />
          <span className="hidden text-left leading-tight xl:block">
            <span className="block max-w-36 truncate text-sm font-bold text-ink">{who}</span>
            <span className="block max-w-36 truncate text-xs text-ink-muted">{shop.name}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
