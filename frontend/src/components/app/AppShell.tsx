'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav, SideNav } from '@/components/ui';
import { meterTone, passCta } from '@/lib/tamani/billing-view';
import { shellWidth } from '@/lib/tamani/nav';
import { PLANS } from '@/lib/tamani/plans';
import { cn } from '@/lib/utils';
import { GlobalSearch } from './GlobalSearch';
import { PushPrompt } from './PushPrompt';
import { ShellBanners } from './ShellBanners';
import { useShop } from './shop-context';
import { TopBar } from './TopBar';

/**
 * The shop space: the foldable sidebar from 1024px, the bottom bar below,
 * the top bar and the page in between. The home and the lists take the
 * page's width, the rest keeps a reading column. PushPrompt asks a phone
 * for notifications. The pass's banners (grace, pending answers) sit above
 * every page but the pass's own.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { shop, usage } = useShop();
  const wide = shellWidth(pathname) === 'wide';
  const needsPass =
    shop.plan.id === 'FREE' ||
    shop.plan.id === 'TRIAL' ||
    meterTone(usage.used, usage.included) !== 'ok';
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
        usage={{ used: usage.used, limit: usage.included }}
        cta={needsPass ? passCta(shop.plan.id) : null}
      />
      <div className="relative min-w-0 flex-1">
        <TopBar search={<GlobalSearch />} />
        <main
          id="contenu"
          className={cn(
            'mx-auto w-full px-4 pt-6 pb-36 sm:px-6 lg:pt-8 lg:pb-12',
            wide ? 'max-w-[1360px] lg:px-8' : 'max-w-3xl',
          )}
        >
          {!pathname.startsWith('/app/abonnement') && (
            <ShellBanners plan={shop.plan} pending={usage.pending} now={new Date()} />
          )}
          {children}
        </main>
      </div>
      <BottomNav pathname={pathname} />
      <PushPrompt />
    </div>
  );
}
