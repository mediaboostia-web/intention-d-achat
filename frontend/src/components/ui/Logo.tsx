import {
  CORDS_PATH,
  MARK_PATH,
  MARK_VIEWBOX,
  WORDMARK_ASPECT,
  WORDMARK_PATH,
  WORDMARK_VIEWBOX,
} from '@/lib/design/logo-paths';
import { colors } from '@/lib/design/tokens';

// Same geometry as public/brand/tamani-logo.svg: mark 48 units, a quarter of
// its height as gap, wordmark 30 units tall.
const WORD_W = 30 * WORDMARK_ASPECT;
const LOCKUP_W = 60 + WORD_W;

function Mark() {
  return (
    <>
      <path
        d={MARK_PATH}
        fill={colors.accent}
        stroke={colors.ink}
        strokeWidth={2.3}
        strokeLinejoin="round"
      />
      <path
        d={CORDS_PATH}
        fill="none"
        stroke={colors.primary}
        strokeWidth={2.7}
        strokeLinecap="round"
      />
    </>
  );
}

/** The Tamani logo. `size` is the height in px. */
export function Logo({
  variant = 'lockup',
  size = 32,
  className,
}: {
  variant?: 'mark' | 'lockup';
  size?: number;
  className?: string;
}) {
  if (variant === 'mark') {
    return (
      <svg
        role="img"
        aria-label="Tamani"
        viewBox={MARK_VIEWBOX}
        width={size}
        height={size}
        className={className}
      >
        <Mark />
      </svg>
    );
  }
  return (
    <svg
      role="img"
      aria-label="Tamani"
      viewBox={`0 0 ${LOCKUP_W} 48`}
      width={(size * LOCKUP_W) / 48}
      height={size}
      className={className}
    >
      <Mark />
      <svg x={60} y={8} width={WORD_W} height={30} viewBox={WORDMARK_VIEWBOX}>
        <path d={WORDMARK_PATH} fill={colors.primary} />
      </svg>
    </svg>
  );
}
