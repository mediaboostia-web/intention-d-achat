import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'whatsapp' | 'ghost';
type Size = 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'frame bg-primary text-primary-ink',
  secondary: 'frame bg-surface text-ink',
  // WhatsApp green is reserved for this button (spec §3).
  whatsapp: 'frame bg-whatsapp text-whatsapp-ink',
  ghost: 'text-primary underline decoration-2 underline-offset-4',
};

const SIZES: Record<Size, string> = {
  md: 'min-h-12 px-5 text-base',
  lg: 'min-h-14 px-6 text-lg',
};

interface Common {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export type ButtonProps = Common &
  (
    | ({ href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'>)
    | ({ href?: undefined } & Omit<
        ButtonHTMLAttributes<HTMLButtonElement>,
        'className' | 'children'
      >)
  );

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        d="M12 3a9 9 0 0 0-7.8 13.4L3 21l4.7-1.2A9 9 0 1 0 12 3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M8.8 8.6c.2-.5.5-.5.8-.5h.5c.2 0 .4 0 .6.5l.7 1.7c.1.2 0 .4-.1.6l-.5.6c-.1.2-.2.3 0 .6.5.9 1.2 1.6 2.1 2.1.3.2.4.1.6 0l.6-.7c.2-.2.4-.2.6-.1l1.6.8c.2.1.4.2.4.4 0 .5-.2 1.2-.7 1.5-.5.4-1.4.6-2.6.2a9.4 9.4 0 0 1-4.5-4c-.7-1.2-.6-2.2-.1-3.7z"
        fill="currentColor"
      />
    </svg>
  );
}

/** A link when given `href`, otherwise a `type="button"` button. */
export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-control font-bold',
    'transition-transform active:translate-y-px motion-reduce:transition-none',
    'disabled:opacity-50',
    SIZES[size],
    VARIANTS[variant],
    className,
  );
  const content = (
    <>
      {variant === 'whatsapp' && <WhatsAppIcon />}
      {children}
    </>
  );

  if (rest.href !== undefined) {
    return (
      <a {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} className={classes}>
        {content}
      </a>
    );
  }
  const { type = 'button', ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={type} {...buttonRest} className={classes}>
      {content}
    </button>
  );
}
