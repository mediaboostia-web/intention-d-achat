// The drawing on the sign-in panel (lot 5b): a notebook page where the
// community's answers are counted in tally marks, and the phone the question
// went out on. Ink and sign-painter yellow from the charter; decorative only.

const GRID = Array.from({ length: 11 }, (_, i) => 48 + i * 18);

/** Tally marks in fives: four strokes, the fifth across them. */
function Tally({ x, y, count }: { x: number; y: number; count: number }) {
  return Array.from({ length: count }, (_, i) => {
    const gx = x + Math.floor(i / 5) * 46;
    const k = i % 5;
    const d =
      k < 4
        ? `M${gx + k * 8} ${y + (k % 2)} l${k % 2 ? -1 : 1} 24`
        : `M${gx - 5} ${y + 19} L${gx + 29} ${y + 4}`;
    return <path key={i} d={d} />;
  });
}

export function AuthIllustration({ className }: { className?: string }) {
  return (
    <svg
      data-illustration="auth"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 360 280"
      fill="none"
      className={className}
    >
      <g transform="rotate(-4 150 140)">
        <rect x="36" y="36" width="230" height="210" rx="6" fill="var(--color-ink)" opacity="0.3" />
        <rect x="30" y="30" width="230" height="210" rx="6" fill="var(--color-surface)" />
        <g stroke="var(--color-grid)" strokeWidth="1">
          {GRID.map((v) => (
            <path key={`h${v}`} d={`M30 ${v} H260`} />
          ))}
          {GRID.map((v) => (
            <path key={`v${v}`} d={`M${v} 30 V240`} />
          ))}
        </g>
        <path d="M64 30 V240" stroke="var(--color-margin)" strokeWidth="2" />
        <path
          d="M118 102 C 150 98, 200 104, 252 99"
          stroke="var(--color-accent)"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.9"
        />
        <g fill="var(--color-ink)" className="font-hand" fontSize="22" fontWeight="700">
          <text x="74" y="108">
            Oui
          </text>
          <text x="74" y="160">
            Non
          </text>
        </g>
        <g stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round">
          <Tally x={130} y={88} count={12} />
          <Tally x={130} y={140} count={3} />
        </g>
        <path
          d="M76 200 C 110 196, 150 202, 196 197"
          stroke="var(--color-ink)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      </g>

      <g transform="rotate(8 285 180)">
        <rect
          x="243"
          y="101"
          width="100"
          height="170"
          rx="16"
          fill="var(--color-ink)"
          opacity="0.3"
        />
        <rect x="237" y="95" width="100" height="170" rx="16" fill="var(--color-ink)" />
        <rect x="245" y="111" width="84" height="138" rx="8" fill="var(--color-surface)" />
        <rect x="274" y="101" width="26" height="4" rx="2" fill="var(--color-ink-soft)" />
        <path
          d="M263 124 H309 a8 8 0 0 1 8 8 V150 a8 8 0 0 1 -8 8 H266 l-9 7 v-7 a8 8 0 0 1 -4 -7 V132 a8 8 0 0 1 10 -8 Z"
          fill="var(--color-accent)"
        />
        <g stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round">
          <path d="M263 136 H305" />
          <path d="M263 146 H290" />
        </g>
        <rect x="273" y="176" width="48" height="30" rx="10" fill="var(--color-primary)" />
        <path
          d="M287 191 l6 6 l13 -13"
          stroke="var(--color-surface)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect
          x="273"
          y="214"
          width="48"
          height="24"
          rx="10"
          stroke="var(--color-grid)"
          strokeWidth="2.5"
        />
      </g>
    </svg>
  );
}
