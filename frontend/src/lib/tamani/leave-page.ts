// Leaving the popup once the answer is sent. A tab with a history goes back
// to where the link was opened from. A tab that holds this page only (a link
// opened from WhatsApp) may be closed by script; when the browser refuses,
// the popup tells the respondent they can close it themselves.
export interface LeavableWindow {
  readonly closed: boolean;
  history: { readonly length: number; back: () => void };
  close: () => void;
}

export type LeaveOutcome = 'back' | 'closed' | 'stayed';

export function leavePage(win: LeavableWindow): LeaveOutcome {
  if (win.history.length > 1) {
    win.history.back();
    return 'back';
  }
  win.close();
  return win.closed ? 'closed' : 'stayed';
}
