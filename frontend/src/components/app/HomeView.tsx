'use client';

// /app (porteur's feedback §3 bis): one blue "Cette semaine" card like a
// mobile-money balance, four round shortcuts like WhatsApp's, then the
// activity as a transaction history and what is coming up. A shop without
// a campaign sees its first steps instead.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Icon, Notice, PageHeader, type IconName } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import { formatDateFr } from '@/lib/tamani/dates';
import {
  activityLine,
  greeting,
  onboardingSteps,
  upcomingLine,
  type ActivityLine,
  type ShopSummary,
} from '@/lib/tamani/home-view';
import { relativeTime } from '@/lib/tamani/relative-time';
import { waShareLink } from '@/lib/tamani/wa';
import { cn } from '@/lib/utils';
import { PushCard } from './PushCard';
import { useShop } from './shop-context';

/** `summary` is given by tests; the page loads it. */
export function HomeView({ summary: given }: { summary?: ShopSummary }) {
  const { shop, me } = useShop();
  const [loaded, setLoaded] = useState<{ summary: ShopSummary | null; error: string | null }>({
    summary: given ?? null,
    error: null,
  });

  useEffect(() => {
    if (given) return;
    let live = true;
    api<{ summary: ShopSummary }>(`/api/shops/${shop.id}/summary`)
      .then((res) => live && setLoaded({ summary: res.summary, error: null }))
      .catch((err: unknown) => live && setLoaded({ summary: null, error: errorMessage(err) }));
    return () => {
      live = false;
    };
  }, [given, shop.id]);

  const now = new Date();
  const { summary, error } = loaded;
  return (
    <>
      <PageHeader
        title={greeting(me.firstName, shop.name, now)}
        note={`Aujourd'hui, ${formatDateFr(now)}`}
      />
      {error && (
        <Notice tone="danger" className="mt-6">
          {error}
        </Notice>
      )}
      {!summary && !error && <HomeLoading />}
      {summary && !summary.hasCampaign && <FirstSteps summary={summary} />}
      {summary?.hasCampaign && (
        <>
          <WeekCard week={summary.week} />
          <Shortcuts shareMessage={summary.shareCampaign?.shareMessage ?? null} />
        </>
      )}
      <PushCard className="mt-8" />
      {summary?.hasCampaign && (
        <>
          <Activity summary={summary} now={now} />
          <Upcoming summary={summary} now={now} />
        </>
      )}
    </>
  );
}

function HomeLoading() {
  return (
    <div role="status" aria-label="Chargement de l'accueil" className="mt-6">
      <div aria-hidden="true" className="flex flex-col gap-4 motion-safe:animate-pulse">
        <span className="h-44 rounded-card bg-grid/70" />
        <span className="h-16 rounded-card bg-grid/70" />
        <span className="h-40 rounded-card bg-grid/70" />
      </div>
    </div>
  );
}

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

