'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui';
import { browserStorage, PREF_KEYS, readPref, writePref } from '@/lib/tamani/prefs';
import { cn } from '@/lib/utils';

/**
 * Day or night ("carnet de nuit") for the shop space. The choice goes on
 * <html> and into this device's storage; the label stays put and
 * aria-pressed says which mode is on.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  // Read the storage, not <html>: on a client navigation into the shop the
  // shell applies the stored choice after this effect.
  useEffect(() => {
    setDark(readPref(browserStorage(), PREF_KEYS.theme) === 'dark');
  }, []);

  const toggle = () => {
    const next = !dark;
    const root = document.documentElement;
    if (next) root.dataset.theme = 'dark';
    else delete root.dataset.theme;
    writePref(browserStorage(), PREF_KEYS.theme, next ? 'dark' : null);
    setDark(next);
  };

  return (
    <button
      type="button"
      aria-label="Mode nuit"
      aria-pressed={dark}
      title={dark ? 'Passer en mode jour' : 'Passer en mode nuit'}
      onClick={toggle}
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-grid/70',
        className,
      )}
    >
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  );
}
