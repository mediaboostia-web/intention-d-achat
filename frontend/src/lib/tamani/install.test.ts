import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { INSTALL_COPY, INSTALL_EVENT, INSTALL_SCRIPT, installState } from './install';

describe('installState', () => {
  it('says nothing once Tamani runs from the home screen', () => {
    expect(installState({ standalone: true, isIos: false, canPrompt: true })).toBe('installed');
    expect(installState({ standalone: true, isIos: true, canPrompt: false })).toBe('installed');
  });

  it("offers the browser's own install when it has one", () => {
    expect(installState({ standalone: false, isIos: false, canPrompt: true })).toBe('prompt');
  });

  it('explains the Share button on an iPhone, which has no install prompt', () => {
    expect(installState({ standalone: false, isIos: true, canPrompt: false })).toBe('ios');
    expect(INSTALL_COPY.ios.note).toBe(
      "Dans Safari : bouton Partager, puis « Sur l'écran d'accueil ».",
    );
  });

  it('shows nothing where it cannot help', () => {
    expect(installState({ standalone: false, isIos: false, canPrompt: false })).toBe('none');
  });
});

/** Runs the head script against a fake window at this path. */
function boot(pathname: string) {
  const listeners: Record<string, ((e: unknown) => void)[]> = {};
  const register = vi.fn(async () => ({}));
  const dispatched: string[] = [];
  const win: Record<string, unknown> = {
    addEventListener: (type: string, fn: (e: unknown) => void) => (listeners[type] ??= []).push(fn),
    dispatchEvent: (e: { type: string }) => dispatched.push(e.type),
  };
  vm.runInNewContext(INSTALL_SCRIPT, {
    window: win,
    navigator: { serviceWorker: { register } },
    location: { pathname },
    Event: class {
      constructor(public type: string) {}
    },
  });
  const fire = (type: string, e: unknown = {}) => listeners[type]?.forEach((fn) => fn(e));
  return { win, register, dispatched, fire };
}

describe('INSTALL_SCRIPT', () => {
  it('registers the service worker once the page has loaded, never on the popup', () => {
    const home = boot('/');
    expect(home.register).not.toHaveBeenCalled();
    home.fire('load');
    expect(home.register).toHaveBeenCalledWith('/sw.js');
    const popup = boot('/c/AB12CD');
    popup.fire('load');
    expect(popup.register).not.toHaveBeenCalled();
  });

  // Kept for the button, so a respondent on the popup never sees an install banner.
  it("keeps the browser's install prompt for Tamani's own button, on every page", () => {
    for (const path of ['/', '/c/AB12CD']) {
      const { win, dispatched, fire } = boot(path);
      const prompt = { preventDefault: vi.fn() };
      fire('beforeinstallprompt', prompt);
      expect(prompt.preventDefault).toHaveBeenCalled();
      expect(win.__tamaniInstall).toBe(prompt);
      expect(dispatched).toEqual([INSTALL_EVENT]);
      fire('appinstalled');
      expect(win.__tamaniInstall).toBeNull();
    }
  });
});
