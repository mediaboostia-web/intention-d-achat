'use client';

// The browser side of Web Push: registers /sw.js, reads what this browser
// allows, and subscribes it on the wholesaler's tap. The service worker is
// registered from the shop space only, never from the popup.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import {
  pushCardState,
  urlBase64ToUint8Array,
  type PushCardState,
  type PushEnv,
} from '@/lib/tamani/push-state';

interface Detected {
  env: PushEnv;
  key: string | null;
  registration: ServiceWorkerRegistration | null;
}

async function detect(): Promise<Detected> {
  const nav = navigator as Navigator & { standalone?: boolean };
  const supported =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
  const key = await api<{ publicKey: string }>('/api/push/public-key')
    .then((r) => r.publicKey)
    .catch(() => null);
  let registration: ServiceWorkerRegistration | null = null;
  let subscribed = false;
  if (supported && key) {
    registration = await navigator.serviceWorker.register('/sw.js');
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      subscribed = true;
      // Idempotent: puts the browser back on the server if it was forgotten.
      void saveSubscription(existing).catch(() => {});
    }
  }
  return {
    key,
    registration,
    env: {
      configured: key !== null,
      supported,
      isIos,
      standalone,
      permission: supported ? Notification.permission : 'default',
      subscribed,
    },
  };
}

function saveSubscription(sub: PushSubscription) {
  const { endpoint, keys } = sub.toJSON();
  return api('/api/push/subscriptions', { method: 'POST', body: { endpoint, keys } });
}

export function usePush(): {
  state: PushCardState;
  busy: boolean;
  error: string | null;
  enable: () => Promise<void>;
} {
  const [env, setEnv] = useState<PushEnv | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const found = useRef<Detected | null>(null);

  useEffect(() => {
    let alive = true;
    detect()
      .then((d) => {
        found.current = d;
        if (alive) setEnv(d.env);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const enable = useCallback(async () => {
    const d = found.current;
    if (!d?.registration || !d.key) return;
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setEnv({ ...d.env, permission });
        return;
      }
      const sub = await d.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(d.key),
      });
      await saveSubscription(sub);
      d.env = { ...d.env, permission, subscribed: true };
      setEnv(d.env);
    } catch {
      setError("Les notifications n'ont pas pu être activées. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state: env ? pushCardState(env) : 'hidden', busy, error, enable };
}
