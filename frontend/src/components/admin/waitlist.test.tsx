import { describe, expect, it } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import type { WaitlistRow } from '@/lib/tamani/waitlist';
import { WaitlistView } from './WaitlistView';

const ROWS: WaitlistRow[] = [
  {
    id: 'w_2',
    position: 2,
    firstName: 'Fatou',
    phone: null,
    email: 'fatou@test.local',
    channels: [],
    source: null,
    createdAt: '2026-11-06T09:00:00.000Z',
  },
  {
    id: 'w_1',
    position: 1,
    firstName: 'Awa',
    phone: '+229 01 97 00 00 00',
    email: null,
    channels: ['CHAINE_WHATSAPP', 'TIKTOK'],
    source: 'tiktok-j01',
    createdAt: '2026-11-06T08:00:00.000Z',
  },
];
const STATS = {
  total: 2,
  thisWeek: 2,
  bySource: [
    { source: 'tiktok-j01', count: 1 },
    { source: null, count: 1 },
  ],
};

describe('WaitlistView', () => {
  it('gives the totals, the sources and every seller with how to reach them', () => {
    const t = text(<WaitlistView rows={ROWS} stats={STATS} />);
    expect(t).toContain("Liste d'attente");
    expect(t).toContain('2 inscrits');
    expect(t).toContain('2 cette semaine');
    expect(t).toContain('tiktok-j01');
    expect(t).toContain('Sans source');
    expect(t).toContain('+229 01 97 00 00 00');
    expect(t).toContain('fatou@test.local');
    expect(t).toContain('Chaîne WhatsApp, TikTok');
    expect(t).toContain('Awa');
  });

  it('opens WhatsApp on a number and offers the export', () => {
    const out = html(<WaitlistView rows={ROWS} stats={STATS} />);
    expect(out).toContain('href="https://wa.me/2290197000000"');
    expect(out).toContain('href="/api/admin/waitlist/export"');
  });

  it('says so when nobody is on the list yet', () => {
    expect(
      text(<WaitlistView rows={[]} stats={{ total: 0, thisWeek: 0, bySource: [] }} />),
    ).toContain('Personne pour l’instant.');
  });
});
