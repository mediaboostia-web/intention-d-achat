'use client';

// The Résultats tab of a campaign (spec §5.4): the verdict when the plan
// shows it, then the figures every plan sees. CampaignResultsTab loads
// GET …/stats; CampaignResults only draws what it is given.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Badge,
  Button,
  CalcTable,
  Card,
  DataList,
  DemandGauge,
  EmptyState,
  MoneyCard,
  Notice,
  StockCard,
  VerdictCard,
} from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import {
  coefNote,
  percentRows,
  priceSignal,
  provisionalNote,
  stockAdviceDisplay,
  stockLine,
  toServeLine,
  type CampaignStatsBody,
} from '@/lib/tamani/results-view';
import { TIMING_LABELS } from '@/lib/tamani/timing';
import { DEFAULT_MIN_RESPONSES, pluralizeUnit } from '@/lib/tamani/verdict-display';

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="mt-8 font-hand text-2xl font-bold text-primary">{children}</h2>;
}

function OfferedNote() {
  return (
    <p className="mt-3 font-hand text-lg text-ink-soft">
      Verdict offert pour ta première campagne. Avec Pro, tu l&apos;as sur toutes.
    </p>
  );
}

/**
 * An in-stock campaign (lot 6b): the people to serve now, then whether the
 * stock will last. Never a wait: they want to buy today.
 */
function InStockHead({
  body,
  base,
  unitLabel,
  calc,
  money,
  locked,
}: {
  body: CampaignStatsBody;
  base: string;
  unitLabel: string;
  calc: ReactNode;
  money: ReactNode;
  locked: (title: string, pitch: string) => ReactNode;
}) {
  const { stats, access } = body;
  const result = access === 'LOCKED' ? null : stats.result;
  const units = (n: number) => pluralizeUnit(unitLabel, n);
  const advice = result?.stockAdvice ?? null;
  return (
    <>
      {stats.interested > 0 && (
        <Card className="mb-8">
          <h2 className="font-hand text-2xl font-bold text-primary">À servir maintenant</h2>
          <p className="mt-2 text-lg font-bold text-ink">
            {toServeLine(stats.interested, stats.announced, unitLabel)}
          </p>
          {stats.byTiming.length > 0 && (
            <DataList
              className="mt-2"
              items={stats.byTiming.map((t) => ({
                id: t.timing,
                label: TIMING_LABELS[t.timing],
                value: `${t.respondents} · ${t.quantity} ${units(t.quantity)}`,
              }))}
            />
          )}
          <Button className="mt-4" href={`${base}?onglet=interesses`}>
            Voir les intéressés
          </Button>
        </Card>
      )}
      {stats.stock === null ? (
        <Notice
          tone="info"
          action={
            <Button href={`${base}?onglet=modifier`} variant="secondary">
              Indiquer le stock
            </Button>
          }
        >
          Indique ton stock dans la campagne pour savoir s&apos;il suffira.
        </Notice>
      ) : advice ? (
        <StockCard
          {...stockAdviceDisplay(advice, stats.stock, unitLabel)}
          note={advice.provisional ? provisionalNote(stats.completed) : undefined}
        />
      ) : (
        locked(
          'Ton stock va-t-il suffire ?',
          'Avec Pro, Tamani compare la demande réaliste à ton stock et te dit quand réassortir.',
        )
      )}
      {result && access === 'OFFERED' && <OfferedNote />}
      {result && stats.stock !== null && stats.stock > 0 && (
        <DemandGauge
          className="mt-6"
          realistic={result.estimate.realistic}
          announced={stats.announced}
          reference={stats.stock}
          referenceLabel="en stock"
        />
      )}
      {calc}
      {money}
    </>
  );
}

