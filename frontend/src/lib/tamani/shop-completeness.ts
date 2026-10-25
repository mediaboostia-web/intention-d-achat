// What a shop still lacks to look complete (porteur's feedback §3): Réglages
// says it. The popup shows the description and the logo; zones let
// respondents ask for delivery.

export type ShopGap = 'description' | 'logo' | 'zones';

export function shopCompleteness(
  s: { description: string | null; logoUrl: string | null },
  zoneCount: number,
): { complete: boolean; missing: ShopGap[] } {
  const missing: ShopGap[] = [];
  if (!s.description?.trim()) missing.push('description');
  if (!s.logoUrl) missing.push('logo');
  if (zoneCount === 0) missing.push('zones');
  return { complete: missing.length === 0, missing };
}
