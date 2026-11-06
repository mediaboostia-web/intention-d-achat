import { FeedView } from '@/components/admin/FeedView';
import { prisma } from '@/lib/server/prisma';
import { loadAdminFeed } from '@/lib/server/tamani/admin/feed';
import { adminOnly } from '@/lib/server/tamani/admin/guard';
import { parseFeedQuery } from '@/lib/tamani/admin-feed';

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await adminOnly();
  const query = parseFeedQuery(await searchParams);
  const { items, next } = await loadAdminFeed(prisma, {
    now: new Date(),
    type: query.type,
    before: query.before,
  });
  return <FeedView items={items} next={next} type={query.type} />;
}
