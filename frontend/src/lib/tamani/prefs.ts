// What the shop space remembers on this device (lot 7a): the night theme,
// the folded sidebar, cards or list per tab. Never throws: a blocked,
// missing or full storage reads as nothing, and the page shows its default
// (day, open sidebar, cards).

export const PREF_KEYS = {
  theme: 'tamani-theme',
  sidebar: 'tamani-sidebar',
  layout: (tab: string) => `tamani-layout:${tab}`,
} as const;

export function readPref(storage: Storage | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** `null` removes the key: the default needs no entry. */
export function writePref(storage: Storage | null, key: string, value: string | null): void {
  try {
    if (value === null) storage?.removeItem(key);
    else storage?.setItem(key, value);
  } catch {
    // The choice holds for this visit only.
  }
}

/** `window.localStorage`, or null where reading it throws (some private modes). */
export function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Inline in the root layout's <head>, run before the first paint so a night
 * or folded choice does not flash the default first; only under /app, so
 * the landing, sign-in and the popup stay in day mode. Plain ES5, no imports.
 */
export const SHELL_PREFS_SCRIPT = `try{if(/^\\/app(\\/|$)/.test(location.pathname)){var d=document.documentElement.dataset;if(localStorage.getItem('${PREF_KEYS.theme}')==='dark')d.theme='dark';if(localStorage.getItem('${PREF_KEYS.sidebar}')==='collapsed')d.sidebar='collapsed'}}catch(e){}`;

/**
 * Sets the stored choices on <html> (a client navigation into /app never
 * ran the script) and returns what takes them off when the shop space is
 * left, whoever set them.
 */
export function applyShellPrefs(root: { dataset: DOMStringMap }, storage: Storage | null) {
  if (readPref(storage, PREF_KEYS.theme) === 'dark') root.dataset.theme = 'dark';
  if (readPref(storage, PREF_KEYS.sidebar) === 'collapsed') root.dataset.sidebar = 'collapsed';
  return () => {
    delete root.dataset.theme;
    delete root.dataset.sidebar;
  };
}
