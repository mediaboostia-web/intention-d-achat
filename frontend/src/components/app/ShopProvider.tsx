'use client';

// The gate of /app: reads the session (AuthProvider) and the shop
// (GET /api/shops/me), then lets gateDecision say what the page may show.
// Pages under the shell read the shop with useShop(); the welcome page,
// which has no shop yet, reports the one it creates with useShopGate().
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button, Logo } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import { PLANS } from '@/lib/tamani/plans';
import { gateDecision } from '@/lib/tamani/shop-gate';
import { AppShell } from './AppShell';
import {
  ShopContext,
  ShopGateContext,
  type OrgRole,
  type Shop,
  type ShopGateActions,
  type ShopMe,
  type ShopUsage,
} from './shop-context';

export {
  ShopContext,
  ShopGateContext,
  useShop,
  useShopGate,
  type OrgRole,
  type Shop,
  type ShopContextValue,
  type ShopGateActions,
  type ShopMe,
  type ShopUsage,
} from './shop-context';

type Loaded =
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'error'; message: string }
  | { status: 'ready'; shop: Shop; role: OrgRole; usage: ShopUsage; me: ShopMe };

const WELCOME = '/app/bienvenue';

export function ShopGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });
  const [landing, setLanding] = useState<string | undefined>();
  const signedIn = auth.user !== null;

  const reload = useCallback(async () => {
    try {
      const res = await api<{ shop: Shop; role: OrgRole; usage: ShopUsage; me: ShopMe }>(
        '/api/shops/me',
      );
      setLoaded({ status: 'ready', ...res });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SHOP_NOT_FOUND') setLoaded({ status: 'none' });
      else setLoaded({ status: 'error', message: errorMessage(err) });
    }
  }, []);

  useEffect(() => {
    if (signedIn) void reload();
  }, [signedIn, reload]);

  // The landing only serves the redirect that leaves the welcome page.
  useEffect(() => {
    if (landing && pathname !== WELCOME) setLanding(undefined);
  }, [landing, pathname]);

  // The session could not be checked (network, server): say so instead of
  // sending a signed-in wholesaler back to the login page.
  const authFailed = !auth.loading && !signedIn && auth.error !== null;
  const decision = gateDecision({
    authLoading: auth.loading,
    signedIn,
    shop: loaded.status,
    pathname,
    landing,
  });
  const target = !authFailed && decision.kind === 'redirect' ? decision.to : null;

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  const actions = useMemo<ShopGateActions>(
    () => ({
      reload,
      created: (shop, role, to) => {
        setLanding(to);
        // A new shop has no response yet; the reload brings the person's name.
        const usage = { responsesThisMonth: 0, monthlyLimit: PLANS[shop.plan.id].monthlyResponses };
        setLoaded({ status: 'ready', shop, role, usage, me: { firstName: null, name: null } });
        void reload();
      },
    }),
    [reload],
  );

  if (authFailed) {
    return (
      <GateProblem
        message="Le serveur ne répond pas pour le moment. Vérifie ton réseau et réessaie."
        onRetry={() => void auth.refresh()}
      />
    );
  }
  if (decision.kind === 'wait' || decision.kind === 'redirect') return <GateLoading />;
  if (loaded.status === 'error') {
    return (
      <GateProblem
        message={loaded.message}
        onRetry={() => {
          setLoaded({ status: 'loading' });
          void reload();
        }}
      />
    );
  }
  if (decision.kind === 'bare') {
    return <ShopGateContext.Provider value={actions}>{children}</ShopGateContext.Provider>;
  }
  if (loaded.status !== 'ready') return <GateLoading />;
  return (
    <ShopGateContext.Provider value={actions}>
      <ShopContext.Provider
        value={{
          shop: loaded.shop,
          role: loaded.role,
          usage: loaded.usage,
          me: loaded.me,
          reload,
        }}
      >
        <AppShell>{children}</AppShell>
      </ShopContext.Provider>
    </ShopGateContext.Provider>
  );
}

/** Blank notebook page while the session and the shop load. */
function GateLoading() {
  return (
    <div className="min-h-dvh bg-paper px-4 pt-8 lg:pl-72">
      <div role="status" className="mx-auto max-w-3xl">
        <Logo variant="mark" size={32} />
        <p className="mt-6 font-hand text-2xl text-ink-muted">Chargement de ta boutique…</p>
        <div aria-hidden="true" className="mt-8 flex flex-col gap-4 motion-safe:animate-pulse">
          <span className="h-24 rounded-card bg-grid/70" />
          <span className="h-14 w-2/3 rounded-card bg-grid/70" />
          <span className="h-14 rounded-card bg-grid/70" />
        </div>
      </div>
    </div>
  );
}

function GateProblem({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-dvh bg-paper px-4 pt-8">
      <div role="alert" className="mx-auto flex max-w-sm flex-col items-start gap-6">
        <Logo variant="mark" size={32} />
        <h1 className="font-hand text-3xl font-bold text-primary">
          Ta boutique n&apos;a pas chargé
        </h1>
        <p className="text-ink">{message}</p>
        <Button size="lg" className="w-full shadow-press" onClick={onRetry}>
          Réessayer
        </Button>
      </div>
    </div>
  );
}
