'use client';

import { useEffect } from 'react';
import { browserStorage, PREF_KEYS, readPref, SHELL_PREFS_SCRIPT } from '@/lib/tamani/prefs';

/** In the shop space's layout: applies the night and folded choices before the first paint. */
export function ShellPrefsScript() {
  return <script dangerouslySetInnerHTML={{ __html: SHELL_PREFS_SCRIPT }} />;
}

/**
 * The shell applies the stored choices on a client navigation into the shop
 * (the inline script ran only on the first load) and takes them off when it
 * leaves, so the public pages stay in day mode with no sidebar state.
 */
export function useShellPrefs() {
  useEffect(() => {
    const root = document.documentElement;
    const storage = browserStorage();
    if (readPref(storage, PREF_KEYS.theme) === 'dark') root.dataset.theme = 'dark';
    if (readPref(storage, PREF_KEYS.sidebar) === 'collapsed') root.dataset.sidebar = 'collapsed';
    return () => {
      delete root.dataset.theme;
      delete root.dataset.sidebar;
    };
  }, []);
}
