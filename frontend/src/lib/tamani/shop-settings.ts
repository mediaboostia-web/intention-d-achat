// What Réglages sends when the Boutique section is saved. The country goes
// only when it changes (lot 7b): a shop whose country is locked by its
// products keeps saving its name, number, logo and description. The
// onboarding's answers go once chosen; the API never takes them back to null.
import type { BusinessType, SalesChannel } from './shop-profile';

export interface ShopSettingsValues {
  name: string;
  whatsappPhone: string;
  country: string;
  logoUrl: string | null;
  description: string;
  businessType: BusinessType | null;
  salesChannel: SalesChannel | null;
}

export interface ShopSettingsBody {
  name: string;
  whatsappPhone: string;
  country?: string;
  logoUrl: string | null;
  description: string | null;
  businessType?: BusinessType;
  salesChannel?: SalesChannel;
}

export function shopSettingsBody(
  v: ShopSettingsValues,
  current: { country: string },
): ShopSettingsBody {
  return {
    name: v.name,
    whatsappPhone: v.whatsappPhone,
    ...(v.country !== current.country && { country: v.country }),
    logoUrl: v.logoUrl,
    description: v.description.trim() || null,
    ...(v.businessType && { businessType: v.businessType }),
    ...(v.salesChannel && { salesChannel: v.salesChannel }),
  };
}
