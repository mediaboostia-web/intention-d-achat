// SasPay client (lot 8). fetch is simulated: these tests never read a real key.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CircuitBreaker, CircuitOpenError } from './circuit-breaker';
import { SaspayError, createSaspayClient, getSaspay, toSaspayAmount } from './saspay';

const KEY = 'sk_test_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const BASE = 'https://api.saspay.me/api/v1';

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function client(...replies: Response[]) {
  const fetchImpl = vi.fn<typeof fetch>();
  for (const r of replies) fetchImpl.mockResolvedValueOnce(r);
  return { fetchImpl, saspay: createSaspayClient({ apiKey: KEY, baseUrl: BASE, fetchImpl }) };
}

async function failure(p: Promise<unknown>): Promise<SaspayError> {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(SaspayError);
  return err as SaspayError;
}

const session = {
  amount: 9900,
  currency: 'XOF' as const,
  country: 'SN',
  customerEmail: 'awa@example.com',
  customerName: 'Awa Diallo',
  description: 'Tamani · Pass Mois',
  returnUrl: 'https://tamani.app/app/abonnement/retour?achat=ord_1',
  metadata: { orderId: 'ord_1', organizationId: 'org_1', offer: 'MONTH' },
  expiresAt: new Date('2026-10-29T11:00:00.000Z'),
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('toSaspayAmount', () => {
  it('writes whole FCFA as a decimal string', () => {
    expect(toSaspayAmount(9900)).toBe('9900.00');
    expect(toSaspayAmount(0)).toBe('0.00');
    expect(() => toSaspayAmount(99.5)).toThrow();
    expect(() => toSaspayAmount(-1)).toThrow();
    expect(() => toSaspayAmount(Number.NaN)).toThrow();
  });
});

describe('createCheckoutSession', () => {
  it('posts the session with the key, fees deducted, and reads data', async () => {
    const { fetchImpl, saspay } = client(
      reply(201, {
        success: true,
        data: {
          id: 'b445f7ef-8001-4204-a524-52f97cdbdf30',
          checkout_url: 'https://checkout.saspay.me/NNM3qfB6',
          status: 'PENDING',
        },
        code: 201,
      }),
    );
    expect(await saspay.createCheckoutSession(session)).toEqual({
      id: 'b445f7ef-8001-4204-a524-52f97cdbdf30',
      checkoutUrl: 'https://checkout.saspay.me/NNM3qfB6',
    });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`${BASE}/checkout-sessions/`);
    expect(init?.method).toBe('POST');
    const headers = new Headers(init?.headers);
    expect(headers.get('authorization')).toBe(`Bearer ${KEY}`);
    expect(headers.get('content-type')).toBe('application/json');
    expect(JSON.parse(String(init?.body))).toEqual({
      amount: '9900.00',
      currency: 'XOF',
      country: 'SN',
      customer_email: 'awa@example.com',
      customer_name: 'Awa Diallo',
      description: 'Tamani · Pass Mois',
      return_url: 'https://tamani.app/app/abonnement/retour?achat=ord_1',
      metadata: { orderId: 'ord_1', organizationId: 'org_1', offer: 'MONTH' },
      fee_charge_mode: 'DEDUCTED',
      expires_at: '2026-10-29T11:00:00.000Z',
    });
  });

  it('an unexpected body is a retryable 502, never an empty value', async () => {
    const { saspay } = client(reply(201, { success: true, data: { id: 'x' }, code: 201 }));
    const err = await failure(saspay.createCheckoutSession(session));
    expect(err).toMatchObject({ status: 502, retryable: true });
  });
});

