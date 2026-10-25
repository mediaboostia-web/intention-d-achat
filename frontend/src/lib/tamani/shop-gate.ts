// Who may see which page of /app: a signed-out visitor goes to the login
// (with the way back), an account without a shop goes to the welcome form,
// an account with a shop never sees the welcome form again.

const WELCOME = '/app/bienvenue';

export type GateDecision =
  | { kind: 'wait' }
  | { kind: 'redirect'; to: string }
  | { kind: 'shell' }
  | { kind: 'bare' };

export function gateDecision(i: {
  authLoading: boolean;
  signedIn: boolean;
  shop: 'loading' | 'none' | 'ready' | 'error';
  pathname: string;
  /** Where the welcome page sends the shop it has just created (default /app). */
  landing?: string | undefined;
}): GateDecision {
  if (i.authLoading) return { kind: 'wait' };
  if (!i.signedIn) return { kind: 'redirect', to: `/login?next=${encodeURIComponent(i.pathname)}` };
  if (i.shop === 'loading') return { kind: 'wait' };
  const onWelcome = i.pathname === WELCOME;
  if (i.shop === 'none') return onWelcome ? { kind: 'bare' } : { kind: 'redirect', to: WELCOME };
  if (i.shop === 'ready' && onWelcome) return { kind: 'redirect', to: i.landing ?? '/app' };
  return { kind: 'shell' };
}
