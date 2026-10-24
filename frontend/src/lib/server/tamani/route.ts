// The boilerplate of every /api/shops/[orgId]/** handler, in kit order:
// request context → verifyCsrf (no-op on GET) → requireOrgRole (404 to a
// non-member). The handler receives the resolved params and membership.
import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { requireOrgRole, type OrgContext } from '@/lib/server/middleware';
import type { OrgRole } from '@/lib/server/middleware/require-org-role';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export function shopHandler<P extends { orgId: string }>(
  minRole: OrgRole,
  handler: (req: NextRequest, ctx: { params: P; member: OrgContext }) => Promise<NextResponse>,
) {
  return async (req: NextRequest, routeCtx: { params: Promise<P> }): Promise<NextResponse> =>
    withRequestContext(makeRequestContext(req.headers), async () => {
      const csrfFail = verifyCsrf(req);
      if (csrfFail) return csrfFail;
      const params = await routeCtx.params;
      const member = await requireOrgRole(params.orgId, minRole);
      if (member instanceof NextResponse) return member;
      return handler(req, { params, member });
    });
}
