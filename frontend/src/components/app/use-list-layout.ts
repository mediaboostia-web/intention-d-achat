'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ListLayout } from '@/components/ui';
import { browserStorage, PREF_KEYS, readPref, writePref } from '@/lib/tamani/prefs';

/**
 * Cards or list for one tab (lot 7a), remembered on this device. Cards by
 * default; the stored choice is read after mount, while the list loads.
 */
export function useListLayout(tab: string): [ListLayout, (layout: ListLayout) => void] {
  const [layout, setLayout] = useState<ListLayout>('card');

  useEffect(() => {
    if (readPref(browserStorage(), PREF_KEYS.layout(tab)) === 'list') setLayout('list');
  }, [tab]);

  const choose = useCallback(
    (next: ListLayout) => {
      setLayout(next);
      writePref(browserStorage(), PREF_KEYS.layout(tab), next === 'list' ? 'list' : null);
    },
    [tab],
  );

  return [layout, choose];
}
