'use client';

// "Sois prévenu à chaque réponse" (porteur's feedback §2): the body of the
// Notifications section in Réglages, which also says when they are on. The
// home page no longer shows it: on a phone, PushPrompt asks instead (§7).
import { Button, Card, Icon } from '@/components/ui';
import type { PushCardState } from '@/lib/tamani/push-state';
import { cn } from '@/lib/utils';
import { usePush } from './use-push';

type Place = 'home' | 'settings';

/** iPhones get Web Push only from the home screen icon. Shared with PushPrompt. */
export const INSTALL_FIRST_COPY =
  "Sur iPhone, ajoute d'abord Tamani à l'écran d'accueil : bouton Partager, puis « Sur l'écran d'accueil ». Ouvre Tamani depuis l'icône, puis reviens ici.";

const COPY: Record<Exclude<PushCardState, 'hidden' | 'ask'>, string> = {
  'install-first': INSTALL_FIRST_COPY,
  denied:
    'Les notifications sont bloquées pour Tamani. Autorise-les dans les réglages du navigateur (le cadenas à côté de l’adresse), puis recharge la page.',
  unsupported: 'Ce navigateur ne reçoit pas les notifications. Ouvre Tamani dans Chrome ou Safari.',
  on: 'Les notifications sont activées sur cet appareil.',
};

export function PushCardView({
  state,
  place = 'home',
  busy = false,
  error = null,
  onEnable,
  className,
}: {
  state: PushCardState;
  place?: Place;
  busy?: boolean;
  error?: string | null;
  onEnable?: () => void;
  className?: string;
}) {
  const settings = place === 'settings';
  if (state === 'hidden') {
    return settings ? (
      <p className={cn('text-ink-muted', className)}>
        Les notifications ne sont pas encore disponibles.
      </p>
    ) : null;
  }
  const Title = settings ? 'h3' : 'h2';
  const body = (
    <>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
        <Icon name={state === 'on' ? 'check' : 'bell'} />
      </span>
      <div className="min-w-0">
        {state !== 'on' && (
          <Title className="font-hand text-2xl leading-tight font-bold text-primary">
            Sois prévenu à chaque réponse
          </Title>
        )}
        {state === 'ask' ? (
          <>
            <p className="mt-1 text-ink-soft">
              Une notification sur ton téléphone dès qu&apos;un client répond, même quand Tamani est
              fermé.
            </p>
            <Button className="mt-3 shadow-press" disabled={busy} onClick={onEnable}>
              Activer les notifications
            </Button>
          </>
        ) : (
          <p className={cn('text-ink-soft', state === 'on' ? 'pt-2.5' : 'mt-1')}>{COPY[state]}</p>
        )}
        {error && (
          <p role="alert" className="mt-2 font-bold text-danger">
            {error}
          </p>
        )}
      </div>
    </>
  );
  return settings ? (
    <div className={cn('flex gap-4', className)}>{body}</div>
  ) : (
    <Card as="section" className={cn('flex gap-4 p-5', className)}>
      {body}
    </Card>
  );
}

export function PushCard({ place = 'home', className }: { place?: Place; className?: string }) {
  const { state, ready, busy, error, enable } = usePush(place);
  if (place === 'settings' && !ready) {
    return (
      <p role="status" className="text-ink-muted">
        Vérification des notifications…
      </p>
    );
  }
  return (
    <PushCardView
      state={state}
      place={place}
      busy={busy}
      error={error}
      onEnable={() => void enable()}
      {...(className ? { className } : {})}
    />
  );
}
