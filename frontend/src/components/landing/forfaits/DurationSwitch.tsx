'use client';

import { useEffect, useState } from 'react';
import { FORFAITS_TABS, tabFromSearch, type DurationTab } from '@/lib/tamani/landing-forfaits';

/**
 * « Courte durée | Au mois » (porteur, 2026-11-05). Two native radios: the
 * cards below follow the checked one in CSS (:has), so the switch works
 * without JavaScript. This leaf only reads ?duree=mois on arrival and writes
 * it back, so a shared link opens the same tab.
 */
export function DurationSwitch() {
  const [tab, setTab] = useState<DurationTab>('court');

  useEffect(() => {
    setTab(tabFromSearch(window.location.search));
  }, []);

  const choose = (next: DurationTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === 'mois') url.searchParams.set('duree', 'mois');
    else url.searchParams.delete('duree');
    window.history.replaceState(window.history.state, '', url);
  };

  return (
    <fieldset className="lp-switch">
      <legend className="sr-only">Durée des pass</legend>
      {FORFAITS_TABS.map((t) => (
        <label key={t.id} className="lp-switch__opt">
          <input
            type="radio"
            name="duree"
            id={`duree-${t.id}`}
            value={t.id}
            checked={tab === t.id}
            onChange={() => choose(t.id)}
          />
          <span>{t.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
