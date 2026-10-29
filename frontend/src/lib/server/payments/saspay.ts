// SasPay client (lot 8): hosted checkout sessions and payment verification.
// Server only: the key is read from SASPAY_API_KEY and never leaves this
// module (not in an error message, a log or a reply). Real replies are
// enveloped `{ success, data, code }` (recon 2026-10-29); amounts are
// decimal strings. Only endpoints from the OpenAPI spec are called.
import 'server-only';
import { CircuitBreaker } from './circuit-breaker';

const DEFAULT_BASE_URL = 'https://api.saspay.me/api/v1';
const TIMEOUT_MS = 15_000;

export type SaspayCurrency = 'XOF' | 'XAF';

export interface CheckoutSessionInput {
  /** Whole FCFA. */
  amount: number;
  currency: SaspayCurrency;
  country: string;
  customerEmail: string;
  customerName: string;
  description: string;
  returnUrl: string;
  metadata: Record<string, string>;
  expiresAt: Date;
}

export interface SaspayClient {
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ id: string; checkoutUrl: string }>;
  checkoutSessionStatus(id: string): Promise<{
    status: string;
    transactionId: string | null;
    transactionStatus: string | null;
  }>;
  verifyPayment(paymentId: string): Promise<{
    /** PENDING, SUCCESS or FAILED; only SUCCESS opens a pass. */
    status: string;
    requestedAmount: string;
    currency: string;
  }>;
}

/** 401/403/404/409/422 are answers; 429, 5xx, timeouts and odd bodies may pass on a retry. */
export class SaspayError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly retryable: boolean,
    where: string,
  ) {
    // The provider's own message is left out: it may quote a customer's email.
    super(`SasPay ${where} failed: ${status} ${code}`);
    this.name = 'SaspayError';
  }
}

/** 9900 → "9900.00". FCFA has no minor unit, so only whole, non-negative amounts. */
export function toSaspayAmount(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`Not a whole FCFA amount: ${n}`);
  return `${n}.00`;
}

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null;
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

function errorCode(body: unknown, status: number): string {
  if (isObject(body)) {
    if (isObject(body.error) && str(body.error.code)) return str(body.error.code)!;
    if (str(body.code)) return str(body.code)!;
  }
  return `http_${status}`;
}

const retryableStatus = (status: number) => status === 429 || status >= 500;

export function createSaspayClient(opts: {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  breaker?: CircuitBreaker;
}): SaspayClient {
  const base = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  const doFetch = opts.fetchImpl ?? fetch;

  async function call(method: 'GET' | 'POST', path: string, body?: Json): Promise<Json> {
    const where = `${method} ${path.replace(/\/[^/]+\/(status|verify)\/$/, '/:id/$1/')}`;
    let res: Response;
    try {
      res = await doFetch(`${base}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${opts.apiKey}`,
          accept: 'application/json',
          ...(body && { 'content-type': 'application/json' }),
        },
        ...(body && { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      });
    } catch {
      throw new SaspayError(503, 'network_error', true, where);
    }
    const parsed: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      throw new SaspayError(
        res.status,
        errorCode(parsed, res.status),
        retryableStatus(res.status),
        where,
      );
    }
    // Replies are enveloped { success, data, code }; the OpenAPI examples of
    // verify and status are flat, so a body without the envelope is read as is.
    const data = !isObject(parsed)
      ? null
      : isObject(parsed.data)
        ? parsed.data
        : 'data' in parsed || 'success' in parsed
          ? null
          : parsed;
    if (!data) throw new SaspayError(502, 'unexpected_body', true, where);
    return data;
  }

  /**
   * A 4xx is SasPay answering: it must not open the breaker, only failures to
   * answer do. A 429 is retryable but passes too: one busy shop's polling must
   * not block every shop's checkout.
   */
  async function request(method: 'GET' | 'POST', path: string, body?: Json): Promise<Json> {
    if (!opts.breaker) return call(method, path, body);
    const out = await opts.breaker.execute(async () => {
      try {
        return { data: await call(method, path, body) };
      } catch (err) {
        if (err instanceof SaspayError && (!err.retryable || err.status === 429)) {
          return { error: err };
        }
        throw err;
      }
    });
    if ('error' in out) throw out.error;
    return out.data;
  }

  const unexpected = (where: string) => new SaspayError(502, 'unexpected_body', true, where);

  return {
    async createCheckoutSession(input) {
      const data = await request('POST', '/checkout-sessions/', {
        amount: toSaspayAmount(input.amount),
        currency: input.currency,
        country: input.country,
        customer_email: input.customerEmail,
        customer_name: input.customerName,
        description: input.description,
        return_url: input.returnUrl,
        metadata: input.metadata,
        // The customer pays SasPay's fees on top (porteur, 2026-10-29).
        fee_charge_mode: 'ADD_ON',
        expires_at: input.expiresAt.toISOString(),
      });
      const id = str(data.id);
      const checkoutUrl = str(data.checkout_url);
      if (!id || !checkoutUrl) throw unexpected('POST /checkout-sessions/');
      return { id, checkoutUrl };
    },

    async checkoutSessionStatus(id) {
      const data = await request('GET', `/checkout-sessions/${encodeURIComponent(id)}/status/`);
      const status = str(data.status);
      if (!status) throw unexpected('GET /checkout-sessions/:id/status/');
      return {
        status,
        transactionId: str(data.transaction_id),
        transactionStatus: str(data.transaction_status),
      };
    },

    async verifyPayment(paymentId) {
      const data = await request('GET', `/payments/${encodeURIComponent(paymentId)}/verify/`);
      const status = str(data.status);
      const requestedAmount = str(data.requested_amount);
      const currency = str(data.currency);
      if (!status || !requestedAmount || !currency) throw unexpected('GET /payments/:id/verify/');
      return { status, requestedAmount, currency };
    },
  };
}

// One breaker per process, like the kit's payment provider (single-instance by design).
const breaker = new CircuitBreaker({ name: 'saspay' });
let cached: { key: string; client: SaspayClient } | null = null;

/** The configured client, or null without SASPAY_API_KEY (billing then answers 503). */
export function getSaspay(): SaspayClient | null {
  const apiKey = process.env.SASPAY_API_KEY?.trim();
  if (!apiKey) return null;
  if (cached?.key !== apiKey) {
    const baseUrl = process.env.SASPAY_API_URL?.trim() || DEFAULT_BASE_URL;
    cached = { key: apiKey, client: createSaspayClient({ apiKey, baseUrl, breaker }) };
  }
  return cached.client;
}
