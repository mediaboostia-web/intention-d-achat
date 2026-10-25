import { describe, expect, it, vi } from 'vitest';
import { leavePage, type LeavableWindow } from './leave-page';

function fakeWindow(historyLength: number, closes: boolean) {
  const win = {
    closed: false as boolean,
    history: { length: historyLength, back: vi.fn() },
    close: vi.fn(() => {
      if (closes) win.closed = true;
    }),
  } satisfies LeavableWindow;
  return win;
}

describe('leavePage', () => {
  it('goes back to where the link was opened from when the tab has a history', () => {
    const win = fakeWindow(3, true);
    expect(leavePage(win)).toBe('back');
    expect(win.history.back).toHaveBeenCalledOnce();
    expect(win.close).not.toHaveBeenCalled();
  });

  it('closes a tab that holds only this page', () => {
    const win = fakeWindow(1, true);
    expect(leavePage(win)).toBe('closed');
    expect(win.close).toHaveBeenCalledOnce();
    expect(win.history.back).not.toHaveBeenCalled();
  });

  it('says the page stayed when the browser refuses to close it', () => {
    expect(leavePage(fakeWindow(1, false))).toBe('stayed');
  });
});
