import { JournalView } from '@/components/admin/JournalView';
import { prisma } from '@/lib/server/prisma';
import { adminOnly } from '@/lib/server/tamani/admin/guard';
import { loadJournal } from '@/lib/server/tamani/admin/journal';

export default async function AdminJournalPage() {
  await adminOnly();
  return <JournalView entries={await loadJournal(prisma)} />;
}
