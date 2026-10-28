import { describe, it, expect } from 'vitest';
import {
  clientsCsv,
  exportFilename,
  mostFrequent,
  responsesCsv,
  type ExportClientRow,
  type ExportResponseRow,
} from './campaign-export';

const row = (over: Partial<ExportResponseRow> = {}): ExportResponseRow => ({
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
  deliveryPlace: null,
  country: 'SN',
  sourceLabel: 'Statut',
  completedAt: '2026-10-26T09:05:00.000Z',
  productName: 'Riz parfumé',
  ...over,
});

describe('responsesCsv', () => {
  it('writes one French row per answer, the product second', () => {
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
        country: null,
        sourceLabel: null,
      }),
    ]).split('\r\n');
    expect(lines[0]).toBe(
      '﻿Date;Produit;Prénom;Numéro WhatsApp;Pays;Intéressé;Raison du non;Achète pour;Quantité;Option;Quand;Livraison;Quartier;Lieu;Source',
    );
    expect(lines[1]).toBe(
      "26/10/2026 09:05;Riz parfumé;Awa;'+221 77 123 45 12;Sénégal;Oui;;Revendeur;12;Rouge;Dès l'arrivée;Livraison;Médina;;Statut",
    );
    expect(lines[2]).toBe('26/10/2026 09:05;Riz parfumé;;;;Non;Trop cher;;;;;Retrait;;;');
  });

  it('writes the place of a delivery elsewhere, a formula made harmless', () => {
    const lines = responsesCsv([
      row({ zoneName: null, deliveryPlace: '=HYPERLINK("x")', country: 'FR' }),
    ]).split('\r\n');
    expect(lines[1]).toContain(';France;');
    expect(lines[1]).toContain(`;Livraison;;"'=HYPERLINK(""x"")";`);
  });
});

describe('clientsCsv', () => {
  it('writes one French row per client', () => {
    const client: ExportClientRow = {
      firstName: 'Kofi',
      phone: '+229 01 97 12 34 56',
      country: 'BJ',
      kind: 'CONSUMER',
      topZone: 'Cadjehoun',
      responses: 3,
      yes: 2,
      lastAt: '2026-10-20T08:00:00.000Z',
      lastProduct: 'Marmite',
    };
    const lines = clientsCsv([
      client,
      {
        ...client,
        firstName: null,
        phone: null,
        country: null,
        kind: null,
        topZone: null,
        lastAt: null,
        lastProduct: null,
      },
    ]).split('\r\n');
    expect(lines[0]).toBe(
      '﻿Prénom;Numéro WhatsApp;Pays;Achète pour;Quartier le plus fréquent;Réponses;Oui;Dernière réponse;Dernier produit',
    );
    expect(lines[1]).toBe(
      "Kofi;'+229 01 97 12 34 56;Bénin;Usager;Cadjehoun;3;2;20/10/2026 08:00;Marmite",
    );
    expect(lines[2]).toBe(';;;;;3;2;;');
  });
});

describe('mostFrequent', () => {
  it('keeps the zone a client named most, the most recent on a tie', () => {
    expect(mostFrequent(['Médina', null, 'Plateau', 'Médina'])).toBe('Médina');
    expect(mostFrequent(['Plateau', 'Médina'])).toBe('Plateau');
    expect(mostFrequent([null, null])).toBeNull();
    expect(mostFrequent([])).toBeNull();
  });
});

describe('exportFilename', () => {
  const day = new Date('2026-10-28T18:00:00Z');
  it('says what is exported, for which campaign, and the day', () => {
    expect(exportFilename('interesses', 'Riz parfumé', day)).toBe(
      'tamani-interesses-riz-parfume-2026-10-28.csv',
    );
    expect(exportFilename('pas-interesses', 'Marmites inox 5 L, été !', day)).toBe(
      'tamani-pas-interesses-marmites-inox-5-l-ete-2026-10-28.csv',
    );
    expect(exportFilename('reponses', null, day)).toBe('tamani-reponses-2026-10-28.csv');
    expect(exportFilename('clients', '***', day)).toBe('tamani-clients-2026-10-28.csv');
  });
});
