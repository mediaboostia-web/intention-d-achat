'use client';

// The units the shop's products already use, for the product form's chips.
// A failed load leaves the common units only: the field still takes any unit.
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export function useShopUnits(shopId: string): readonly string[] {
  const [units, setUnits] = useState<readonly string[]>([]);
  useEffect(() => {
    let live = true;
    api<{ units: string[] }>(`/api/shops/${shopId}/products/units`)
      .then((res) => live && setUnits(res.units))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [shopId]);
  return units;
}
