// « Supprimer la campagne » (porteur, 2026-11-04), at the bottom of Modifier.
import { describe, expect, it, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const { CampaignDeletionView } = await import('./CampaignDeletion');

const view = (asking: boolean, error: string | null = null) => (
  <CampaignDeletionView
    asking={asking}
    busy={false}
    error={error}
    onAsk={() => {}}
    onKeep={() => {}}
    onConfirm={() => {}}
  />
);

describe('CampaignDeletionView', () => {
  it('first a quiet button, which says what happens to the answers', () => {
    const t = text(view(false));
    expect(t).toContain('Supprimer la campagne');
    expect(t).toContain('Une campagne qui a déjà des réponses est archivée');
    expect(t).not.toContain('Oui, supprimer');
  });

  it('then a second tap that says it plainly', () => {
    const t = text(view(true));
    expect(t).toContain('Supprimer cette campagne ?');
    expect(t).toContain('Sans réponse, elle est effacée.');
    expect(t).toContain('Oui, supprimer');
    expect(t).toContain('Garder la campagne');
  });

  it('shows the error', () => {
    expect(html(view(false, 'Cette campagne est introuvable.'))).toContain(
      'Cette campagne est introuvable.',
    );
  });
});
