// Lub's Cart crystal mark — original art (no Square Enix assets). Gold faceted gem.

export function Logo({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      aria-hidden
      role="img"
    >
      <defs>
        <linearGradient id="lc-gem" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd2a6" />
          <stop offset="42%" stopColor="#ff8a4c" />
          <stop offset="100%" stopColor="#d4493f" />
        </linearGradient>
      </defs>
      <g stroke="#7a2e1f" strokeWidth="10" strokeLinejoin="round">
        <polygon points="256,72 392,212 348,418 256,462 164,418 120,212" fill="url(#lc-gem)" />
        <polygon points="256,72 120,212 164,418 256,462" fill="#000000" opacity="0.16" stroke="none" />
        <polygon points="256,72 120,212 392,212" fill="#ffffff" opacity="0.22" stroke="none" />
        <g stroke="#ffe6cf" strokeWidth="8" opacity="0.5" fill="none">
          <line x1="256" y1="72" x2="256" y2="462" />
          <line x1="120" y1="212" x2="392" y2="212" />
          <line x1="164" y1="418" x2="348" y2="418" />
          <line x1="256" y1="212" x2="164" y2="418" />
          <line x1="256" y1="212" x2="348" y2="418" />
        </g>
      </g>
    </svg>
  );
}
