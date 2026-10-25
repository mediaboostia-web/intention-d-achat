import Link from 'next/link';
import { Icon } from './icons';

/**
 * The phone's big "+" at the bottom right, above the bottom bar: the page's
 * main action. Desktops keep the button in the page header instead.
 */
export function Fab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="frame fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 flex size-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-press transition-transform active:translate-y-px motion-reduce:transition-none lg:hidden"
    >
      <Icon name="plus" className="size-7" />
    </Link>
  );
}
