'use client';

// "Sois prévenu à chaque réponse" (porteur's feedback §2), on the home page
// and in Réglages. Gone once this browser receives notifications.
import { Button, Card, Icon } from '@/components/ui';
import type { PushCardState } from '@/lib/tamani/push-state';
import { cn } from '@/lib/utils';
import { usePush } from './use-push';

const COPY: Record<Exclude<PushCardState, 'hidden' | 'ask'>, string> = {
  'install-first':
    "Sur iPhone, ajoute d'abord Tamani à l'écran d'accueil : bouton Partager, puis « Sur l'écran d'accueil ». Ouvre Tamani depuis l'icône, puis reviens ici.",
  denied:
    'Les notifications sont bloquées pour Tamani. Autorise-les dans les réglages du navigateur (le cadenas à côté de l’adresse), puis recharge la page.',
  unsupported: 'Ce navigateur ne reçoit pas les notifications. Ouvre Tamani dans Chrome ou Safari.',
};

export function PushCardView({
  state,
  busy = false,
  error = null,
  onEnable,
  className,
}: {
  state: PushCardState;
  busy?: boolean;
  error?: string | null;
  onEnable?: () => void;
  className?: string;
}) {
  if (state === 'hidden') return null;
  return (
    <Card as="section" className={cn('flex gap-4 p-5', className)}>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
        <Icon name="bell" />
      </span>
      <div className="min-w-0">
        <h2 className="font-hand text-2xl leading-tight font-bold text-primary">
          Sois prévenu à chaque réponse
        </h2>
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
          <p className="mt-1 text-ink-soft">{COPY[state]}</p>
        )}
        {error && (
          <p role="alert" className="mt-2 font-bold text-danger">
            {error}
          </p>
        )}
      </div>
    </Card>
  );
}

export function PushCard({ className }: { className?: string }) {
  const { state, busy, error, enable } = usePush();
  return (
    <PushCardView
      state={state}
      busy={busy}
      error={error}
      onEnable={() => void enable()}
      {...(className ? { className } : {})}
    />
  );
}
