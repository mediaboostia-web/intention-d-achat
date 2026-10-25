import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SHARE_TEMPLATE,
  formatAvailability,
  formatPriceLine,
  formatXof,
  renderShareMessage,
} from './share-message';

const now = new Date('2026-10-24T10:00:00Z');
const DAY = 86_400_000;
const vars = {
  produit: 'Marmites inox 5 L',
  prix: '7 500 FCFA (gros : 6 000 FCFA dès 12)',
  disponibilite: 'Arrivage dans 10 jours',
  lien: 'https://tamani.app/c/k3P9xQa',
};

describe('formatXof / formatPriceLine', () => {
  it('groups thousands with a space', () => {
    expect(formatXof(7500)).toBe('7 500 FCFA');
    expect(formatXof(250)).toBe('250 FCFA');
  });

  it('adds the wholesale price and its minimum', () => {
    expect(formatPriceLine({ unitPrice: 7500, wholesalePrice: 6000, wholesaleMinQty: 12 })).toBe(
      '7 500 FCFA (gros : 6 000 FCFA dès 12)',
    );
  });

  it('shows the unit price alone without a wholesale price', () => {
    expect(formatPriceLine({ unitPrice: 7500, wholesalePrice: null, wholesaleMinQty: null })).toBe(
      '7 500 FCFA',
    );
  });
});

describe('formatAvailability', () => {
  const incoming = (at: Date | null) => ({ availability: 'INCOMING' as const, availableAt: at });

  it('says available now for stock on hand', () => {
    expect(formatAvailability({ availability: 'IN_STOCK', availableAt: null }, now)).toBe(
      'Disponible maintenant',
    );
  });

  it('counts the days to an arrival', () => {
    expect(formatAvailability(incoming(new Date(now.getTime() + 10 * DAY)), now)).toBe(
      'Arrivage dans 10 jours',
    );
    expect(formatAvailability(incoming(new Date(now.getTime() + DAY)), now)).toBe(
      'Arrivage demain',
    );
  });

  it('says imminent once the arrival date has passed, and soon without a date', () => {
    expect(formatAvailability(incoming(new Date(now.getTime() - 3_600_000)), now)).toBe(
      'Arrivage imminent',
    );
    expect(formatAvailability(incoming(null), now)).toBe('Arrivage prochainement');
  });
});

describe('renderShareMessage', () => {
  it('fills the default template', () => {
    expect(renderShareMessage(DEFAULT_SHARE_TEMPLATE, vars)).toBe(
      '🔔 Nouveau : *Marmites inox 5 L* à 7 500 FCFA (gros : 6 000 FCFA dès 12). Arrivage dans 10 jours. Tu en veux ? Réponds en moins de 30 secondes 👉 https://tamani.app/c/k3P9xQa',
    );
  });

  it('leaves unknown variables untouched', () => {
    expect(renderShareMessage('{inconnu} {produit}', vars)).toBe('{inconnu} Marmites inox 5 L');
  });

  it('accepts the accented {disponibilité}', () => {
    expect(renderShareMessage('{disponibilité} / {disponibilite}', vars)).toBe(
      'Arrivage dans 10 jours / Arrivage dans 10 jours',
    );
  });
});
