import { PLATFORM_PATHS, type PlatformSlug } from './platform-paths';

/** A platform's logo in currentColor, decorative (its name is written next to it). */
export function PlatformLogo({ slug, className }: { slug: PlatformSlug; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
      className={className}
    >
      <path d={PLATFORM_PATHS[slug]} />
    </svg>
  );
}