describe('errors', () => {
  it('a 401 is not retryable and never echoes the key', async () => {
    const { saspay } = client(
      reply(401, { success: false, error: { message: 'Invalid key', code: 'unauthorized' } }),
    );
    const err = await failure(saspay.checkoutSessionStatus('sess_1'));
    expect(err).toMatchObject({ status: 401, code: 'unauthorized', retryable: false });
    expect(err.message).not.toContain(KEY);
    expect(JSON.stringify(err)).not.toContain(KEY);
  });

  it('a 429 and a 503 are retryable', async () => {
    const { saspay } = client(reply(429, { message: 'Slow down' }), reply(503, {}));
    expect(await failure(saspay.checkoutSessionStatus('sess_1'))).toMatchObject({
      status: 429,
      retryable: true,
    });
    expect(await failure(saspay.checkoutSessionStatus('sess_1'))).toMatchObject({
      status: 503,
      retryable: true,
    });
  });

  it('404, 409 and 422 are not retryable', async () => {
    const { saspay } = client(reply(404, {}), reply(409, {}), reply(422, {}));
    for (const status of [404, 409, 422]) {
      expect(await failure(saspay.verifyPayment('pay_1'))).toMatchObject({
        status,
        retryable: false,
      });
    }
  });

  it('an error reads its code from error.code, or code when it is a string', async () => {
    const { saspay } = client(
      reply(422, { success: false, error: { message: 'x', code: 'insufficient_balance' } }),
      reply(422, { message: 'x', code: 'currency_country_mismatch' }),
      reply(422, { success: false, code: 422 }),
    );
    expect((await failure(saspay.verifyPayment('p'))).code).toBe('insufficient_balance');
    expect((await failure(saspay.verifyPayment('p'))).code).toBe('currency_country_mismatch');
    expect((await failure(saspay.verifyPayment('p'))).code).toBe('http_422');
  });

  it('a network failure is retryable', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed'));
    const saspay = createSaspayClient({ apiKey: KEY, baseUrl: BASE, fetchImpl });
    expect(await failure(saspay.checkoutSessionStatus('sess_1'))).toMatchObject({
      code: 'network_error',
      retryable: true,
    });
  });

  it('only retryable failures open the circuit breaker', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply(404, {}))
      .mockResolvedValueOnce(reply(404, {}))
      .mockResolvedValueOnce(reply(503, {}));
    const breaker = new CircuitBreaker({ name: 'saspay-test', failureThreshold: 1 });
    const saspay = createSaspayClient({ apiKey: KEY, baseUrl: BASE, fetchImpl, breaker });
    expect((await failure(saspay.verifyPayment('p'))).status).toBe(404);
    expect((await failure(saspay.verifyPayment('p'))).status).toBe(404);
    expect((await failure(saspay.verifyPayment('p'))).status).toBe(503);
    await expect(saspay.verifyPayment('p')).rejects.toBeInstanceOf(CircuitOpenError);
  });
});

describe('checkoutSessionStatus', () => {
  it('checkoutSessionStatus reads status, transaction_id, transaction_status', async () => {
    const { fetchImpl, saspay } = client(
      reply(200, {
        success: true,
        data: {
          id: 'sess_1',
          slug: 'NNM3',
          status: 'PAID',
          transaction_id: 'pay_9',
          transaction_status: 'SUCCESS',
          transaction_reference: 'REF',
        },
        code: 200,
      }),
      reply(200, {
        success: true,
        data: { id: 'sess_2', status: 'PENDING', transaction_id: null, transaction_status: null },
      }),
    );
    expect(await saspay.checkoutSessionStatus('sess_1')).toEqual({
      status: 'PAID',
      transactionId: 'pay_9',
      transactionStatus: 'SUCCESS',
    });
    expect(fetchImpl.mock.calls[0]![0]).toBe(`${BASE}/checkout-sessions/sess_1/status/`);
    expect(fetchImpl.mock.calls[0]![1]?.method).toBe('GET');
    expect(await saspay.checkoutSessionStatus('sess_2')).toEqual({
      status: 'PENDING',
      transactionId: null,
      transactionStatus: null,
    });
  });

  it('escapes the id in the path', async () => {
    const { fetchImpl, saspay } = client(reply(200, { data: { status: 'PENDING' } }));
    await saspay.checkoutSessionStatus('../x');
    expect(fetchImpl.mock.calls[0]![0]).toBe(`${BASE}/checkout-sessions/..%2Fx/status/`);
  });
});

describe('verifyPayment', () => {
  it('verifyPayment reads status, requested_amount, currency', async () => {
    const { fetchImpl, saspay } = client(
      reply(200, {
        success: true,
        data: {
          status: 'SUCCESS',
          requested_amount: '9900.00',
          debited_amount: '9900.00',
          net_amount: '9390.00',
          currency: 'XOF',
        },
        code: 200,
      }),
    );
    expect(await saspay.verifyPayment('pay_9')).toEqual({
      status: 'SUCCESS',
      requestedAmount: '9900.00',
      currency: 'XOF',
    });
    expect(fetchImpl.mock.calls[0]![0]).toBe(`${BASE}/payments/pay_9/verify/`);
  });
});

describe('getSaspay', () => {
  it('getSaspay is null without SASPAY_API_KEY', () => {
    vi.stubEnv('SASPAY_API_KEY', '');
    expect(getSaspay()).toBeNull();
    vi.stubEnv('SASPAY_API_KEY', KEY);
    expect(getSaspay()).not.toBeNull();
  });
});
