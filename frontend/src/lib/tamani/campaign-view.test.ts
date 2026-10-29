import { describe, it, expect } from 'vitest';
import { endLine, PREVIEW_LINK, previewMessage } from './campaign-view';
import { DEFAULT_SHARE_TEMPLATE } from './share-message';

const now = new Date('2026-10-24T10:00:00Z');
const product = {
  name: 'Marmites inox 5 L',
  unitPrice: 7500,
  wholesalePrice: 6000,
  wholesaleMinQty: 12,
};

describe('endLine', () => {
  it('says until when a campaign takes answers, or when it ended', () => {
    expect(
      endLine(
        { status: 'ACTIVE', endsAt: '2026-11-03T10:00:00.000Z', closedAt: null, arrivedAt: null },
        now,
      ),
    ).toBe("jusqu'au 3 novembre");
    expect(endLine({ status: 'DRAFT', endsAt: null, closedAt: null, arrivedAt: null }, now)).toBe(
      'sans date de fin',
    );
    expect(
      endLine(
        { status: 'CLOSED', endsAt: '2026-10-20T10:00:00.000Z', closedAt: null, arrivedAt: null },
        now,
      ),
    ).toBe('terminée le 20 octobre');
    expect(
      endLine(
        { status: 'CLOSED', endsAt: null, closedAt: '2026-10-22T09:00:00.000Z', arrivedAt: null },
        now,
      ),
    ).toBe('terminée le 22 octobre');
    expect(
      endLine(
        { status: 'ARRIVED', endsAt: null, closedAt: null, arrivedAt: '2026-10-23T09:00:00.000Z' },
        now,
      ),
    ).toBe('arrivée le 23 octobre');
  });
});

describe('previewMessage', () => {
  it('fills the template with the product, its price, its arrival and a placeholder link', () => {
    expect(
      previewMessage(
        DEFAULT_SHARE_TEMPLATE,
        product,
        { availability: 'INCOMING', availableAt: new Date('2026-11-03T10:00:00Z') },
        now,
        'XOF',
      ),
    ).toBe(
      `🔔 Nouveau : *Marmites inox 5 L* à 7 500 FCFA (gros : 6 000 FCFA dès 12). Arrivage dans 10 jours. Tu en veux ? Réponds en moins de 30 secondes 👉 ${PREVIEW_LINK}`,
    );
  });
});

describe('previewMessage in the shop currency (lot 7b)', () => {
  it('writes the price in FG for a Guinean shop', () => {
    const m = previewMessage(
      DEFAULT_SHARE_TEMPLATE,
      product,
      { availability: 'INCOMING', availableAt: new Date('2026-11-03T10:00:00Z') },
      now,
      'GNF',
    );
    expect(m).toContain('7 500 FG (gros : 6 000 FG dès 12)');
    expect(m).not.toContain('FCFA');
  });
});
