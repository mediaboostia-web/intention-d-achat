// What Réglages sends when the Boutique section is saved. The country goes
// only when it changes (lot 7b): a shop whose country is locked by its
// products keeps saving its name, number, logo and description.
export interface ShopSettingsValues {
  name: string;
  whatsappPhone: string;
  country: string;
  logoUrl: string | null;
  description: string;
}

export interface ShopSettingsBody {
  name: string;
  whatsappPhone: string;
  country?: string;
  logoUrl: string | null;
  description: string | null;
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
  };
}
