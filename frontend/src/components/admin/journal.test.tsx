import { describe, expect, it } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import type { JournalEntry } from '@/lib/tamani/admin-journal';
import { JournalView } from './JournalView';

const GRANT: JournalEntry = {
  id: 'a_1',
  action: 'shop.pass_grant',
  actorEmail: 'boss@tamani.test',
  target: { type: 'Organization', id: 'org_1', label: 'Diallo Import' },
  metadata: { plan: 'WEEK', amount: 3900 },
  createdAt: '2026-11-04T09:30:00.000Z',
};

describe('JournalView', () => {
  it('shows each action with its author, its target, what changed and when', () => {
    const t = text(<JournalView entries={[GRANT]} />);
    expect(t).toContain('Pass attribué');
    expect(t).toContain('Pass Semaine · 3 900 FCFA');
    expect(t).toContain('Diallo Import');
    expect(t).toContain('boss@tamani.test');
    // Cotonou time (UTC+1), the porteur's.
    expect(t).toContain('4 nov. 2026 à 10:30');
    expect(html(<JournalView entries={[GRANT]} />)).toContain(
      'href="/support-admin/boutiques/org_1"',
    );
  });

  it('keeps an unknown action’s code and a nameless target’s id, unlinked', () => {
    const t = text(
      <JournalView
        entries={[
          { ...GRANT, action: 'outbox.retry', target: { type: 'Order', id: 'o_9', label: null } },
        ]}
      />,
    );
    expect(t).toContain('outbox.retry');
    expect(t).toContain('o_9');
    expect(
      html(
        <JournalView entries={[{ ...GRANT, target: { type: 'Order', id: 'o_9', label: null } }]} />,
      ),
    ).not.toContain('href="/support-admin/');
  });

  it('says when nothing happened yet', () => {
    expect(text(<JournalView entries={[]} />)).toContain('Aucune action pour l’instant.');
  });
});
