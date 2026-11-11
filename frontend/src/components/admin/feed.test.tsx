import { describe, expect, it, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import type { FeedItem } from '@/lib/tamani/admin-feed';
import { FeedView } from './FeedView';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);
// The visit is recorded in the browser, once mounted; a static render never does.
vi.mock('./FeedSeen', () => ({ FeedSeen: () => <div data-feed-seen="" /> }));

const ITEMS: FeedItem[] = [
  {
    id: 'PAYMENT:o_1',
    type: 'PAYMENT',
    at: new Date('2026-11-05T09:30:00Z'),
    title: 'Paiement reçu',
    detail: 'Diallo Import · Pass Semaine · 2 500 F CFA · Wave',
    href: '/support-admin/boutiques/org_1',
  },
  {
    id: 'SIGNUP:u_1',
    type: 'SIGNUP',
    at: new Date('2026-11-05T08:00:00Z'),
    title: 'Nouvelle inscription',
    detail: 'Awa · Diallo Import',
    href: '/support-admin/utilisateurs/u_1',
  },
];

describe('FeedView', () => {
  it('lists each event with its title, its line and a link to the account or shop', () => {
    const out = html(<FeedView items={ITEMS} next={null} type="tout" />);
    const t = text(<FeedView items={ITEMS} next={null} type="tout" />);
    expect(t).toContain('Notifications');
    expect(t).toContain('Paiement reçu');
    expect(t).toContain('Diallo Import · Pass Semaine · 2 500 F CFA · Wave');
    // Cotonou time, as in the journal.
    expect(t).toContain('5 nov. 2026 à 10:30');
    expect(out).toContain('href="/support-admin/boutiques/org_1"');
    expect(out).toContain('href="/support-admin/utilisateurs/u_1"');
    expect(out).toContain('data-feed-seen');
  });

  it('gives the filters as links, the current one marked', () => {
    const out = html(<FeedView items={ITEMS} next={null} type="paiements" />);
    expect(out).toContain('href="/support-admin/notifications"');
    expect(out).toContain('href="/support-admin/notifications?type=inscriptions"');
    expect(out).toMatch(
      /href="\/support-admin\/notifications\?type=paiements"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/support-admin\/notifications\?type=paiements"/,
    );
  });

  it('offers « Voir plus » only when there is a next page', () => {
    expect(text(<FeedView items={ITEMS} next={null} type="tout" />)).not.toContain('Voir plus');
    const out = html(
      <FeedView items={ITEMS} next={new Date('2026-11-05T08:00:00.000Z')} type="paiements" />,
    );
    expect(out).toContain(
      'href="/support-admin/notifications?type=paiements&amp;before=2026-11-05T08%3A00%3A00.000Z"',
    );
    expect(text(<FeedView items={ITEMS} next={new Date()} type="tout" />)).toContain('Voir plus');
  });

  it('says so when nothing happened in 30 days', () => {
    expect(text(<FeedView items={[]} next={null} type="tout" />)).toContain(
      'Rien de nouveau sur les 30 derniers jours.',
    );
  });
});
