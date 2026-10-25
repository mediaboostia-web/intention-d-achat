// Web Push with VAPID keys (porteur's feedback §2): the notification that
// reaches the wholesaler's phone even when Tamani is closed. Optional like
// the other providers: without the three keys nothing is sent.
import 'server-only';
import webpush from 'web-push';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export type PushResult = 'SENT' | 'GONE' | 'FAILED';

const DAY_S = 86_400;

export function pushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT,
  );
}

export function vapidPublicKey(): string | null {
  return pushConfigured() ? process.env.VAPID_PUBLIC_KEY! : null;
}

let keysSet = false;

/** GONE: the push service forgot this browser (404/410); drop the subscription. */
export async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
): Promise<PushResult> {
  if (!keysSet) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    keysSet = true;
  }
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: DAY_S, urgency: 'high' },
    );
    return 'SENT';
  } catch (err) {
    const status = (err as { statusCode?: unknown }).statusCode;
    return status === 404 || status === 410 ? 'GONE' : 'FAILED';
  }
}
