import type { ReactNode } from 'react';
import { ShopGate } from '@/components/app/ShopProvider';
import { ShellPrefsScript } from '@/components/app/shell-prefs';

// Every page of the shop space goes through the gate: session, then shop,
// then the shell (or the bare welcome page for an account without a shop).
// The night and folded choices are set before the first paint.
export default function ShopSpaceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ShellPrefsScript />
      <ShopGate>{children}</ShopGate>
    </>
  );
}
