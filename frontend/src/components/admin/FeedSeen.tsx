'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';

/**
 * Records this admin's visit once the feed is on screen, then refreshes the
 * menu so the badge empties. A link prefetch never mounts it, so it never
 * marks anything seen.
 */
export function FeedSeen() {
  const router = useRouter();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    api('/api/admin/feed/seen', { method: 'POST', body: {} })
      .then(() => router.refresh())
      .catch(() => {});
  }, [router]);
  return null;
}
