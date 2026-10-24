import { describe, it, expect } from 'vitest';
import { gateDecision } from './shop-gate';

const base = { authLoading: false, signedIn: true, shop: 'ready' as const, pathname: '/app' };

describe('gateDecision', () => {
  it('gateDecision routes by session and shop', () => {
    expect(gateDecision({ ...base, signedIn: false, pathname: '/app/produits' })).toEqual({
      kind: 'redirect',
      to: '/login?next=%2Fapp%2Fproduits',
    });
    expect(gateDecision({ ...base, shop: 'none' })).toEqual({
      kind: 'redirect',
      to: '/app/bienvenue',
    });
    expect(gateDecision({ ...base, pathname: '/app/bienvenue' })).toEqual({
      kind: 'redirect',
      to: '/app',
    });
    expect(gateDecision({ ...base, shop: 'none', pathname: '/app/bienvenue' })).toEqual({
      kind: 'bare',
    });
    expect(gateDecision(base)).toEqual({ kind: 'shell' });
    expect(gateDecision({ ...base, shop: 'error' })).toEqual({ kind: 'shell' });
  });

  it('waits while the session or the shop loads', () => {
    expect(gateDecision({ ...base, authLoading: true })).toEqual({ kind: 'wait' });
    expect(gateDecision({ ...base, shop: 'loading' })).toEqual({ kind: 'wait' });
  });
});
