// The top bar's search (lot 7a): five campaigns, products and clients of one
// shop whose name holds the text. A client follows the client book's rules:
// visible only, and on a plan without contacts the digits are not searched
// and the number stays here.
import 'server-only';
import type { SearchResults } from '@/lib/tamani/search-view';
import { effectiveStatus } from './campaign-status';
import { clientSearchWhere, visibleClientWhere } from './clients';
import type { Db } from './locks';
import { displayPhone } from './phone';
import { photoUrls } from './serializers';

export const SEARCH_TAKE = 5;

export async function searchShop(
  db: Db,
  input: { organizationId: string; q: string; canSeeContacts: boolean; now: Date },
): Promise<SearchResults> {
  const { organizationId, q, canSeeContacts, now } = input;
  const contains = { contains: q, mode: 'insensitive' as const };
  const [campaigns, products, clients] = await Promise.all([
    db.campaign.findMany({
      where: { organizationId, title: contains },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: SEARCH_TAKE,
      select: {
        id: true,
        title: true,
        status: true,
        endsAt: true,
        product: { select: { photos: true } },
      },
    }),
    db.product.findMany({
      where: { organizationId, name: contains },
      // Products on sale first, then the archived ones.
      orderBy: [{ archivedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }],
      take: SEARCH_TAKE,
      select: { id: true, name: true, archivedAt: true, photos: true },
    }),
    db.respondent.findMany({
      where: { ...visibleClientWhere(organizationId), AND: [clientSearchWhere(q, canSeeContacts)] },
      orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }],
      take: SEARCH_TAKE,
      select: { id: true, firstName: true, phoneE164: true },
    }),
  ]);
  return {
    campaigns: campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      status: effectiveStatus(c, now),
      photo: photoUrls(c.product.photos)[0] ?? null,
    })),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      archived: p.archivedAt !== null,
      photo: photoUrls(p.photos)[0] ?? null,
    })),
    clients: clients.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      phone: canSeeContacts && c.phoneE164 ? displayPhone(c.phoneE164) : null,
    })),
  };
}
