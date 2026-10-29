'use client';

// /app/abonnement and its return page (lot 8). BillingView and ReturnView
// are drawn from their props (the tests render them as static HTML);
// BillingScreen and ReturnScreen load. « Choisir » opens SasPay's hosted
// checkout; the return page asks where the purchase stands every 3 s for
// 2 minutes, then offers « Vérifier encore ». Nothing here trusts the
// redirect: the server verifies the payment before the pass opens.
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Card, Icon, Notice, OfferCard, PageHeader, PassMeter } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import {
  BEST_VALUE_LABEL,
  PASS_FEATURES,
  offerCards,
  purchaseStatusLabel,
  returnState,
  unlimitedCard,
  type BillingData,
  type ReturnState,
} from '@/lib/tamani/billing-view';
import { formatMoney } from '@/lib/tamani/currency';
import { formatDateFr } from '@/lib/tamani/dates';
import { LANDING_LINKS } from '@/lib/tamani/landing';
import { PLANS, isPassId, isPaymentCountry, type PassId } from '@/lib/tamani/plans';
import type { OrgRole } from './shop-context';
import { useShop } from './shop-context';

const POLL_MS = 3_000;
const POLL_FOR_MS = 120_000;

export function BillingView({
  data,
  role,
  currency,
  country,
  now,
  busy,
  error,
  help,
  onChoose,
}: {
  data: BillingData;
  role: OrgRole;
  currency: string;
  country: string;
  now: Date;
  /** The pass whose checkout is opening. */
  busy: PassId | null;
  error: string | null;
  /** Tamani's WhatsApp contact for the Illimité quote, or null while not given. */
  help: string | null;
  onChoose: (offer: PassId) => void;
}) {
  const canPay = role !== 'MEMBER';
  const unavailable = !isPaymentCountry(country)
    ? 'Bientôt disponible dans ton pays.'
    : !data.paymentAvailable
      ? 'Bientôt disponible : le paiement en ligne ouvre très vite.'
      : null;
  const running = data.pass.plan !== 'FREE' && data.pass.plan !== 'TRIAL';

  const actionFor = (id: PassId) => {
    if (unavailable) return <p className="font-bold text-ink-soft">Bientôt disponible</p>;
    if (!canPay) return null;
    return (
      <Button
        className="w-full"
        variant={id === 'MONTH_MAX' ? 'primary' : 'secondary'}
        disabled={busy !== null}
        onClick={() => onChoose(id)}
      >
        {busy === id ? 'Ouverture du paiement…' : 'Choisir'}
      </Button>
    );
  };

  return (
    <>
      <PageHeader title="Mon pass" note="Les réponses de ta boutique, payées à l'avance." />
      <PassMeter usage={data.pass} canBuy={false} now={now} className="mt-6" />
      {error && (
        <Notice tone="danger" className="mt-4">
          {error}
        </Notice>
      )}

      <section aria-labelledby="choisir-title" className="mt-8">
        <h2 id="choisir-title" className="font-hand text-2xl font-bold text-primary">
          {running ? 'Prendre un autre pass' : 'Prendre un pass'}
        </h2>
        <p className="mt-1 text-ink-soft">
          Plus de réponses&nbsp;? Prends un autre pass&nbsp;: il démarre tout de suite et garde tes
          réponses non utilisées.
        </p>
        {unavailable && (
          <Notice tone="info" className="mt-3">
            {unavailable}
          </Notice>
        )}
        {!unavailable && !canPay && (
          <Notice tone="info" className="mt-3">
            Seul le propriétaire ou un administrateur de la boutique peut prendre un pass.
          </Notice>
        )}
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {offerCards(currency).map((o) => (
            <li key={o.id}>
              <OfferCard
                name={o.name}
                price={o.price}
                durationLabel={o.durationLabel}
                responsesLabel={o.responsesLabel}
                forWho={o.forWho}
                badge={o.bestValue ? BEST_VALUE_LABEL : undefined}
                action={actionFor(o.id)}
              />
            </li>
          ))}
          <li>
            <OfferCard
              {...unlimitedCard()}
              action={
                help ? (
                  <Button
                    className="w-full"
                    variant="secondary"
                    href={help}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Contacter le support
                  </Button>
                ) : null
              }
            />
          </li>
        </ul>
      </section>

      <section aria-labelledby="inclus-title" className="mt-8">
        <h2 id="inclus-title" className="font-hand text-2xl font-bold text-primary">
          Dans chaque pass
        </h2>
        <Card className="mt-3">
          <ul className="grid gap-2 sm:grid-cols-2">
            {PASS_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Icon name="check" className="mt-0.5 size-5 shrink-0 text-success" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {data.perCampaign.length > 0 && (
        <section aria-labelledby="par-campagne-title" className="mt-8">
          <h2 id="par-campagne-title" className="font-hand text-2xl font-bold text-primary">
            Réponses par campagne
          </h2>
          <Card className="mt-3">
            <ul className="divide-y divide-grid">
              {data.perCampaign.map((c) => (
                <li key={c.campaignId} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 break-words">{c.title}</span>
                  <span className="font-bold">{c.used}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {data.purchases.length > 0 && (
        <section aria-labelledby="achats-title" className="mt-8">
          <h2 id="achats-title" className="font-hand text-2xl font-bold text-primary">
            Mes achats
          </h2>
          <Card className="mt-3">
            <ul className="divide-y divide-grid">
              {data.purchases.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {p.offer && isPassId(p.offer) ? PLANS[p.offer].label : 'Pass'} ·{' '}
                    {formatDateFr(new Date(p.createdAt), now)}
                  </span>
                  <span className="text-ink-soft">
                    {formatMoney(p.amount, currency)} · <b>{purchaseStatusLabel(p)}</b>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </>
  );
}

export function BillingScreen() {
  const { shop, role } = useShop();
  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<PassId | null>(null);

  useEffect(() => {
    let live = true;
    api<BillingData>(`/api/shops/${shop.id}/billing`)
      .then((d) => live && setData(d))
      .catch((err: unknown) => live && setError(errorMessage(err)));
    return () => {
      live = false;
    };
  }, [shop.id]);

  const choose = async (offer: PassId) => {
    if (busy) return;
    setBusy(offer);
    setError(null);
    try {
      const { checkoutUrl } = await api<{ orderId: string; checkoutUrl: string }>(
        `/api/shops/${shop.id}/billing/checkout`,
        { method: 'POST', body: JSON.stringify({ offer }) },
      );
      window.location.assign(checkoutUrl);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  };

  if (!data) {
    return error ? (
      <Notice tone="danger">{error}</Notice>
    ) : (
      <p className="text-ink-soft">Chargement de ton pass…</p>
    );
  }
  return (
    <BillingView
      data={data}
      role={role}
      currency={shop.currency}
      country={shop.country}
      now={new Date()}
      busy={busy}
      error={error}
      help={LANDING_LINKS.whatsappContact}
      onChoose={(offer) => void choose(offer)}
    />
  );
}

export function ReturnView({
  state,
  offer,
  timedOut,
  onRetry,
}: {
  state: ReturnState;
  offer: string | null;
  timedOut: boolean;
  onRetry: () => void;
}) {
  const label = offer && isPassId(offer) ? PLANS[offer].label : 'pass';
  return (
    <>
      <PageHeader title="Ton paiement" />
      <Card className="mt-6">
        {state === 'active' && (
          <>
            <h2 className="font-hand text-2xl font-bold text-success">Ton {label} est actif</h2>
            <p className="mt-1 text-ink-soft">
              Tes réponses en attente s&apos;ouvrent, les plus anciennes d&apos;abord.
            </p>
            <Button className="mt-4" href="/app/abonnement">
              Voir mon pass
            </Button>
          </>
        )}
        {state === 'failed' && (
          <>
            <h2 className="font-hand text-2xl font-bold text-danger">
              Le paiement n&apos;est pas passé
            </h2>
            <p className="mt-1 text-ink-soft">Aucun argent n&apos;a été pris pour ce pass.</p>
            <Button className="mt-4" href="/app/abonnement">
              Réessayer
            </Button>
          </>
        )}
        {state === 'checking' && (
          <>
            <h2 className="font-hand text-2xl font-bold text-primary">On vérifie ton paiement…</h2>
            <p className="mt-1 text-ink-soft" role="status">
              {timedOut
                ? "SasPay n'a pas encore confirmé. Si tu as payé, ton pass s'ouvrira tout seul dans quelques minutes."
                : 'Ça prend quelques secondes. Garde cette page ouverte.'}
            </p>
            {timedOut && (
              <Button className="mt-4" variant="secondary" onClick={onRetry}>
                Vérifier encore
              </Button>
            )}
          </>
        )}
      </Card>
    </>
  );
}

type Purchase = { id: string; offer: string | null; status: string; activated: boolean };

export function ReturnScreen() {
  const { shop, reload } = useShop();
  const orderId = useSearchParams().get('achat');
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [failedToLoad, setFailedToLoad] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [round, setRound] = useState(0);
  const reloaded = useRef(false);

  const ask = useCallback(async () => {
    if (!orderId) return null;
    const res = await api<{ purchase: Purchase }>(
      `/api/shops/${shop.id}/billing/orders/${encodeURIComponent(orderId)}`,
    );
    return res.purchase;
  }, [orderId, shop.id]);

  useEffect(() => {
    if (!orderId) return;
    let live = true;
    const started = Date.now();
    setTimedOut(false);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const p = await ask();
        if (!live || !p) return;
        setPurchase(p);
        if (returnState(p) !== 'checking') return;
      } catch {
        if (live) setFailedToLoad(true);
      }
      if (!live) return;
      if (Date.now() - started >= POLL_FOR_MS) setTimedOut(true);
      else timer = setTimeout(() => void tick(), POLL_MS);
    };
    void tick();
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [ask, orderId, round]);

  const state = returnState(purchase);
  useEffect(() => {
    // The meters and the banners follow the new pass.
    if (state === 'active' && !reloaded.current) {
      reloaded.current = true;
      void reload();
    }
  }, [state, reload]);

  if (!orderId || (failedToLoad && !purchase)) {
    return (
      <Notice tone="danger">
        Cet achat est introuvable. Ouvre{' '}
        <Link href="/app/abonnement" className="font-bold underline">
          ton pass
        </Link>{' '}
        pour voir où il en est.
      </Notice>
    );
  }
  return (
    <ReturnView
      state={state}
      offer={purchase?.offer ?? null}
      timedOut={timedOut}
      onRetry={() => setRound((n) => n + 1)}
    />
  );
}