export function CampaignResults({
  body,
  campaignId,
  productId,
  unitLabel,
}: {
  body: CampaignStatsBody;
  campaignId: string;
  productId: string;
  unitLabel: string;
}) {
  const { stats, access, offerOpen } = body;
  const base = `/app/campagnes/${campaignId}`;
  const result = access === 'LOCKED' ? null : stats.result;
  const units = (n: number) => pluralizeUnit(unitLabel, n);
  const answers = (n: number) => `${n} ${plural(n, 'réponse', 'réponses')}`;

  const pending = stats.lockedCount > 0 && (
    <Notice
      tone="warning"
      action={
        <Button href="/app/plus" variant="secondary">
          Voir les forfaits
        </Button>
      }
    >
      {stats.lockedCount} {plural(stats.lockedCount, 'réponse en attente', 'réponses en attente')}
      &nbsp;: ton forfait du mois est plein. Elles s&apos;affichent dès que tu passes au forfait
      supérieur.
    </Notice>
  );

  if (stats.completed === 0) {
    return (
      <div className="flex flex-col gap-6">
        {pending}
        <EmptyState
          title="Pas encore de réponse"
          action={<Button href={`${base}?onglet=partager`}>Partager la campagne</Button>}
        >
          Partage le lien sur WhatsApp : les réponses de ta communauté arriveront ici.
        </EmptyState>
      </div>
    );
  }

  const inStock = stats.availability === 'IN_STOCK';
  // In stock, the stock card says it; the shortage line is for an order to come.
  const shortage =
    result && !inStock
      ? stockLine({
          status: result.stockStatus,
          realistic: result.estimate.realistic,
          stock: stats.stock,
          unitLabel,
        })
      : null;
  const signal = priceSignal(stats.noReasons, stats.notInterested);
  const when = percentRows(
    stats.byTiming.map((t) => ({
      id: t.timing,
      label: TIMING_LABELS[t.timing],
      count: t.respondents,
    })),
  );
  const where = [
    ...stats.byZone.map((z) => ({ id: z.zoneId, label: z.name, value: z.respondents })),
    ...(stats.pickup.respondents > 0
      ? [{ id: 'pickup', label: 'Retrait sur place', value: stats.pickup.respondents }]
      : []),
    ...(stats.elsewhere.respondents > 0
      ? [{ id: 'elsewhere', label: 'Autre endroit', value: stats.elsewhere.respondents }]
      : []),
  ];
  // A buyer type nobody chose is left out.
  const buyers = (['RESELLER', 'CONSUMER'] as const)
    .map((t) => ({ t, ...stats.byBuyerType[t] }))
    .filter((b) => b.respondents > 0)
    .map((b) => ({
      id: b.t,
      label: b.t === 'RESELLER' ? 'Revendeurs' : 'Usagers',
      value: `${b.respondents} · ${b.announced} ${units(b.announced)}`,
    }));
  const rate = stats.interestRate === null ? '' : ` (${Math.round(stats.interestRate * 100)} %)`;
  const missing = Math.max(DEFAULT_MIN_RESPONSES - stats.completed, 0);

  const calc = result && (
    <details className="mt-6">
      <summary className="cursor-pointer font-bold text-primary">
        Comment c&apos;est calculé ?
      </summary>
      <CalcTable
        className="mt-2"
        rows={[
          {
            label: 'Revendeurs',
            count: result.estimate.byBuyerType.RESELLER.respondents,
            announced: result.estimate.byBuyerType.RESELLER.announced,
            coef: result.coefs.reseller,
            realistic: result.estimate.byBuyerType.RESELLER.realistic,
          },
          {
            label: 'Usagers',
            count: result.estimate.byBuyerType.CONSUMER.respondents,
            announced: result.estimate.byBuyerType.CONSUMER.announced,
            coef: result.coefs.consumer,
            realistic: result.estimate.byBuyerType.CONSUMER.realistic,
          },
        ]}
        total={{ announced: result.estimate.announced, realistic: result.estimate.realistic }}
        footnote={coefNote(result.coefs)}
      />
    </details>
  );
  const money = result?.money && (
    <MoneyCard
      className="mt-7"
      avoidedDeadStock={result.money.avoidedDeadStock}
      expectedProfit={result.money.expectedProfit}
      addCostPriceHref={`/app/produits/${productId}`}
      {...(stats.reference === null || inStock ? {} : { reference: stats.reference })}
    />
  );
  /** What the plan hides, with the way to Pro. */
  const locked = (title: string, pitch: string) => (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-hand text-2xl font-bold text-primary">{title}</h2>
        <Badge tone="accent">Pro</Badge>
      </div>
      <p className="mt-2 text-lg font-bold text-ink">
        {answers(stats.completed)}, {stats.announced} {units(stats.announced)} annoncées.
      </p>
      {offerOpen ? (
        <p className="mt-1 text-ink-soft">
          Ton premier verdict est offert. Il arrive dès qu&apos;une campagne atteint{' '}
          {DEFAULT_MIN_RESPONSES} réponses : encore {missing} pour celle-ci.
        </p>
      ) : (
        <p className="mt-1 text-ink-soft">{pitch}</p>
      )}
      <Button className="mt-4" href="/app/plus" variant={offerOpen ? 'secondary' : 'primary'}>
        Passer au Pro
      </Button>
    </Card>
  );

  return (
    <div>
      {pending && <div className="mb-6">{pending}</div>}

      {inStock ? (
        <InStockHead
          body={body}
          base={base}
          unitLabel={unitLabel}
          calc={calc}
          money={money}
          locked={locked}
        />
      ) : result ? (
        <>
          <VerdictCard
            code={result.verdict.code}
            realistic={result.estimate.realistic}
            completedResponses={stats.completed}
            reference={stats.reference}
            unitLabel={unitLabel}
            {...(result.verdict.code === 'WAIT'
              ? {}
              : {
                  basis: {
                    low: result.estimate.low,
                    high: result.estimate.high,
                    interestedCount: stats.interested,
                  },
                })}
          />
          {access === 'OFFERED' && <OfferedNote />}
          {stats.reference !== null && stats.reference > 0 && (
            <DemandGauge
              className="mt-6"
              realistic={result.estimate.realistic}
              announced={stats.announced}
              reference={stats.reference}
            />
          )}
          {calc}
          {money}
        </>
      ) : (
        locked(
          'Combien commander ?',
          'Avec Pro, Tamani calcule la demande réaliste et te dit combien commander.',
        )
      )}

      <Heading>Les chiffres</Heading>
      <DataList
        items={[
          { id: 'opens', label: 'Ouvertures du lien', value: stats.opens },
          { id: 'completed', label: 'Réponses complètes', value: stats.completed },
          { id: 'interested', label: 'Intéressés', value: `${stats.interested}${rate}` },
          { id: 'not', label: 'Pas intéressés', value: stats.notInterested },
          ...(stats.incomplete > 0
            ? [{ id: 'incomplete', label: 'Commencées sans finir', value: stats.incomplete }]
            : []),
        ]}
      />

      {buyers.length > 0 && (
        <>
          <Heading>Revendeurs et usagers</Heading>
          <DataList items={buyers} />
        </>
      )}

      {shortage && (
        <Notice tone="warning" className="mt-6">
          {shortage}
        </Notice>
      )}

      {where.length > 0 && (
        <>
          <Heading>Où livrer</Heading>
          <DataList items={where} />
        </>
      )}

      {when.length > 0 && (
        <>
          <Heading>Quand</Heading>
          <DataList items={when} />
        </>
      )}

      {stats.byOption.length > 0 && (
        <>
          <Heading>Options</Heading>
          <DataList
            items={stats.byOption.map((o) => ({
              id: o.option,
              label: o.option,
              value: `${o.quantity} ${units(o.quantity)}`,
            }))}
          />
        </>
      )}

      {stats.bySource.length > 1 && (
        <>
          <Heading>D&apos;où viennent les réponses</Heading>
          <DataList
            items={stats.bySource.map((s) => ({
              id: s.linkId,
              label: s.label,
              value: `${answers(s.completed)} · ${s.opens} ouvertures`,
            }))}
          />
        </>
      )}

      {signal && (
        <p className="mt-6 font-hand text-xl text-ink-soft">
          {signal.lead}{' '}
          <span className="inline-block -rotate-3 rounded-[50%] border-2 border-margin px-2 font-bold text-danger">
            {signal.word}
          </span>
        </p>
      )}

      {stats.interested > 0 && (
        <Button className="mt-7" href={`${base}?onglet=interesses`}>
          {stats.interested === 1 ? "Voir l'intéressé" : `Voir les ${stats.interested} intéressés`}
        </Button>
      )}
    </div>
  );
}

