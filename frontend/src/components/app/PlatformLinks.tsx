'use client';

// Tamani's own links (support WhatsApp, community, socials) inside the shop
// space, lot 13a. The shop layout reads the saved settings on the server and
// hands them down; without a provider the lot 12 constants stay.
import { createContext, useContext, type ReactNode } from 'react';
import { LANDING_LINKS, type LandingLinks } from '@/lib/tamani/landing';

const PlatformLinksContext = createContext<LandingLinks>(LANDING_LINKS);

export function PlatformLinksProvider({
  links,
  children,
}: {
  links: LandingLinks;
  children: ReactNode;
}) {
  return <PlatformLinksContext.Provider value={links}>{children}</PlatformLinksContext.Provider>;
}

export function usePlatformLinks(): LandingLinks {
  return useContext(PlatformLinksContext);
}
