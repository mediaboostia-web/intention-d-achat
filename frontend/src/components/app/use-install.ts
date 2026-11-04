'use client';

// The browser side of « Installer l'application » (2026-10-30): reads the
// prompt the head script kept (INSTALL_SCRIPT), whether Tamani already runs
// from the home screen, and whether this is an iPhone. 'hidden' until read.
import { useCallback, useEffect, useState } from 'react';
import { INSTALL_EVENT, installState, type InstallState } from '@/lib/tamani/install';

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
type InstallWindow = Window & { __tamaniInstall?: InstallPrompt | null };

function readState(): InstallState {
  const nav = navigator as Navigator & { standalone?: boolean };
  return installState({
    standalone: window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true,
    isIos:
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    canPrompt: Boolean((window as InstallWindow).__tamaniInstall),
  });
}

export function useInstall(): { state: InstallState | 'hidden'; install: () => Promise<void> } {
  const [state, setState] = useState<InstallState | 'hidden'>('hidden');

  useEffect(() => {
    const read = () => setState(readState());
    const first = requestAnimationFrame(read);
    window.addEventListener(INSTALL_EVENT, read);
    return () => {
      cancelAnimationFrame(first);
      window.removeEventListener(INSTALL_EVENT, read);
    };
  }, []);

  const install = useCallback(async () => {
    const w = window as InstallWindow;
    const prompt = w.__tamaniInstall;
    if (!prompt) return;
    // A kept prompt can be shown once only.
    w.__tamaniInstall = null;
    await prompt.prompt();
    await prompt.userChoice.catch(() => null);
    window.dispatchEvent(new Event(INSTALL_EVENT));
  }, []);

  return { state, install };
}
