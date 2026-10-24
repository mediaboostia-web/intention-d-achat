import { afterEach, describe, it, expect, vi } from 'vitest';
import { text } from '@/components/ui/test-html';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

const { default: StyleguidePage } = await import('./page');

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('/styleguide', () => {
  it('is a 404 in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => StyleguidePage()).toThrow('NEXT_NOT_FOUND');
  });

  it('shows the identity and the two reference screens in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const t = text(<StyleguidePage />);
    expect(t).toContain('Tamani');
    expect(t).toContain('Prudence');
    expect(t).toContain('Commande environ 210 pièces, pas les 400 prévues.');
    expect(t).toContain("Ça t'intéresse ?");
  });

  it('shows the shop space components', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const t = text(<StyleguidePage />);
    expect(t).toContain('Espace grossiste');
    expect(t).toContain('Étape 2 sur 6');
    expect(t).toContain('Commandes');
  });
});
