'use client';

// The shop space's shared state: the shop and role ShopGate loaded, and the
// gate's actions for the welcome page (which has no shop yet).
import { createContext, useContext } from 'react';
import type { PlanId } from '@/lib/tamani/plans';

/** The shop as lib/server/tamani/serializers.ts toShop sends it. */
export interface Shop {
  id: string;
  slug: string;
  name: string;
  whatsappPhone: string;
  country: string;
  currency: string;
  /** A product exists: the country, and so the currency, no longer change (lot 7b). */
  countryLocked: boolean;
  logoUrl: string | null;
  description: string | null;
  coefConsumer: number;
  coefReseller: number;
  plan: { id: PlanId; inGrace: boolean; endsAt: string | null };
}

export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER';

/** The pass meter (lot 8): answers counted in the pass, answers it holds, answers waiting. */
export interface ShopUsage {
  used: number;
  included: number;
  endsAt: string | null;
  inGrace: boolean;
  pending: number;
}

/** The signed-in person: the greeting's first name, the avatar's initials. */
export interface ShopMe {
  firstName: string | null;
  name: string | null;
}

export interface ShopContextValue {
  shop: Shop;
  role: OrgRole;
  usage: ShopUsage;
  me: ShopMe;
  reload: () => Promise<void>;
}

export interface ShopGateActions {
  reload: () => Promise<void>;
  /** The welcome page created this shop: show it, then go to `landing`. */
  created: (shop: Shop, role: OrgRole, landing: string) => void;
}

export const ShopContext = createContext<ShopContextValue | null>(null);
export const ShopGateContext = createContext<ShopGateActions | null>(null);

export function useShop(): ShopContextValue {
  const value = useContext(ShopContext);
  if (!value) throw new Error('useShop() must be used under <ShopGate> once the shop is ready');
  return value;
}

export function useShopGate(): ShopGateActions {
  const value = useContext(ShopGateContext);
  if (!value) throw new Error('useShopGate() must be used under <ShopGate>');
  return value;
}
