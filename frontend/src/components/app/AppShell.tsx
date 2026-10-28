'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav, SideNav } from '@/components/ui';
import { shellWidth } from '@/lib/tamani/nav';
import { PLANS } from '@/lib/tamani/plans';
import { cn } from '@/lib/utils';
import { PushPrompt } from './PushPrompt';
import { useShellPrefs } from './shell-prefs';
import { useShop } from './shop-context';
import { TopBar } from './TopBar';

/**
 * The shop space: the foldable sidebar from 1024px, the bottom bar below,
 * the top bar and the page in between. The home and the lists take the
 * page's width, the rest keeps a reading column. PushPrompt asks a phone
 * for notifications.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { shop, usage } = useShop();
  const wide = shellWidth(pathname) === 'wide';
  useShellPrefs();
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
        <TopBar />
        <main
          id="contenu"
          className={cn(
            'mx-auto w-full px-4 pt-6 pb-36 sm:px-6 lg:pt-8 lg:pb-12',
            wide ? 'max-w-[1360px] lg:px-8' : 'max-w-3xl',
          )}
        >
          {children}
        </main>
      </div>
      <BottomNav pathname={pathname} />
      <PushPrompt />
    </div>
  );
}
