import { cn } from '@/lib/utils';
import { Icon } from './icons';

export type ListLayout = 'card' | 'list';

const CHOICES: ReadonlyArray<{ value: ListLayout; label: string; icon: 'grid' | 'rows' }> = [
  { value: 'card', label: 'Cartes', icon: 'grid' },
  { value: 'list', label: 'Liste', icon: 'rows' },
];

/**
 * The list's classes: one card per row on a phone (the titles keep their
 * room), a grid of 240px cards from 640px; one framed list of lines.
 */
export function listClass(layout: ListLayout): string {
  return layout === 'card'
    ? 'grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:gap-4'
    : 'frame divide-y-2 divide-grid overflow-hidden rounded-card bg-surface';
}

/** Cards or list (lot 7a): two pressed buttons; the words hide on a phone, the icons stay. */
export function LayoutSwitch({
  value,
  onChange,
  className,
}: {
  value: ListLayout;
  onChange: (layout: ListLayout) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Affichage"
      className={cn('frame inline-flex shrink-0 rounded-full bg-surface p-0.5', className)}
    >
      {CHOICES.map((c) => (
        <button
          key={c.value}
          type="button"
          aria-pressed={value === c.value}
          title={c.label}
          onClick={() => onChange(c.value)}
          className={cn(
            'flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm font-bold sm:px-3.5',
            value === c.value ? 'bg-accent text-accent-ink' : 'text-ink hover:bg-grid/70',
          )}
        >
          <Icon name={c.icon} className="size-5" />
          <span className="sr-only sm:not-sr-only">{c.label}</span>
        </button>
      ))}
    </div>
  );
}
