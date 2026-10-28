// Units a product is sold by (porteur's feedback §3): the common ones as
// chips, then those the shop already wrote. No table: the shop's list comes
// from its own products (GET /api/shops/[orgId]/products/units).

export const COMMON_UNITS: readonly string[] = [
  'pièce',
  'carton',
  'sac',
  'bouteille',
  'flacon',
  'paquet',
  'douzaine',
  'demi-douzaine',
  'kg',
  'litre',
];

/** The common units first, then the shop's own, once each (case aside), never blank. */
export function unitChoices(used: readonly string[]): string[] {
  const out = [...COMMON_UNITS];
  const seen = new Set(out.map((u) => u.toLocaleLowerCase('fr')));
  for (const raw of used) {
    const unit = raw.trim();
    const key = unit.toLocaleLowerCase('fr');
    if (!unit || seen.has(key)) continue;
    seen.add(key);
    out.push(unit);
  }
  return out;
}
