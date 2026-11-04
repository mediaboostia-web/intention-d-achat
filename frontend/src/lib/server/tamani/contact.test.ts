import { describe, expect, it } from 'vitest';
import { shownPhone } from './contact';

// Porteur, 2026-11-04: the popup's box « J'accepte d'être contacté » is not
// required; a client who leaves it unticked still counts, but the shop never
// sees their number.
describe('shownPhone', () => {
  const N = '+221771234512';

  it('a client who agreed: in full with the plan’s contacts', () => {
    expect(shownPhone(N, true, new Date())).toEqual({
      phone: '+221 77 123 45 12',
      phoneE164: N,
      contactRefused: false,
    });
  });

  it('a client who agreed, on a plan without contacts: masked, as before', () => {
    expect(shownPhone(N, false, new Date())).toEqual({
      phone: '77 •• •• 12',
      phoneE164: null,
      contactRefused: false,
    });
  });

  it('a client who did not agree: nothing of the number, on any plan', () => {
    for (const canSee of [true, false]) {
      expect(shownPhone(N, canSee, null)).toEqual({
        phone: null,
        phoneE164: null,
        contactRefused: true,
      });
    }
  });

  it('no number: nothing to refuse', () => {
    expect(shownPhone(null, true, null)).toEqual({
      phone: null,
      phoneE164: null,
      contactRefused: false,
    });
  });
});
