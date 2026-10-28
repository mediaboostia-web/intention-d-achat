import type { ReactNode } from 'react';
import { ShellPrefs } from '@/components/app/shell-prefs';
import { ShopGate } from '@/components/app/ShopProvider';

// Every page of the shop space goes through the gate: session, then shop,
// then the shell (or the bare welcome page for an account without a shop).
// ShellPrefs keeps the night and folded choices on <html> while in /app.
export default function ShopSpaceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ShellPrefs />
      <ShopGate>{children}</ShopGate>
    </>
  );
}