function WeekCard({ week }: { week: ShopSummary['week'] }) {
  const figures: Array<{ value: number; label: string; href: string }> = [
    {
      value: week.interested,
      label: plural(week.interested, 'intéressé', 'intéressés'),
      href: '/app/campagnes',
    },
    {
      value: week.opensRunning,
      label: 'ouvertures en cours',
      href: '/app/campagnes?statut=ACTIVE',
    },
    {
      value: week.newClients,
      label: plural(week.newClients, 'nouveau client', 'nouveaux clients'),
      href: '/app/clients',
    },
  ];
  return (
    <section
      aria-labelledby="week-title"
      className="frame mt-6 rounded-card bg-primary p-5 text-primary-ink shadow-press"
    >
      <h2 id="week-title" className="font-hand text-xl font-bold">
        Cette semaine
      </h2>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
        <span className="font-sign text-5xl leading-none">{week.completed}</span>
        <span className="text-lg font-bold">{plural(week.completed, 'réponse', 'réponses')}</span>
      </p>
      <p className="mt-2 text-sm font-bold">+{week.sinceYesterday} depuis hier</p>
      <ul className="mt-5 grid grid-cols-3 gap-2 border-t-2 border-primary-ink/30 pt-4">
        {figures.map((f) => (
          <li key={f.href}>
            <Link
              href={f.href}
              className="flex min-h-12 flex-col rounded-control p-1.5 hover:bg-primary-ink/10 focus-visible:outline-accent"
            >
              <span className="font-sign text-2xl leading-tight">{f.value}</span>
              <span className="text-xs leading-tight">{f.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Shortcuts({ shareMessage }: { shareMessage: string | null }) {
  const share = shareMessage ? waShareLink(shareMessage) : '/app/campagnes/nouvelle';
  const rounds: Array<{ label: string; href: string; icon: IconName; tone: string }> = [
    {
      label: 'Campagne',
      href: '/app/campagnes/nouvelle',
      icon: 'megaphone',
      tone: 'bg-accent text-accent-ink',
    },
    { label: 'Produit', href: '/app/produits/nouveau', icon: 'box', tone: 'bg-surface text-ink' },
    {
      label: 'Partager',
      href: share,
      icon: 'whatsapp',
      tone: shareMessage ? 'bg-whatsapp text-whatsapp-ink' : 'bg-surface text-ink',
    },
    { label: 'Clients', href: '/app/clients', icon: 'people', tone: 'bg-surface text-ink' },
  ];
  return (
    <nav aria-label="Raccourcis" className="mt-6">
      <ul className="grid grid-cols-4 gap-2 lg:hidden">
        {rounds.map((r) => {
          const body = (
            <>
              <span
                className={cn(
                  'frame flex size-14 items-center justify-center rounded-full transition-transform group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0',
                  r.tone,
                )}
              >
                <Icon name={r.icon} />
              </span>
              <span className="text-xs font-bold text-ink">{r.label}</span>
            </>
          );
          const classes = 'group flex flex-col items-center gap-1.5 rounded-control py-1';
          return (
            <li key={r.label}>
              {r.href.startsWith('https://') ? (
                <a href={r.href} target="_blank" rel="noopener noreferrer" className={classes}>
                  {body}
                </a>
              ) : (
                <Link href={r.href} className={classes}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <div className="hidden flex-wrap gap-3 lg:flex">
        <Button href="/app/campagnes/nouvelle">Créer une campagne</Button>
        <Button href="/app/produits/nouveau" variant="secondary">
          Ajouter un produit
        </Button>
        {shareMessage && (
          <Button
            href={waShareLink(shareMessage)}
            variant="whatsapp"
            target="_blank"
            rel="noopener noreferrer"
          >
            Partager sur WhatsApp
          </Button>
        )}
        <Button href="/app/clients" variant="secondary">
          Voir mes clients
        </Button>
      </div>
    </nav>
  );
}

const ROUND_TONE: Record<ActivityLine['tone'], string> = {
  yes: 'bg-success text-primary-ink',
  no: 'bg-danger text-primary-ink',
  neutral: 'bg-accent text-accent-ink',
};

function Row({
  href,
  icon,
  round,
  title,
  detail,
  side,
}: {
  href: string;
  icon: IconName;
  round: string;
  title: string;
  detail: string;
  side: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-bg">
        <span
          className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', round)}
        >
          <Icon name={icon} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-ink">{title}</span>
          <span className="block truncate text-sm text-ink-soft">{detail}</span>
        </span>
        <span className="shrink-0 text-right">{side}</span>
      </Link>
    </li>
  );
}

function Activity({ summary, now }: { summary: ShopSummary; now: Date }) {
  return (
    <section aria-labelledby="activity-title" className="mt-8">
      <h2 id="activity-title" className="font-hand text-2xl font-bold text-primary">
        Activité
      </h2>
      {summary.activity.length === 0 ? (
        <p className="mt-3 text-ink-soft">
          Pas encore de réponse. Partage ton lien sur WhatsApp pour recevoir les premières.
        </p>
      ) : (
        <ul
          aria-label="Activité"
          className="frame mt-3 divide-y-2 divide-grid overflow-hidden rounded-card bg-surface"
        >
          {summary.activity.map((item) => {
            const line = activityLine(item);
            return (
              <Row
                key={`${item.kind}-${item.id}`}
                href={line.href}
                icon={line.icon}
                round={ROUND_TONE[line.tone]}
                title={line.title}
                detail={line.detail}
                side={
                  <>
                    <span className="block text-xs text-ink-muted">
                      {relativeTime(new Date(item.at), now)}
                    </span>
                    {line.amount && (
                      <span
                        className={cn(
                          'block font-bold',
                          line.tone === 'yes' ? 'text-success' : 'text-danger',
                        )}
                      >
                        {line.amount}
                      </span>
                    )}
                  </>
                }
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Upcoming({ summary, now }: { summary: ShopSummary; now: Date }) {
  if (summary.upcoming.length === 0) return null;
  return (
    <section aria-labelledby="upcoming-title" className="mt-8">
      <h2 id="upcoming-title" className="font-hand text-2xl font-bold text-primary">
        À venir
      </h2>
      <ul className="frame mt-3 divide-y-2 divide-grid overflow-hidden rounded-card bg-surface">
        {summary.upcoming.map((item) => {
          const line = upcomingLine(item, now);
          return (
            <Row
              key={`${item.kind}-${item.campaignId}`}
              href={line.href}
              icon={item.kind === 'ENDS' ? 'clock' : 'truck'}
              round="bg-accent text-accent-ink"
              title={line.title}
              detail={item.kind === 'ENDS' ? 'La campagne se termine' : 'La marchandise arrive'}
              side={<span className="text-sm font-bold text-ink">{line.when}</span>}
            />
          );
        })}
      </ul>
    </section>
  );
}

function FirstSteps({ summary }: { summary: ShopSummary }) {
  return (
    <section aria-labelledby="start-title" className="frame mt-6 rounded-card bg-surface p-5">
      <h2 id="start-title" className="font-hand text-2xl font-bold text-primary">
        Pour bien démarrer
      </h2>
      <p className="mt-1 text-ink-soft">
        Ajoute un produit, puis partage une campagne sur WhatsApp : ta communauté te dit combien en
        commander.
      </p>
      <ol className="mt-4 flex flex-col gap-3">
        {onboardingSteps(summary).map((step, i) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="flex min-h-14 items-center gap-3 rounded-control border-2 border-ink px-3 font-bold text-ink hover:bg-bg"
            >
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full',
                  step.done ? 'bg-success text-primary-ink' : 'bg-accent text-accent-ink',
                )}
              >
                {step.done ? <Icon name="check" className="size-5" /> : i + 1}
              </span>
              {step.label}
              {step.done && <span className="sr-only"> (fait)</span>}
              <Icon name="chevron-right" className="ml-auto" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
