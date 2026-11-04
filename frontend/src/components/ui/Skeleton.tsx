import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { ListLayout } from './LayoutSwitch';

// Loading screens (porteur, 2026-11-04): grey blocks in the shape of what is
// coming, so the page does not jump when the data lands. A screen reader
// hears the label once; the blocks are hidden from it. The pulse stops under
// prefers-reduced-motion.

/** One grey block. `kind` names it for the tests. */
export function Bone({
  className,
  kind,
}: {
  className?: string | undefined;
  kind?: 'tab' | 'field' | 'button' | 'cell';
}) {
  return <span data-bone={kind} className={cn('block rounded-case bg-grid/70', className)} />;
}

/** A loading block: `className` lays out the bones (margins, flex, gap). */
export function Skeleton({
  label,
  className,
  children,
}: {
  label: string;
  className?: string | undefined;
  children?: ReactNode;
}) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className={cn('motion-safe:animate-pulse', className)}>
        {children}
      </div>
    </div>
  );
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Two lines of text: a title and a quieter line under it. */
function Lines({ first = 'w-2/3', second = 'w-1/3' }: { first?: string; second?: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-2">
      <Bone className={cn('h-4', first)} />
      <Bone className={cn('h-3', second)} />
    </span>
  );
}

const PANEL = 'overflow-hidden rounded-card border-2 border-grid bg-surface';

