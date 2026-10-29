// SasPay webhook provider for the kit's handler (lot 8). The webhook is only
// a signal: its body names a transaction, not our checkout session, so the
// route wakes the reconciliation, which reads SasPay's own answers.
//
// Signature: X-Webhook-Signature is the lowercase hex HMAC-SHA256, keyed with
// SASPAY_WEBHOOK_SECRET, of `${X-Webhook-Timestamp}.` followed by the raw
// body. A timestamp more than 300 s away from our clock is refused.
import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { ParsedIds, WebhookProvider } from './handler';

const MAX_SKEW_S = 300;

/**
 * What WebhookLog keeps of an event: the route only needs a signal, so the
 * payer's number, name and email never reach the database. `digest` (of the
 * whole data) dedups an event that has no id.
 */
export interface SaspayWebhookPayload {
  event: string;
  data: { id?: string; status?: string };
  digest: string;
}

const KINDS: Record<string, ParsedIds['kind']> = {
  'transaction.success': 'paid',
  'transaction.failed': 'failed',
  'transaction.cancelled': 'failed',
};

export function saspayWebhookSecret(): string | null {
  return process.env.SASPAY_WEBHOOK_SECRET?.trim() || null;
}

export const saspayWebhookProvider: WebhookProvider<SaspayWebhookPayload> = {
  name: 'saspay',

  verifySignature(rawBody, headers) {
    const secret = saspayWebhookSecret();
    if (!secret) return { valid: false, reason: 'not_configured' };
    const signature = headers['x-webhook-signature'];
    const timestamp = headers['x-webhook-timestamp'];
    if (!signature || !timestamp) return { valid: false, reason: 'missing_headers' };
    if (!/^\d{1,12}$/.test(timestamp)) return { valid: false, reason: 'bad_timestamp' };
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > MAX_SKEW_S) {
      return { valid: false, reason: 'stale_timestamp' };
    }
    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.`)
      .update(rawBody)
      .digest('hex');
    const given = Buffer.from(signature.trim().toLowerCase(), 'utf8');
    const wanted = Buffer.from(expected, 'utf8');
    if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
      return { valid: false, reason: 'bad_signature' };
    }
    return { valid: true };
  },

  parsePayload(rawBody) {
    const parsed: unknown = JSON.parse(rawBody.toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('not an event object');
    }
    const { event, data } = parsed as { event?: unknown; data?: unknown };
    if (typeof event !== 'string' || event === '') throw new Error('event missing');
    const fields = (
      typeof data === 'object' && data !== null && !Array.isArray(data) ? data : {}
    ) as Record<string, unknown>;
    const kept: SaspayWebhookPayload['data'] = {};
    if (typeof fields.id === 'string') kept.id = fields.id;
    if (typeof fields.status === 'string') kept.status = fields.status;
    const digest = createHash('sha256').update(JSON.stringify(fields)).digest('hex').slice(0, 32);
    return { event, data: kept, digest };
  },

  extractIds({ event, data, digest }) {
    // Without an id, an identical redelivery still dedups on its content.
    const externalId =
      typeof data.id === 'string' && data.id !== '' ? data.id : `${event}:${digest}`;
    return { externalId, eventType: event, kind: KINDS[event] ?? 'other' };
  },
};
