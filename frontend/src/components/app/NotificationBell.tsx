'use client';

// The bell in the shop space header (porteur's feedback §2): how many
// answers arrived unread, and the latest ten. Built on the kit's
// /api/notifications routes; refreshed every minute while the page is seen.
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui';
import { api } from '@/lib/api';
import { relativeTime } from '@/lib/tamani/relative-time';

const POLL_MS = 60_000;

export interface BellItem {
  id: string;
  title: string;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
}

interface Serialized {
  id: string;
  title: string;
  body: string;
  data: unknown;
  readAt: string | null;
  createdAt: string;
}

function toItem(n: Serialized): BellItem {
  const url = (n.data as { url?: unknown } | null)?.url;
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    url: typeof url === 'string' && url.startsWith('/app') ? url : null,
    readAt: n.readAt,
    createdAt: n.createdAt,
  };
}

export function bellLabel(unread: number): string {
  if (unread === 0) return 'Notifications';
  return `Notifications, ${unread} non lue${unread > 1 ? 's' : ''}`;
}

export function NotificationPanel({
  items,
  now,
  onOpen = () => {},
  onMarkAll = () => {},
}: {
  items: BellItem[];
  now: Date;
  onOpen?: (item: BellItem) => void;
  onMarkAll?: () => void;
}) {
  if (items.length === 0) {
    return <p className="p-4 text-ink-soft">Les réponses de tes clients arriveront ici.</p>;
  }
  return (
    <>
      <ul className="max-h-[60vh] divide-y-2 divide-grid overflow-y-auto">
        {items.map((item) => {
          const content = (
            <>
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-bold text-ink">{item.title}</span>
                <span className="shrink-0 text-xs text-ink-muted">
                  {relativeTime(new Date(item.createdAt), now)}
                </span>
              </span>
              <span className="mt-0.5 block text-sm text-ink-soft">{item.body}</span>
            </>
          );
          const unread = item.readAt === null;
          const row = `block px-4 py-3 ${unread ? 'bg-accent/15' : ''}`;
          return (
            <li key={item.id}>
              {item.url ? (
                <Link
                  href={item.url}
                  onClick={() => onOpen(item)}
                  className={`${row} transition-colors hover:bg-grid/60 motion-reduce:transition-none`}
                >
                  {content}
                </Link>
              ) : (
                <div className={row}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onMarkAll}
        className="w-full border-t-2 border-ink px-4 py-3 text-left text-sm font-bold text-primary"
      >
        Tout marquer comme lu
      </button>
    </>
  );
}

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BellItem[] | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    api<{ count: number }>('/api/notifications/count')
      .then((r) => setUnread(r.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      api<{ items: Serialized[] }>('/api/notifications?limit=10')
        .then((r) => setItems(r.items.map(toItem)))
        .catch(() => setItems([]));
    }
  }

  function markRead(ids: string[] | 'all') {
    api<{ unreadCount: number }>('/api/notifications', { method: 'PATCH', body: { ids } })
      .then((r) => setUnread(r.unreadCount))
      .catch(() => {});
    const now = new Date().toISOString();
    setItems((list) =>
      (list ?? []).map((i) => (ids === 'all' || ids.includes(i.id) ? { ...i, readAt: now } : i)),
    );
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={bellLabel(unread)}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={toggle}
        className="relative grid size-11 place-items-center rounded-full text-ink transition-colors hover:bg-grid/60 motion-reduce:transition-none"
      >
        <Icon name="bell" />
        {unread > 0 && (
          <span
            data-badge
            className="absolute top-0.5 right-0.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-ink bg-accent px-1 text-[11px] leading-none font-bold text-accent-ink"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="frame absolute top-full right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-card bg-surface shadow-press">
          <p className="border-b-2 border-ink px-4 py-3 font-hand text-xl font-bold text-primary">
            Notifications
          </p>
          {items === null ? (
            <p className="p-4 text-ink-soft">Chargement…</p>
          ) : (
            <NotificationPanel
              items={items}
              now={new Date()}
              onOpen={(item) => {
                if (item.readAt === null) markRead([item.id]);
                setOpen(false);
              }}
              onMarkAll={() => markRead('all')}
            />
          )}
        </div>
      )}
    </div>
  );
}
