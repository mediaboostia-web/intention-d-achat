'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui';
import { browserStorage, PREF_KEYS, readPref, writePref } from '@/lib/tamani/prefs';
import { cn } from '@/lib/utils';

/** Folds the desktop sidebar to its icons and back; the choice stays on this device. */
export function SidebarToggle({ className }: { className?: string }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readPref(browserStorage(), PREF_KEYS.sidebar) === 'collapsed');
  }, []);

  const toggle = () => {
    const next = !collapsed;
    const root = document.documentElement;
    if (next) root.dataset.sidebar = 'collapsed';
    else delete root.dataset.sidebar;
    writePref(browserStorage(), PREF_KEYS.sidebar, next ? 'collapsed' : null);
    setCollapsed(next);
  };

  return (
    <button
      type="button"
      aria-label="Menu latéral"
      aria-expanded={!collapsed}
      aria-controls="menu-lateral"
      title={collapsed ? 'Déplier le menu' : 'Replier le menu'}
      onClick={toggle}
      className={cn(
        'size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-grid/70',
        className,
      )}
    >
      <Icon name="sidebar" />
    </button>
  );
}
