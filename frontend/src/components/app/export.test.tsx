import { describe, it, expect, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { html, text } from '@/components/ui/test-html';
import { NO_CLIENT_FILTERS } from '@/lib/tamani/client-filters';
import { DEFAULT_EXPORT } from '@/lib/tamani/export-view';

vi.mock('@/lib/api', () => ({ api: vi.fn() }));
vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const { ExportView } = await import('./ExportView');

type Props = ComponentProps<typeof ExportView>;

const headers = ['Date', 'Produit', 'Prénom', 'Numéro WhatsApp'];
const rows = (phone: string) =>
  Array.from({ length: 10 }, (_, i) => ['26/10/2026 10:00', 'Riz', `Client ${i + 1}`, phone]);

const props = (over: Partial<Props> = {}): Props => ({
  query: { ...DEFAULT_EXPORT, campaignId: 'c1' },
  preview: { total: 142, headers, rows: rows('+221 77 123 45 12') },
  choices: {
    campaigns: [{ id: 'c1', title: 'Riz parfumé' }],
    zones: [{ id: 'z1', name: 'Médina' }],
    countries: [{ code: 'SN', label: 'Sénégal', dialCode: '+221' }],
    months: ['2026-10'],
  },
  canDownload: true,
  busy: false,
  feedback: null,
  onChange: () => {},
  onDownload: () => {},
  onCopy: () => {},
  ...over,
});

describe('ExportView', () => {
  it('shows a Pro shop the 10 first rows and the download of all of them', () => {
    const el = <ExportView {...props()} />;
    const out = html(el);
    const t = text(el);
    expect(t).toContain('142 lignes');
    expect(t).toContain('Télécharger (142 lignes)');
    expect(t).toContain('Copier les numéros');
    expect(out.match(/<tr/g)?.length).toBe(11);
    expect(t).toContain('Client 10');
    expect(t).toContain('+221 77 123 45 12');
    expect(out).toContain('overflow-x-auto');
    expect(t).not.toContain('Prends un pass');
  });

  it('offers the four things to export', () => {
    const t = text(<ExportView {...props()} />);
    for (const label of ['Intéressés', 'Pas intéressés', 'Toutes les réponses', 'Clients']) {
      expect(t).toContain(label);
    }
  });

  it('shows a free shop the preview, numbers masked, and leads the download to Pro', () => {
    const el = (
      <ExportView
        {...props({
          canDownload: false,
          preview: { total: 142, headers, rows: rows('77 •• •• 12') },
        })}
      />
    );
    const out = html(el);
    const t = text(el);
    expect(t).toContain('77 •• •• 12');
    expect(t).toContain('Prends un pass pour télécharger');
    expect(out).toContain('href="/app/abonnement"');
    expect(t).not.toContain('Télécharger (');
    expect(t).not.toContain('Copier les numéros');
  });

  it('says there is nothing to export and turns the buttons off', () => {
    const el = <ExportView {...props({ preview: { total: 0, headers, rows: [] } })} />;
    const out = html(el);
    expect(text(el)).toContain('Rien à exporter avec ces filtres.');
    expect(out).not.toContain('<table');
    expect(out.match(/<button[^>]*disabled/g)?.length).toBe(2);
  });

  it('gives the clients the filters of the client book', () => {
    const t = text(
      <ExportView {...props({ query: { what: 'clients', filters: NO_CLIENT_FILTERS } })} />,
    );
    expect(t).toContain('Réponse');
    expect(t).toContain('Période de la réponse');
    expect(t).toContain('Pays du numéro');
    expect(t).not.toContain('Quand');
  });

  it('says 1 ligne, not 1 lignes', () => {
    const t = text(<ExportView {...props({ preview: { total: 1, headers, rows: [] } })} />);
    expect(t).toContain('1 ligne');
    expect(t).toContain('Télécharger (1 ligne)');
  });
});
