'use client';

// /app (porteur's feedback §3 bis): one blue "Cette semaine" card like a
// mobile-money balance, the money protected this month, four round
// shortcuts like WhatsApp's, then the bulletin (lot 6: what to do now, a
// verdict line per campaign), the activity as a transaction history and
// what is coming up. A shop without a campaign sees its first steps instead.
// On a desktop (lot 7a) the three actions sit on the title row, the
// verdicts become tiles, and from 1280px what to do, the activity and what
// is coming up move to a column on the right.
// Notifications are not asked here (feedback 2, §7): PushPrompt asks on a
// phone, Réglages keeps the switch.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Icon, Notice, PageHeader, VerdictTile, type IconName } from '@/components/ui';
import type { VerdictTone } from '@/lib/design/tokens';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import { formatDateFr } from '@/lib/tamani/dates';
import {
  activityLine,
  campaignVerdictLine,
  greeting,
  onboardingSteps,
  todoLine,
  upcomingLine,
  verdictCalc,
  verdictGauge,
  type ActivityLine,
  type ShopSummary,
  type TodoItem,
} from '@/lib/tamani/home-view';
import { relativeTime } from '@/lib/tamani/relative-time';
import { waShareLink } from '@/lib/tamani/wa';
import { formatMoney } from '@/lib/tamani/currency';
import { cn } from '@/lib/utils';
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
        action={
          summary?.hasCampaign ? (
            <DesktopActions
              shareMessage={summary.shareCampaign?.shareMessage ?? null}
              className="justify-end xl:flex"
            />
          ) : undefined
        }
      />
      {/* From 1024 to 1279px the title row is too narrow for three buttons: they go under it. */}
      {summary?.hasCampaign && (
        <DesktopActions
          shareMessage={summary.shareCampaign?.shareMessage ?? null}
          className="mt-4 lg:flex xl:hidden"
        />
      )}
      {error && (
        <Notice tone="danger" className="mt-6">
          {error}
        </Notice>
      )}
      {!summary && !error && <HomeLoading />}
      {summary && !summary.hasCampaign && <FirstSteps summary={summary} />}
      {summary?.hasCampaign && (
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start xl:gap-8">
          <div className="min-w-0">
            <WeekCard week={summary.week} />
            <MoneyProtected
              amount={summary.moneyProtectedThisMonth}
              currency={shop.currency}
              prefix="d-"
              className="mt-6 hidden lg:block"
            />
            <Shortcuts shareMessage={summary.shareCampaign?.shareMessage ?? null} />
            <div className="xl:hidden">
              <TodoNow summary={summary} prefix="m-" />
            </div>
            <Campaigns summary={summary} />
            {/* On a phone the money keeps its place after the campaigns (spec §3). */}
            <MoneyProtected
              amount={summary.moneyProtectedThisMonth}
              currency={shop.currency}
              prefix="m-"
              className="mt-8 lg:hidden"
            />
            <VerdictTiles summary={summary} />
            <div className="xl:hidden">
              <Activity summary={summary} now={now} prefix="m-" title="Activité" />
              <Upcoming summary={summary} now={now} prefix="m-" />
            </div>
          </div>
          <aside
            aria-label="À faire et activité"
            className="hidden xl:sticky xl:top-24 xl:mt-6 xl:flex xl:max-h-[calc(100dvh-7rem)] xl:flex-col xl:overflow-y-auto xl:pr-1 xl:pb-2"
          >
            <TodoNow summary={summary} prefix="d-" empty="Rien à faire pour le moment." />
            <Activity summary={summary} now={now} prefix="d-" title="Activité récente" />
            <Upcoming summary={summary} now={now} prefix="d-" />
          </aside>
        </div>
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
    <nav aria-label="Raccourcis" className="mt-6 lg:hidden">
      <ul className="grid grid-cols-4 gap-2">
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
    </nav>
  );
}

