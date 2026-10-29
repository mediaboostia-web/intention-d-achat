'use client';

import { useLayoutEffect } from 'react';
import { applyShellPrefs, browserStorage } from '@/lib/tamani/prefs';

/**
 * In the shop space's layout, so it lives as long as /app does: applies the
 * stored night and folded choices after a client navigation into the shop
 * (the root layout's script ran on the first load only) and takes them off
 * on the way out, even when the gate sends the visitor to the sign-in page
 * before the shell ever mounts. A layout effect, so the page left to never
 * shows one night frame.
 */
export function ShellPrefs() {
  useLayoutEffect(() => applyShellPrefs(document.documentElement, browserStorage()), []);
  return null;
}
