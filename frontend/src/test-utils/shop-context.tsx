// A shop as /api/shops/me returns it, and the contexts ShopGate would
// provide, for rendering shop-space pages in tests without the gate.
import type { ReactNode } from 'react';
import {
  ShopContext,
  ShopGateContext,
  type OrgRole,
  type Shop,
  type ShopMe,
  type ShopUsage,
} from '@/components/app/shop-context';

export const TEST_SHOP: Shop = {
  id: 'org_1',
  slug: 'diallo-import',
  name: 'Diallo Import',
  whatsappPhone: '+221771234567',
  country: 'SN',
  currency: 'XOF',
  countryLocked: false,
  logoUrl: null,
  description: null,
  coefConsumer: 0.4,
  coefReseller: 0.7,
  plan: { id: 'FREE', inGrace: false, currentPeriodEnd: null },
};

export const TEST_USAGE: ShopUsage = { responsesThisMonth: 42, monthlyLimit: 150 };
export const TEST_ME: ShopMe = { firstName: 'Fatou', name: 'Fatou Ndiaye' };

export function ShopTestProvider({
  shop = TEST_SHOP,
  role = 'OWNER',
  usage = TEST_USAGE,
  me = TEST_ME,
  children,
}: {
  shop?: Shop;
  role?: OrgRole;
  usage?: ShopUsage;
  me?: ShopMe;
  children: ReactNode;
}) {
  const reload = async () => {};
  return (
    <ShopGateContext.Provider value={{ reload, created: () => {} }}>
      <ShopContext.Provider value={{ shop, role, usage, me, reload }}>
        {children}
      </ShopContext.Provider>
    </ShopGateContext.Provider>
  );
}