/** The desktop's three actions on the title row, the campaign last, as on the mockup. */
function DesktopActions({
  shareMessage,
  className,
}: {
  shareMessage: string | null;
  className: string;
}) {
  return (
    <div className={cn('hidden flex-wrap items-center gap-2', className)}>
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
      <Button href="/app/produits/nouveau" variant="secondary">
        Ajouter un produit
      </Button>
      <Button href="/app/campagnes/nouvelle">Créer une campagne</Button>
    </div>
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

const TODO_ROUND: Record<TodoItem['kind'], string> = {
  NOTIFY_INTERESTED: 'bg-whatsapp text-whatsapp-ink',
  CONFIRM_ORDERS: 'bg-accent text-accent-ink',
  DELIVER: 'bg-accent text-accent-ink',
};

function TodoNow({
  summary,
  prefix,
  empty,
}: {
  summary: ShopSummary;
  /** The phone and the desktop copies each need their own heading id. */
  prefix: string;
  /** The desktop column keeps its heading and says when nothing waits. */
  empty?: string;
}) {
  if (summary.todo.length === 0 && !empty) return null;
  return (
    <section aria-labelledby={`${prefix}todo-title`} className="mt-8 xl:first:mt-0">
      <h2 id={`${prefix}todo-title`} className="font-hand text-2xl font-bold text-primary">
        À faire maintenant
      </h2>
      {summary.todo.length === 0 ? (
        <p className="mt-2 text-ink-soft">{empty}</p>
      ) : (
        <ul className="frame mt-3 divide-y-2 divide-grid overflow-hidden rounded-card bg-surface">
          {summary.todo.map((item) => {
            const line = todoLine(item);
            return (
              <Row
                key={
                  item.kind === 'NOTIFY_INTERESTED' ? `${item.kind}-${item.campaignId}` : item.kind
                }
                href={line.href}
                icon={line.icon}
                round={TODO_ROUND[item.kind]}
                title={line.title}
                detail={line.detail}
                side={<span className="text-sm font-bold text-primary">{line.action}</span>}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}

const VERDICT_TEXT: Record<VerdictTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-neutral-verdict',
  primary: 'text-primary',
};

function Campaigns({ summary }: { summary: ShopSummary }) {
  if (summary.campaigns.length === 0) return null;
  return (
    <section aria-labelledby="campaigns-title" className="mt-8 lg:hidden">
      <h2 id="campaigns-title" className="font-hand text-2xl font-bold text-primary">
        Tes campagnes
      </h2>
      <ul className="frame mt-3 divide-y-2 divide-grid overflow-hidden rounded-card bg-surface">
        {summary.campaigns.map((item) => {
          const line = campaignVerdictLine(item);
          const answers = `${item.completed} ${plural(item.completed, 'réponse', 'réponses')}`;
          return (
            <Row
              key={item.id}
              href={line.href}
              icon={line.locked ? 'lock' : 'megaphone'}
              round={line.locked ? 'bg-bg text-ink-muted' : 'bg-accent text-accent-ink'}
              title={line.title}
              detail={item.offered ? `${answers}, verdict offert` : answers}
              side={
                <>
                  <span className={cn('block font-bold', VERDICT_TEXT[line.tone])}>
                    {line.word}
                  </span>
                  {line.figure && <span className="block text-sm text-ink">{line.figure}</span>}
                </>
              }
            />
          );
        })}
      </ul>
    </section>
  );
}

/** From 1024px: a tile per open campaign, the verdict as the screen's strong element. */
function VerdictTiles({ summary }: { summary: ShopSummary }) {
  if (summary.campaigns.length === 0) return null;
  return (
    <section aria-labelledby="verdicts-title" className="mt-8 hidden lg:block">
      <h2 id="verdicts-title" className="font-hand text-2xl font-bold text-primary">
        Tes verdicts
      </h2>
      <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {summary.campaigns.map((item) => {
          const answers = `${item.completed} ${plural(item.completed, 'réponse', 'réponses')}`;
          return (
            <li key={item.id} className="min-w-0">
              <VerdictTile
                line={campaignVerdictLine(item)}
                answers={item.offered ? `${answers}, verdict offert` : answers}
                calc={verdictCalc(item)}
                gauge={verdictGauge(item)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MoneyProtected({
  amount,
  currency,
  prefix,
  className,
}: {
  amount: number;
  currency: string;
  /** The phone and the desktop copies each need their own heading id. */
  prefix: string;
  className: string;
}) {
  if (amount <= 0) return null;
  return (
    <section aria-labelledby={`${prefix}money-title`} className={className}>
      <h2 id={`${prefix}money-title`} className="font-hand text-2xl font-bold text-primary">
        Argent protégé ce mois-ci
      </h2>
      <p className="mt-2 text-lg text-ink">
        <span className="highlight font-sign text-3xl">{formatMoney(amount, currency)}</span> de
        stock qui ne dormira pas au dépôt, grâce à tes verdicts.
      </p>
    </section>
  );
}

function Activity({
  summary,
  now,
  prefix,
  title,
}: {
  summary: ShopSummary;
  now: Date;
  prefix: string;
  title: string;
}) {
  return (
    <section aria-labelledby={`${prefix}activity-title`} className="mt-8">
      <h2 id={`${prefix}activity-title`} className="font-hand text-2xl font-bold text-primary">
        {title}
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

function Upcoming({ summary, now, prefix }: { summary: ShopSummary; now: Date; prefix: string }) {
  if (summary.upcoming.length === 0) return null;
  return (
    <section aria-labelledby={`${prefix}upcoming-title`} className="mt-8">
      <h2 id={`${prefix}upcoming-title`} className="font-hand text-2xl font-bold text-primary">
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
