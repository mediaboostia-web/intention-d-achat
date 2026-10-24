// Small response helpers shared by the Tamani routes: every JSON reply
// carries the request id, and a bad body is the kit's VALIDATION_FAILED.
import 'server-only';
import { NextResponse } from 'next/server';
import { getRequestId } from '@/lib/server/observability/request-context';

export function requestIdHeaders(): Record<string, string> {
  const id = getRequestId();
  return id ? { 'x-request-id': id } : {};
}

/** The parsed JSON body, or null when it is missing or malformed. */
export async function readJson(req: Request): Promise<unknown> {
  return req.json().catch(() => null);
}

export function jsonOk(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: requestIdHeaders() });
}

export function validationFailed(message = 'Invalid request body'): NextResponse {
  return NextResponse.json(
    { error: 'VALIDATION_FAILED', message },
    { status: 400, headers: requestIdHeaders() },
  );
}
