// GET|PATCH|DELETE /api/shops/[orgId]/clients/[respondentId].
//
// GET: one client, every counted answer, the orders and the total bought,
// the note and, on a plan with `reliability`, how often a yes became a
// purchase. PATCH (MEMBER): the wholesaler's note, `{ notes }`. DELETE
// (ADMIN): the client's identity goes on request (spec §6.9); answers and
// orders stay counted. A hidden client, an anonymized one or a client of
// another shop is 404 CLIENT_NOT_FOUND. Never a note, a first name or a
// number in the logs.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse } from 'next/server';
import { log } from '@/lib/server/observability/log';
import { prisma } from '@/lib/server/prisma';
import { anonymizeClient, getClient, updateClientNotes } from '@/lib/server/tamani/clients';
import { tamaniError } from '@/lib/server/tamani/errors';
import { jsonOk, readJson, requestIdHeaders, validationFailed } from '@/lib/server/tamani/http';
import { ClientNotesPatch } from '@/lib/server/tamani/inputs';
import { shopHandler } from '@/lib/server/tamani/route';
import { shopPlan } from '@/lib/server/tamani/shop';

type Params = { orgId: string; respondentId: string };

export const GET = shopHandler<Params>('MEMBER', async (_req, { params }) => {
  const now = new Date();
  const plan = await shopPlan(prisma, params.orgId, now);
  const client = await getClient(prisma, params.orgId, params.respondentId, {
    canSeeContacts: plan.features.respondentContacts,
    reliability: plan.features.reliability,
    now,
  });
  if (!client) return tamaniError('CLIENT_NOT_FOUND', 404);
  return jsonOk({ client });
});

export const PATCH = shopHandler<Params>('MEMBER', async (req, { params }) => {
  const parsed = ClientNotesPatch.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed();
  const client = await updateClientNotes(
    prisma,
    params.orgId,
    params.respondentId,
    parsed.data.notes,
  );
  if (!client) return tamaniError('CLIENT_NOT_FOUND', 404);
  return jsonOk({ client });
});

export const DELETE = shopHandler<Params>('ADMIN', async (_req, { params, member }) => {
  const done = await prisma.$transaction((tx) =>
    anonymizeClient(tx, params.orgId, params.respondentId, new Date()),
  );
  if (!done) return tamaniError('CLIENT_NOT_FOUND', 404);
  // The trace of the request (spec §6.9): ids only, never who the client was.
  log.info('tamani.client.anonymized', {
    organizationId: params.orgId,
    respondentId: params.respondentId,
    userId: member.orgMember.userId,
  });
  return new NextResponse(null, { status: 204, headers: requestIdHeaders() });
});
