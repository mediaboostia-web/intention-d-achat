// What a shop is and where it sells (onboarding, porteur 2026-11-04):
// « Grossiste, Importateur, Autres ou les Deux / Vente en ligne, Boutique
// physique, Les deux ». « Détaillant » joined the same day (back-office
// request: « Grossistes, importateur, Détaillants »). Asked before the shop
// form, changed in Réglages; the back-office counts shops by type. Shops made
// before stay null.

export const BUSINESS_TYPES = ['WHOLESALER', 'IMPORTER', 'BOTH', 'RETAILER', 'OTHER'] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const SALES_CHANNELS = ['ONLINE', 'STORE', 'BOTH'] as const;
export type SalesChannel = (typeof SALES_CHANNELS)[number];

/** The choices, as the onboarding lists them: « Les deux » follows the two it joins. */
export const BUSINESS_TYPE_OPTIONS: ReadonlyArray<{ value: BusinessType; label: string }> = [
  { value: 'WHOLESALER', label: 'Grossiste' },
  { value: 'IMPORTER', label: 'Importateur' },
  { value: 'BOTH', label: 'Les deux' },
  { value: 'RETAILER', label: 'Détaillant' },
  { value: 'OTHER', label: 'Autre' },
];

export const SALES_CHANNEL_OPTIONS: ReadonlyArray<{ value: SalesChannel; label: string }> = [
  { value: 'ONLINE', label: 'Vente en ligne' },
  { value: 'STORE', label: 'Boutique physique' },
  { value: 'BOTH', label: 'Les deux' },
];

const NOT_SET = 'Non renseigné';

/** A value read alone (a list, a select): « Les deux » says which two. */
export function businessTypeLabel(v: BusinessType | null): string {
  if (v === null) return NOT_SET;
  return v === 'BOTH'
    ? 'Grossiste et importateur'
    : (BUSINESS_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? NOT_SET);
}

export function salesChannelLabel(v: SalesChannel | null): string {
  if (v === null) return NOT_SET;
  return v === 'BOTH'
    ? 'En ligne et en boutique'
    : (SALES_CHANNEL_OPTIONS.find((o) => o.value === v)?.label ?? NOT_SET);
}

export const isBusinessType = (v: unknown): v is BusinessType =>
  (BUSINESS_TYPES as readonly unknown[]).includes(v);

export const isSalesChannel = (v: unknown): v is SalesChannel =>
  (SALES_CHANNELS as readonly unknown[]).includes(v);
