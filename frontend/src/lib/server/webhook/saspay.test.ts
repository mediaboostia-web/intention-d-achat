import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saspayWebhookProvider } from './saspay';

const SECRET = 'whsec_test_0123456789abcdef';
const NOW = new Date('2026-10-29T12:00:00Z');
const nowSec = Math.floor(NOW.getTime() / 1000);

function signed(body: string | Buffer, ts = nowSec, secret = SECRET) {
  const raw = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
  const signature = createHmac('sha256', secret).update(`${ts}.`).update(raw).digest('hex');
  return {
    raw,
    headers: { 'x-webhook-signature': signature, 'x-webhook-timestamp': String(ts) },
  };
}

const body = JSON.stringify({
  event: 'transaction.success',
  data: { id: 'pay_9', reference: 'REF-1' },
});

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  vi.stubEnv('SASPAY_WEBHOOK_SECRET', SECRET);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('saspayWebhookProvider.verifySignature', () => {
  it('valid signature', () => {
    const { raw, headers } = signed(body);
    expect(saspayWebhookProvider.verifySignature(raw, headers)).toEqual({ valid: true });
  });

  it('wrong signature', () => {
    const { raw, headers } = signed(body, nowSec, 'another-secret');
    expect(saspayWebhookProvider.verifySignature(raw, headers).valid).toBe(false);
    const short = { ...signed(body).headers, 'x-webhook-signature': 'abc' };
    expect(saspayWebhookProvider.verifySignature(Buffer.from(body), short).valid).toBe(false);
    const tampered = signed(body);
    expect(
      saspayWebhookProvider.verifySignature(
        Buffer.from(body.replace('pay_9', 'pay_8')),
        tampered.headers,
      ).valid,
    ).toBe(false);
  });

  it('timestamp 301 s old is refused', () => {
    const { raw, headers } = signed(body, nowSec - 301);
    expect(saspayWebhookProvider.verifySignature(raw, headers)).toEqual({
      valid: false,
      reason: 'stale_timestamp',
    });
    const edge = signed(body, nowSec - 300);
    expect(saspayWebhookProvider.verifySignature(edge.raw, edge.headers).valid).toBe(true);
  });

  it('timestamp 301 s ahead is refused', () => {
    const { raw, headers } = signed(body, nowSec + 301);
    expect(saspayWebhookProvider.verifySignature(raw, headers).valid).toBe(false);
  });

  it('missing headers', () => {
    const { raw, headers } = signed(body);
    expect(
      saspayWebhookProvider.verifySignature(raw, {
        'x-webhook-timestamp': headers['x-webhook-timestamp'],
      }),
    ).toEqual({ valid: false, reason: 'missing_headers' });
    expect(
      saspayWebhookProvider.verifySignature(raw, {
        'x-webhook-signature': headers['x-webhook-signature'],
      }).valid,
    ).toBe(false);
    const notANumber = { ...headers, 'x-webhook-timestamp': '12a' };
    expect(saspayWebhookProvider.verifySignature(raw, notANumber).valid).toBe(false);
  });

  it('refuses everything without a secret', () => {
    const { raw, headers } = signed(body);
    vi.stubEnv('SASPAY_WEBHOOK_SECRET', '');
    expect(saspayWebhookProvider.verifySignature(raw, headers)).toEqual({
      valid: false,
      reason: 'not_configured',
    });
  });

  it('the signature is computed on the raw bytes', () => {
    // Spaces, accents and key order kept exactly as sent: re-serialising would break it.
    const raw = Buffer.from(
      '{ "event" : "transaction.success",  "data": {"id":"pay_9","description":"Pass Mois · réglé"} }',
      'utf8',
    );
    const { headers } = signed(raw);
    expect(saspayWebhookProvider.verifySignature(raw, headers).valid).toBe(true);
    const reserialised = Buffer.from(JSON.stringify(JSON.parse(raw.toString('utf8'))), 'utf8');
    expect(saspayWebhookProvider.verifySignature(reserialised, headers).valid).toBe(false);
  });
});

describe('saspayWebhookProvider.parsePayload and extractIds', () => {
  it('event mapping', () => {
    const ids = (event: string, data: Record<string, unknown> = { id: 'pay_9' }) =>
      saspayWebhookProvider.extractIds(
        saspayWebhookProvider.parsePayload(Buffer.from(JSON.stringify({ event, data }))),
      );
    expect(ids('transaction.success')).toEqual({
      externalId: 'pay_9',
      eventType: 'transaction.success',
      kind: 'paid',
    });
    expect(ids('transaction.failed').kind).toBe('failed');
    expect(ids('transaction.cancelled').kind).toBe('failed');
    expect(ids('transaction.created').kind).toBe('other');
    expect(ids('webhook.test').kind).toBe('other');
    expect(ids('settlement.success').kind).toBe('other');
  });

  it('an event without data.id is deduped on its content', () => {
    const parse = (s: string) => saspayWebhookProvider.parsePayload(Buffer.from(s));
    const a = saspayWebhookProvider.extractIds(parse('{"event":"webhook.test","data":{}}'));
    const b = saspayWebhookProvider.extractIds(parse('{"event":"webhook.test","data":{}}'));
    const c = saspayWebhookProvider.extractIds(parse('{"event":"webhook.test","data":{"n":1}}'));
    expect(a.externalId).toMatch(/^webhook\.test:[0-9a-f]{32}$/);
    expect(a.externalId).toBe(b.externalId);
    expect(c.externalId).not.toBe(a.externalId);
  });

  it('keeps only what the signal needs: never the payer in WebhookLog', () => {
    const body = {
      event: 'transaction.success',
      data: {
        id: 'pay_9',
        status: 'SUCCESS',
        customer: { phone: '+22997000000', email: 'awa@example.com', first_name: 'Awa' },
        recipient: { msisdn: '22997000000' },
        amount: '3900.00',
      },
    };
    const payload = saspayWebhookProvider.parsePayload(Buffer.from(JSON.stringify(body)));
    expect(payload).toEqual({
      event: 'transaction.success',
      data: { id: 'pay_9', status: 'SUCCESS' },
      digest: expect.stringMatching(/^[0-9a-f]{32}$/),
    });
    expect(JSON.stringify(payload)).not.toMatch(/2299700|awa|Awa/);
  });

  it('refuses a body that is not an event', () => {
    expect(() => saspayWebhookProvider.parsePayload(Buffer.from('not json'))).toThrow();
    expect(() => saspayWebhookProvider.parsePayload(Buffer.from('{"data":{}}'))).toThrow();
    expect(() => saspayWebhookProvider.parsePayload(Buffer.from('[1]'))).toThrow();
    expect(saspayWebhookProvider.parsePayload(Buffer.from('{"event":"webhook.test"}'))).toEqual({
      event: 'webhook.test',
      data: {},
      digest: expect.stringMatching(/^[0-9a-f]{32}$/),
    });
  });
});
