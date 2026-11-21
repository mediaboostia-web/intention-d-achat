// The shape every /api/admin/blog route shares (lot 13d): any admin reads,
// a super-admin writes; a write runs in one transaction with its journal
// line, then the public blog and the sitemap are rebuilt. Each route names
// its own gate (gatedAdmin / gatedSuperadmin), as the door contract asks.
import 'server-only';
import { revalidatePath } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { enforceAdminRateLimit } from '@/lib/server/middleware/rate-limit-by-userid';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { BlogError } from '@/lib/server/tamani/blog';
import { tamaniError } from '@/lib/server/tamani/errors';
import type { AdminContext } from '@/lib/server/middleware';

type Tx = Prisma.TransactionClient;

export interface BlogJournal {
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

const invalid = () =>
  NextResponse.json(
    { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
    { status: 400 },
  );

function blogFailure(err: unknown): NextResponse {
  if (err instanceof BlogError) return tamaniError(err.code, err.status);
  throw err;
}

/** The public pages that show articles. */
export function rebuildBlog(): void {
  revalidatePath('/blog', 'layout');
  revalidatePath('/sitemap.xml');
}

type Gate = () => Promise<AdminContext | NextResponse>;

export async function blogRead(
  req: NextRequest,
  gate: Gate,
  read: () => Promise<unknown>,
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await gate();
    if (auth instanceof NextResponse) return auth;
    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;
    try {
      return NextResponse.json(await read(), { headers: { 'x-request-id': ctx.requestId } });
    } catch (err) {
      return blogFailure(err);
    }
  });
}

/**
 * A super-admin's change. `schema` null means no body (a delete). `write`
 * returns what to answer and the journal line, written in the same transaction.
 */
export async function blogWrite<S extends z.ZodType>(
  req: NextRequest,
  gate: Gate,
  schema: S | null,
  write: (
    tx: Tx,
    body: z.infer<S>,
    adminId: string,
  ) => Promise<{ json: Record<string, unknown>; journal: BlogJournal; status?: number }>,
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await gate();
    if (auth instanceof NextResponse) return auth;
    const limited = await enforceAdminRateLimit(auth.admin.id);
    if (limited) return limited;

    let body: z.infer<S> = undefined as z.infer<S>;
    if (schema) {
      const parsed = schema.safeParse(await req.json().catch(() => null));
      if (!parsed.success) return invalid();
      body = parsed.data;
    }
    try {
      const out = await prisma.$transaction(async (tx) => {
        const r = await write(tx, body, auth.admin.id);
        await logAdminAction(tx, { actorId: auth.admin.id, ...r.journal });
        return r;
      });
      rebuildBlog();
      return NextResponse.json(out.json, {
        status: out.status ?? 200,
        headers: { 'x-request-id': ctx.requestId },
      });
    } catch (err) {
      return blogFailure(err);
    }
  });
}
