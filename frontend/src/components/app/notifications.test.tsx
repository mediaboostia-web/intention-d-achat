import { describe, expect, it } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import { NotificationBell, NotificationPanel, bellLabel } from './NotificationBell';
import { PushCardView } from './PushCard';
import { PushPromptView } from './PushPrompt';

describe('PushPromptView', () => {
  const noop = () => {};

  it('asks on the phone with yes and later', () => {
    const t = text(<PushPromptView state="ask" busy={false} onYes={noop} onLater={noop} />);
    expect(t).toContain('Être prévenu à chaque réponse ?');
    expect(t).toContain('Oui, préviens-moi');
    expect(t).toContain('Plus tard');
    expect(t).not.toContain("J'ai compris");
  });

  it('explains the home screen first on an iPhone', () => {
    const t = text(
      <PushPromptView state="install-first" busy={false} onYes={noop} onLater={noop} />,
    );
    expect(t).toContain("Sur iPhone, ajoute d'abord Tamani à l'écran d'accueil");
    expect(t).toContain("J'ai compris");
    expect(t).toContain('Plus tard');
    expect(t).not.toContain('Oui, préviens-moi');
  });

  it('holds the yes button while the phone asks', () => {
    const out = html(<PushPromptView state="ask" busy onYes={noop} onLater={noop} />);
    const yes = (out.match(/<button[^>]*>[^<]*<\/button>/g) ?? []).find((b) =>
      b.includes('préviens-moi'),
    );
    expect(yes).toContain('disabled');
  });
});

describe('PushCardView', () => {
  it('asks to enable notifications', () => {
    const t = text(<PushCardView state="ask" />);
    expect(t).toContain('Sois prévenu à chaque réponse');
    expect(t).toContain('Activer les notifications');
  });

  it('explains the home screen on an iPhone', () => {
    const t = text(<PushCardView state="install-first" />);
    expect(t).toContain("Sur iPhone, ajoute d'abord Tamani à l'écran d'accueil");
    expect(t).not.toContain('Activer les notifications');
  });

  it('explains how to unblock notifications', () => {
    expect(text(<PushCardView state="denied" />)).toContain(
      'Les notifications sont bloquées pour Tamani.',
    );
  });

  it('names the browsers that can receive them', () => {
    expect(text(<PushCardView state="unsupported" />)).toContain(
      'Ce navigateur ne reçoit pas les notifications.',
    );
  });

  it('renders nothing once notifications are on', () => {
    expect(html(<PushCardView state="hidden" />)).toBe('');
  });

  it('says notifications are on, in Réglages', () => {
    const t = text(<PushCardView state="on" place="settings" />);
    expect(t).toContain('Les notifications sont activées sur cet appareil.');
    expect(t).not.toContain('Activer les notifications');
  });

  it('in Réglages, says so when the server sends no notifications', () => {
    expect(text(<PushCardView state="hidden" place="settings" />)).toContain(
      'Les notifications ne sont pas encore disponibles.',
    );
  });

  it('in Réglages, sits in its section without a card of its own', () => {
    const outer = (el: React.ReactElement) => html(el).match(/^<[^>]+>/)?.[0] ?? '';
    expect(outer(<PushCardView state="ask" place="settings" />)).not.toContain('frame');
    expect(outer(<PushCardView state="ask" />)).toContain('frame');
  });

  it('shows why enabling failed', () => {
    expect(text(<PushCardView state="ask" error="Réessaie." />)).toContain('Réessaie.');
  });
});

describe('NotificationBell', () => {
  it('bellLabel counts the unread ones', () => {
    expect(bellLabel(0)).toBe('Notifications');
    expect(bellLabel(1)).toBe('Notifications, 1 non lue');
    expect(bellLabel(3)).toBe('Notifications, 3 non lues');
  });

  it('starts as a labelled button without a badge', () => {
    const out = html(<NotificationBell />);
    expect(out).toContain('aria-label="Notifications"');
    expect(out).toContain('aria-expanded="false"');
    expect(out).not.toContain('data-badge');
  });

  it('lists the latest notifications with a link to each campaign', () => {
    const now = new Date('2026-10-25T12:00:00Z');
    const out = html(
      <NotificationPanel
        now={now}
        items={[
          {
            id: 'n1',
            title: 'Nouvelle réponse · Marmites inox 5 L',
            body: "Quelqu'un en veut 3 pièces (pour son usage). 12 intéressés au total.",
            url: '/app/campagnes/camp_1',
            readAt: null,
            createdAt: '2026-10-25T11:55:00Z',
          },
        ]}
      />,
    );
    expect(out).toContain('href="/app/campagnes/camp_1"');
    const t = text(
      <NotificationPanel
        now={now}
        items={[
          {
            id: 'n1',
            title: 'Nouvelle réponse · Marmites inox 5 L',
            body: 'Une personne n’est pas intéressée.',
            url: null,
            readAt: null,
            createdAt: '2026-10-25T11:55:00Z',
          },
        ]}
      />,
    );
    expect(t).toContain('Nouvelle réponse · Marmites inox 5 L');
    expect(t).toContain('il y a 5 min');
    expect(t).toContain('Tout marquer comme lu');
  });

  it('says when there is nothing yet', () => {
    expect(text(<NotificationPanel now={new Date()} items={[]} />)).toContain(
      'Les réponses de tes clients arriveront ici.',
    );
  });
});
