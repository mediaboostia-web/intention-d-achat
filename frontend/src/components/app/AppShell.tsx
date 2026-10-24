'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav, Logo, SideNav } from '@/components/ui';
import { useShop } from './shop-context';

/** The shop space: sidebar from 1024px, bottom bar below, the page in between. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { shop } = useShop();
  return (
    <div className="min-h-dvh bg-paper lg:flex">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-3 focus:font-bold focus:text-ink"
      >
        Aller au contenu
      </a>
      <SideNav pathname={pathname} shopName={shop.name} />
      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-2 px-4 pt-4 sm:px-6 lg:hidden">
          <Logo variant="mark" size={26} />
          <span className="truncate font-hand text-lg font-bold text-primary">{shop.name}</span>
        </header>
        <main
          id="contenu"
          className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28 sm:px-6 lg:pt-10 lg:pb-12"
        >
          {children}
        </main>
      </div>
      <BottomNav pathname={pathname} />
    </div>
  );
}
