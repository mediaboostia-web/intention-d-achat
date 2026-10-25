// The shop's client book (porteur's feedback §3 bis, advanced from lot 7).
// A client shows only once one of their answers counts: completed, not over
// the monthly quota and not suspicious. A client whose answers are all
// locked stays hidden until the upgrade, like the answers themselves.
import 'server-only';
import type { Prisma } from '@prisma/client';

/** Respondents the shop may see: not anonymized, with at least one counted answer. */
export function visibleClientWhere(organizationId: string) {
  return {
    organizationId,
    anonymizedAt: null,
    responses: { some: { completedAt: { not: null }, locked: false, suspicious: false } },
  } satisfies Prisma.RespondentWhereInput;
}
