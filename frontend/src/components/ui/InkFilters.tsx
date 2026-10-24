/**
 * SVG filters behind the `stamp` (rubber-stamp ink) and `pen` (hand-drawn
 * wobble) utilities of globals.css. Rendered once, by the root layout.
 */
export function InkFilters() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <filter id="tm-ink" x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.035"
            numOctaves={2}
            seed={3}
            result="wobble"
          />
          <feDisplacementMap in="SourceGraphic" in2="wobble" scale={2.4} result="edges" />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.95"
            numOctaves={1}
            seed={8}
            result="grain"
          />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -4.2 3.3"
            result="mask"
          />
          <feComposite in="edges" in2="mask" operator="in" />
        </filter>
        <filter id="tm-pen" x="-4%" y="-20%" width="108%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05"
            numOctaves={2}
            seed={5}
            result="wobble"
          />
          <feDisplacementMap in="SourceGraphic" in2="wobble" scale={1.8} />
        </filter>
      </defs>
    </svg>
  );
}
