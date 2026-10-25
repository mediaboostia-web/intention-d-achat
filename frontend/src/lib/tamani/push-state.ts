// Which "notifications" card the shop space shows (porteur's feedback §2).
// iPhones receive Web Push only once Tamani is on the home screen (iOS 16.4
// and later), so they are asked to install it first.
export type PushCardState = 'hidden' | 'ask' | 'install-first' | 'denied' | 'unsupported';

export interface PushEnv {
  /** The server has VAPID keys. */
  configured: boolean;
  /** Service worker, PushManager and Notification all exist here. */
  supported: boolean;
  isIos: boolean;
  /** Opened from the home screen icon. */
  standalone: boolean;
  permission: NotificationPermission;
  /** This browser already has a push subscription. */
  subscribed: boolean;
}

export function pushCardState(env: PushEnv): PushCardState {
  if (!env.configured || env.subscribed) return 'hidden';
  if (env.isIos && !env.standalone) return 'install-first';
  if (!env.supported) return 'unsupported';
  if (env.permission === 'denied') return 'denied';
  return 'ask';
}

/** The VAPID public key (base64url) as PushManager.subscribe wants it. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
