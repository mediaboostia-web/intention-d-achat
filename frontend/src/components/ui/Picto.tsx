import { cn } from '@/lib/utils';

export type PictoName = 'stall' | 'cartons' | 'calendar';

// Two-tone pictures drawn for Tamani (lot 7a, porteur: « pro et unique, pas
// des icônes génériques »): sign-painter yellow under the ink line.
const DRAWINGS: Record<PictoName, React.ReactNode> = {
  // The market stall: available now.
  stall: (
    <>
      <path d="M5 13 7.5 6h17L27 13" className="fill-accent" />
      <path d="M5 13c0 1.8 1.2 3 2.75 3s2.75-1.2 2.75-3c0 1.8 1.2 3 2.75 3S16 14.8 16 13c0 1.8 1.2 3 2.75 3s2.75-1.2 2.75-3c0 1.8 1.2 3 2.75 3S27 14.8 27 13" />
      <path d="M7.5 16v10M24.5 16v10M4.5 26h23" />
      <rect x="12" y="20" width="8" height="6" rx="1" className="fill-accent" />
    </>
  ),
  // Stacked cartons: the stock.
  cartons: (
    <>
      <rect x="4.5" y="16" width="11.5" height="10.5" rx="1.2" className="fill-accent" />
      <rect x="16" y="16" width="11.5" height="10.5" rx="1.2" className="fill-accent" />
      <rect x="10.25" y="5.5" width="11.5" height="10.5" rx="1.2" className="fill-accent" />
      <path d="M10.25 16v3.2M21.75 16v3.2M16 5.5v3.2" />
    </>
  ),
  // The calendar with a tick: it arrives on a date.
  calendar: (
    <>
      <rect x="5" y="7" width="22" height="20" rx="3" className="fill-surface" />
      <path d="M5 10a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3v3H5z" className="fill-accent" />
      <path d="M11 4.5v5M21 4.5v5" />
      <path d="m12 19.5 3 3 5.5-6" className="stroke-primary" />
    </>
  ),
};

/** A two-tone picture beside a line of text; decorative, the text says it all. */
export function Picto({ name, className }: { name: PictoName; className?: string }) {
  return (
    <svg
      data-picto={name}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-7 shrink-0 stroke-ink', className)}
    >
      {DRAWINGS[name]}
    </svg>
  );
}
