/**
 * Notification templates.
 *
 * Each project defines its own typed wrappers around `createNotification`.
 * The example below ships with the template — adapt it, replace it, or add
 * more (e.g. `firePaymentReceived`, `fireExportReady`). The pattern:
 *
 *   1. Build a `CreateNotificationInput` with a *deterministic* dedupeKey
 *      so the unique constraint enforces at-most-once delivery for that
 *      logical event (e.g. `payment-received:${orderId}` — never include
 *      a timestamp or random suffix).
 *   2. Pass the input + your PrismaClient to `createNotification`.
 *   3. Optionally enqueue an email via `EmailQueue.enqueue` — but ONLY
 *      after the notification row is created, so a duplicate event never
 *      sends a duplicate email.
 *
 * Keep these helpers free of side effects beyond the row insert; the
 * email enqueue belongs at the call site so each project can pick the
 * right channel (no email vs. transactional vs. marketing).
 */

import { formatDateFr } from '@/lib/tamani/dates';
import type { CreateNotificationInput } from './index';

export function welcomeNotification(userId: string, email: string): CreateNotificationInput {
  return {
    userId,
    type: 'WELCOME',
    title: 'Welcome!',
    body: `Glad to have you on board, ${email}.`,
    dedupeKey: `welcome:${userId}`,
  };
}

/**
 * Example: notification dispatched after a successful payment, through the
 * outbox kind `notification.payment_received` (no emitter since lot 8: a
 * pass purchase notifies through `passActivated`).
 */
export function paymentReceived(
  userId: string,
  orderId: string,
  amount: number,
  currency: string,
): CreateNotificationInput {
  return {
    userId,
    type: 'PAYMENT_RECEIVED',
    title: 'Payment received',
    body: `Order ${orderId} for ${amount} ${currency} confirmed.`,
    data: { orderId, amount, currency },
    dedupeKey: `payment-received:${orderId}`,
  };
}

/**
 * Tamani lot 8: a pass bought through SasPay is active. Sent to the shop's
 * owner and admins, once per purchase and person.
 */
export function passActivated(
  userId: string,
  orderId: string,
  passLabel: string,
  endsAt: Date,
  now: Date,
): CreateNotificationInput {
  return {
    userId,
    type: 'tamani.pass',
    title: 'Pass actif',
    body: `Ton ${passLabel} est actif jusqu'au ${formatDateFr(endsAt, now)}.`,
    data: { orderId, url: '/app/abonnement' },
    dedupeKey: `pass-activated:${orderId}:${userId}`,
  };
}

/** Lot 8: a paid pass ends within 3 days (once per period and person). */
export function passEndingSoon(
  userId: string,
  organizationId: string,
  endsAt: Date,
  now: Date,
): CreateNotificationInput {
  return {
    userId,
    type: 'tamani.pass',
    title: 'Ton pass finit bientôt',
    body: `Ton pass finit le ${formatDateFr(endsAt, now)}. Rachète-le pour garder tes réponses ouvertes.`,
    data: { url: '/app/abonnement' },
    dedupeKey: `pass-reminder:${organizationId}:${endsAt.toISOString()}:${userId}`,
  };
}

/** Lot 8: the pass ended and its grace runs. */
export function passInGrace(
  userId: string,
  organizationId: string,
  endedAt: Date,
  daysLeft: number,
): CreateNotificationInput {
  const days = `${daysLeft} jour${daysLeft > 1 ? 's' : ''}`;
  return {
    userId,
    type: 'tamani.pass',
    title: 'Ton pass est terminé',
    body: `Ton pass est terminé. Il te reste ${days} pour le racheter.`,
    data: { url: '/app/abonnement' },
    dedupeKey: `pass-grace:${organizationId}:${endedAt.toISOString()}:${userId}`,
  };
}

/** Lot 8: the free trial ended; new answers now wait for a pass. */
export function trialEnded(userId: string, organizationId: string): CreateNotificationInput {
  return {
    userId,
    type: 'tamani.pass',
    title: 'Ton essai est terminé',
    body: "Ton essai est terminé. Tes nouvelles réponses t'attendent : prends un pass pour les voir.",
    data: { url: '/app/abonnement' },
    dedupeKey: `trial-ended:${organizationId}:${userId}`,
  };
}
