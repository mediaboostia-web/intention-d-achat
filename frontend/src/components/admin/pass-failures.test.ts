import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

import { ApiError } from '@/lib/api';
import { endFailure } from './EndPassButton';
import { grantFailure } from './GrantPassForm';

// Recette 2026-11-04: a grant answered after api()'s 30 s had been saved,
// yet the card said « pas attribué ». A late answer is no proof of failure.
describe('pass form failures', () => {
  it('asks to reload the card before trying again when the answer came too late', () => {
    expect(grantFailure(new ApiError(0, 'timed out'))).toBe(
      'Pas de réponse à temps. Recharge la fiche pour voir si le pass a été attribué avant de réessayer.',
    );
    expect(endFailure(new ApiError(0, 'timed out'))).toBe(
      'Pas de réponse à temps. Recharge la fiche pour voir si le pass a été retiré avant de réessayer.',
    );
  });

  it('keeps the plain answers for the server’s refusals', () => {
    expect(grantFailure(new ApiError(403, 'no'))).toBe('Réservé au super-admin.');
    expect(grantFailure(new ApiError(500, 'boom'))).toBe(
      "Le pass n'a pas été attribué. Réessayer.",
    );
    expect(endFailure(new ApiError(500, 'boom'))).toBe("Le pass n'a pas été retiré. Réessayer.");
  });
});
