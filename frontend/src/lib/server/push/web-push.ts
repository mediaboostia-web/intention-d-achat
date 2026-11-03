// Web Push with VAPID keys (porteur's feedback §2): the notification that
// reaches the wholesaler's phone even when Tamani is closed. Optional like
// the other providers: without the three keys nothing is sent.
import 'server-only';
import webpush from 'web-push';
import { log } from '@/lib/server/observability/log';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export type PushResult = 'SENT' | 'GONE' | 'FAILED';

const DAY_S = 86_400;

/** A variable as typed, without the quotes a paste into Vercel can leave around it. */
function env(name: 'VAPID_PUBLIC_KEY' | 'VAPID_PRIVATE_KEY' | 'VAPID_SUBJECT'): string {
  return (process.env[name] ?? '').trim().replace(/^(['"])(.*)\1$/, '$2');
}

export function pushConfigured(): boolean {
  return Boolean(env('VAPID_PUBLIC_KEY') && env('VAPID_PRIVATE_KEY') && env('VAPID_SUBJECT'));
}

export function vapidPublicKey(): string | null {
  return pushConfigured() ? env('VAPID_PUBLIC_KEY') : null;
}

/**
 * GONE: the push service forgot this browser (404/410); drop the subscription.
 * A failure is logged with its status only: web-push's messages can carry the
 * subject, an e-mail address.
 */
export async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
): Promise<PushResult> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      {
        TTL: DAY_S,
        urgency: 'high',
        vapidDetails: {
          subject: env('VAPID_SUBJECT'),
          publicKey: env('VAPID_PUBLIC_KEY'),
          privateKey: env('VAPID_PRIVATE_KEY'),
        },
      },
    );
    return 'SENT';
  } catch (err) {
    const status = (err as { statusCode?: unknown }).statusCode;
    if (status === 404 || status === 410) return 'GONE';
    log.warn('push not delivered', { status: typeof status === 'number' ? status : null });
    return 'FAILED';
  }
}
