// Which "notifications" card the shop space shows (porteur's feedback §2).
// iPhones receive Web Push only once Tamani is on the home screen (iOS 16.4
// and later), so they are asked to install it first.
// Once subscribed, Réglages says it is on and the phone sheet stays away.
export type PushCardState = 'hidden' | 'ask' | 'install-first' | 'denied' | 'unsupported' | 'on';

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

export function pushCardState(env: PushEnv, place: 'home' | 'settings' = 'home'): PushCardState {
  if (!env.configured) return 'hidden';
  if (env.subscribed) return place === 'settings' ? 'on' : 'hidden';
  if (env.isIos && !env.standalone) return 'install-first';
  if (!env.supported) return 'unsupported';
  if (env.permission === 'denied') return 'denied';
  return 'ask';
}

// The sheet that asks on a phone (porteur's feedback 2, §7): the first time
// the shop space opens, then once more 7 days after « Plus tard », never
// after. Computers get no sheet: Réglages keeps the switch.
export const PUSH_PROMPT_KEY = 'tamani-push-prompt';
export const PUSH_PROMPT_AGAIN_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** How many times the sheet was answered, and when last. */
export interface PushPromptMemory {
  count: number;
  at: number;
}

export function pushPromptDue(i: {
  state: PushCardState;
  isPhone: boolean;
  memory: PushPromptMemory | null;
  now: number;
}): boolean {
  if (!i.isPhone) return false;
  if (i.state !== 'ask' && i.state !== 'install-first') return false;
  if (i.memory === null) return true;
  return i.memory.count === 1 && i.now - i.memory.at >= PUSH_PROMPT_AGAIN_AFTER_MS;
}

/** The memory once the sheet is answered, whatever the answer. */
export function answeredPushPrompt(memory: PushPromptMemory | null, now: number): PushPromptMemory {
  return { count: (memory?.count ?? 0) + 1, at: now };
}

/** Never throws: a blocked, missing or damaged storage reads as nothing. */
export function readPushPrompt(storage: Storage | null): PushPromptMemory | null {
  try {
    const raw = storage?.getItem(PUSH_PROMPT_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { count, at } = value as Record<string, unknown>;
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) return null;
    if (typeof at !== 'number' || !Number.isFinite(at)) return null;
    return { count, at };
  } catch {
    return null;
  }
}

/** Never throws: when the storage refuses, the sheet simply asks again later. */
export function writePushPrompt(storage: Storage | null, value: PushPromptMemory): void {
  try {
    storage?.setItem(PUSH_PROMPT_KEY, JSON.stringify(value));
  } catch {
    // Private mode or blocked site data: nothing to remember with.
  }
}

/** The VAPID public key (base64url) as PushManager.subscribe wants it. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
