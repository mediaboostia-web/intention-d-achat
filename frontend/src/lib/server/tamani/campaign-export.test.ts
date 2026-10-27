import { describe, it, expect } from 'vitest';
import type { InterestedRow } from '@/lib/tamani/results-view';
import { exportFilename, responsesCsv } from './campaign-export';

const row = (over: Partial<InterestedRow> = {}): InterestedRow => ({
  id: 'a1',
  respondentId: 'r1',
  firstName: 'Awa',
  phone: '+221 77 123 45 12',
  phoneE164: '+221771234512',
  interested: true,
  reason: null,
  buyerType: 'RESELLER',
  quantity: 12,
  option: 'Rouge',
  timing: 'ON_ARRIVAL',
  wantsDelivery: true,
  zoneName: 'Médina',
  sourceLabel: 'Statut',
  completedAt: '2026-10-26T09:05:00.000Z',
  ...over,
});

describe('responsesCsv', () => {
  it('writes one French row per answer', () => {
    const lines = responsesCsv([
      row(),
      row({
        firstName: null,
        phone: null,
        interested: false,
        reason: 'TOO_EXPENSIVE',
        buyerType: null,
        quantity: null,
        option: null,
        timing: null,
        wantsDelivery: false,
        zoneName: null,
        sourceLabel: null,
      }),
    ]).split('\r\n');
    expect(lines[0]).toBe(
      '﻿Date;Prénom;Numéro WhatsApp;Intéressé;Achète pour;Quantité;Option;Quand;Livraison;Quartier;Raison du non;Source',
    );
    expect(lines[1]).toBe(
      "26/10/2026 09:05;Awa;'+221 77 123 45 12;Oui;Revendeur;12;Rouge;Dès l'arrivée;Livraison;Médina;;Statut",
    );
    expect(lines[2]).toBe('26/10/2026 09:05;;;Non;;;;;Retrait;;Trop cher;');
  });
});

describe('exportFilename', () => {
  it('names the file after the campaign and the day', () => {
    expect(exportFilename('Marmites inox 5 L, été !', new Date('2026-10-27T18:00:00Z'))).toBe(
      'tamani-marmites-inox-5-l-ete-2026-10-27.csv',
    );
    expect(exportFilename('***', new Date('2026-10-27T18:00:00Z'))).toBe(
      'tamani-campagne-2026-10-27.csv',
    );
  });
});