/** Campaign and product lists: cards with their photo band, or framed lines. */
export function CardsSkeleton({
  label,
  layout,
  count = 4,
  className,
}: {
  label: string;
  layout: ListLayout;
  count?: number;
  className?: string | undefined;
}) {
  return (
    <Skeleton label={label} className={className}>
      {layout === 'card' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:gap-4">
          {range(count).map((i) => (
            <div key={i} className={cn(PANEL, 'flex flex-col', i > 1 && 'max-sm:hidden')}>
              <span className="block aspect-[16/7] w-full border-b-2 border-grid bg-grid/40" />
              <span className="flex flex-col gap-2 p-3">
                <Bone className="h-4 w-3/4" />
                <Bone className="h-3 w-1/2" />
                <Bone className="h-3 w-1/3" />
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className={cn(PANEL, 'divide-y-2 divide-grid')}>
          {range(count).map((i) => (
            <div key={i} className="flex min-h-16 items-center gap-3 px-3 py-2.5">
              <Bone className="size-11 shrink-0" />
              <Lines first="w-1/2" second="w-1/4" />
              <Bone className="h-6 w-16 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      )}
    </Skeleton>
  );
}

/** Clients, orders and interested people: one framed list of lines. */
export function RowsSkeleton({
  label,
  count = 3,
  avatar = true,
  className,
}: {
  label: string;
  count?: number;
  avatar?: boolean;
  className?: string | undefined;
}) {
  return (
    <Skeleton label={label} className={className}>
      <div className={cn(PANEL, 'divide-y-2 divide-grid')}>
        {range(count).map((i) => (
          <div key={i} className="flex min-h-[72px] items-center gap-3 px-3 py-3">
            {avatar && <span className="block size-10 shrink-0 rounded-full bg-grid/70" />}
            <Lines first="w-2/5" second="w-1/4" />
            <Bone className="h-5 w-14 shrink-0" />
          </div>
        ))}
      </div>
    </Skeleton>
  );
}

/** A detail page: its title, its tabs if it has some, then the first block. */
export function DetailSkeleton({
  label,
  tabs = 0,
  className,
}: {
  label: string;
  tabs?: number;
  className?: string | undefined;
}) {
  return (
    <Skeleton label={label} className={className}>
      <div className="flex flex-col gap-2">
        <Bone className="h-9 w-2/3" />
        <Bone className="h-4 w-1/3" />
      </div>
      {tabs > 0 && (
        <div className="mt-6 flex gap-3 border-b-2 border-grid pb-3">
          {range(tabs).map((i) => (
            <Bone key={i} kind="tab" className="h-5 flex-1" />
          ))}
        </div>
      )}
      <div className={cn(PANEL, 'mt-6 flex flex-col gap-3 p-4')}>
        <Bone className="h-10 w-1/3" />
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-5/6" />
        <Bone className="h-3 w-2/3" />
      </div>
      <div className={cn(PANEL, 'mt-4 divide-y-2 divide-grid')}>
        {range(2).map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Lines />
            <Bone className="h-5 w-14" />
          </div>
        ))}
      </div>
    </Skeleton>
  );
}

/** A form: a label and a field per line, then the button. */
export function FormSkeleton({
  label,
  fields = 3,
  className,
}: {
  label: string;
  fields?: number;
  className?: string | undefined;
}) {
  return (
    <Skeleton label={label} className={className}>
      <div className="flex flex-col gap-5">
        {range(fields).map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Bone className="h-4 w-28" />
            <Bone kind="field" className="h-12 w-full rounded-control" />
          </div>
        ))}
        <Bone kind="button" className="h-12 w-44 rounded-control" />
      </div>
    </Skeleton>
  );
}

/** The export preview: a header row, then rows of cells. */
export function TableSkeleton({
  label,
  rows = 5,
  cols = 4,
  className,
}: {
  label: string;
  rows?: number;
  cols?: number;
  className?: string | undefined;
}) {
  return (
    <Skeleton label={label} className={className}>
      <div className={cn(PANEL, 'divide-y-2 divide-grid')}>
        {range(rows + 1).map((r) => (
          <div key={r} className={cn('flex gap-3 px-3 py-3', r === 0 && 'bg-grid/30')}>
            {range(cols).map((c) => (
              <Bone key={c} kind="cell" className={cn('h-3 flex-1', r === 0 && 'h-4')} />
            ))}
          </div>
        ))}
      </div>
    </Skeleton>
  );
}

/** The home: greeting, this week's card, then the to-do (lines, tiles from 1024px). */
export function HomeSkeleton({ className }: { className?: string | undefined }) {
  return (
    <Skeleton label="Chargement de l'accueil" className={className}>
      <HomeBones />
    </Skeleton>
  );
}

/** The shop gate, before the shell: the notebook cover from 1024px, then the home's shape. */
export function ShopSkeleton() {
  return (
    <div className="flex min-h-dvh bg-paper">
      <span
        aria-hidden="true"
        className="bg-cover hidden w-[248px] shrink-0 border-r-[2.5px] border-ink lg:block collapsed:w-[84px]"
      />
      <div className="min-w-0 flex-1 px-4 pt-6 sm:px-6 lg:px-8">
        <Skeleton label="Chargement de ta boutique" className="mx-auto max-w-3xl lg:max-w-none">
          <Bone className="h-9 w-1/2" />
          <Bone className="mt-2 h-4 w-1/3" />
          <div className="mt-6">
            <HomeBones />
          </div>
        </Skeleton>
      </div>
    </div>
  );
}

function HomeBones() {
  return (
    <>
      <div className={cn(PANEL, 'grid grid-cols-3 gap-3 p-4')}>
        {range(3).map((i) => (
          <span key={i} className="flex flex-col gap-2">
            <Bone className="h-10 w-12" />
            <Bone className="h-3 w-20" />
          </span>
        ))}
      </div>
      <Bone className="mt-8 h-6 w-32" />
      <div className={cn(PANEL, 'mt-3 divide-y-2 divide-grid lg:hidden')}>
        {range(3).map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Bone className="size-9 shrink-0 rounded-full" />
            <Lines />
          </div>
        ))}
      </div>
      <div className="mt-3 hidden grid-cols-3 gap-4 lg:grid">
        {range(3).map((i) => (
          <div key={i} className={cn(PANEL, 'flex h-40 flex-col gap-3 p-4')}>
            <Bone className="h-4 w-2/3" />
            <Bone className="h-10 w-1/3" />
            <Bone className="mt-auto h-3 w-full" />
          </div>
        ))}
      </div>
    </>
  );
}

/** « Mon pass »: the meter, then the passes on offer. */
export function BillingSkeleton({ className }: { className?: string | undefined }) {
  return (
    <Skeleton label="Chargement de ton pass" className={className}>
      <div className={cn(PANEL, 'flex flex-col gap-3 p-4')}>
        <Bone className="h-5 w-1/3" />
        <Bone className="h-4 w-full rounded-full" />
        <Bone className="h-3 w-1/2" />
      </div>
      <Bone className="mt-8 h-6 w-40" />
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {range(4).map((i) => (
          <div
            key={i}
            className={cn(PANEL, 'flex h-64 flex-col gap-3 p-4', i > 0 && 'max-sm:hidden')}
          >
            <Bone className="h-5 w-1/2" />
            <Bone className="h-9 w-2/3" />
            <Bone className="h-3 w-full" />
            <Bone className="h-3 w-5/6" />
            <Bone className="mt-auto h-11 w-full rounded-control" />
          </div>
        ))}
      </div>
    </Skeleton>
  );
}

/** The bell's panel: three notifications. */
export function NotificationsSkeleton({ className }: { className?: string | undefined }) {
  return (
    <Skeleton label="Chargement des notifications" className={className}>
      <div className="divide-y-2 divide-grid">
        {range(3).map((i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <Bone className="mt-1.5 size-2.5 shrink-0 rounded-full" />
            <Lines first="w-4/5" second="w-1/4" />
          </div>
        ))}
      </div>
    </Skeleton>
  );
}
