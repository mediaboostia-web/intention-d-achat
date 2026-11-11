import type { ReactNode } from 'react';
import { PlatformLinksProvider } from '@/components/app/PlatformLinks';
import { ShellPrefs } from '@/components/app/shell-prefs';
import { ShopGate } from '@/components/app/ShopProvider';
import { prisma } from '@/lib/server/prisma';
import { loadPlatformSettings } from '@/lib/server/tamani/platform-settings';

// Every page of the shop space goes through the gate: session, then shop,
// then the shell (or the bare welcome page for an account without a shop).
// ShellPrefs keeps the night and folded choices on <html> while in /app.
// Tamani's own links come from the platform settings (lot 13a); a save in
// /support-admin/parametres rebuilds this layout.
export default async function ShopSpaceLayout({ children }: { children: ReactNode }) {
  const { links } = await loadPlatformSettings(prisma);
  return (
    <PlatformLinksProvider links={links}>
      <ShellPrefs />
      <ShopGate>{children}</ShopGate>
    </PlatformLinksProvider>
  );
}