/** Loads the campaign's figures, then draws them. */
export function CampaignResultsTab({
  shopId,
  campaignId,
  productId,
  unitLabel,
}: {
  shopId: string;
  campaignId: string;
  productId: string;
  unitLabel: string;
}) {
  const [body, setBody] = useState<CampaignStatsBody | null>(null);
  const [error, setError] = useState<string | null>(null);
  const path = `/api/shops/${shopId}/campaigns/${encodeURIComponent(campaignId)}/stats`;

  const load = useCallback(async () => {
    setError(null);
    try {
      setBody(await api<CampaignStatsBody>(path));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <Notice
        tone="danger"
        action={
          <Button variant="secondary" onClick={() => void load()}>
            Réessayer
          </Button>
        }
      >
        {error}
      </Notice>
    );
  }
  if (!body) {
    return (
      <div role="status" className="flex flex-col gap-4 motion-safe:animate-pulse">
        <span className="sr-only">Chargement des résultats…</span>
        <span aria-hidden="true" className="h-24 w-2/3 rounded-card bg-grid/70" />
        <span aria-hidden="true" className="h-10 rounded-card bg-grid/70" />
        <span aria-hidden="true" className="h-40 rounded-card bg-grid/70" />
      </div>
    );
  }
  return (
    <CampaignResults
      body={body}
      campaignId={campaignId}
      productId={productId}
      unitLabel={unitLabel}
    />
  );
}
