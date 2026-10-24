import type { ReactNode } from 'react';
import { ShopGate } from '@/components/app/ShopProvider';

// Every page of the shop space goes through the gate: session, then shop,
// then the shell (or the bare welcome page for an account without a shop).
export default function ShopSpaceLayout({ children }: { children: ReactNode }) {
  return <ShopGate>{children}</ShopGate>;
}
