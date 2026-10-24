import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { html } from './test-html';

// Marks the links that go through next/link (client navigation).
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a data-next-link="" href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { Button } = await import('.');

describe('Button links', () => {
  it('moves between app pages without reloading', () => {
    expect(html(<Button href="/app/produits/nouveau">Ajouter un produit</Button>)).toContain(
      'data-next-link',
    );
  });

  it('keeps a full navigation for API routes, anchors and other sites', () => {
    for (const href of [
      '/api/auth/oauth/google/start?next=%2Fapp',
      '#',
      'https://wa.me/221770000000',
    ]) {
      expect(html(<Button href={href}>Aller</Button>), href).not.toContain('data-next-link');
    }
  });
});
