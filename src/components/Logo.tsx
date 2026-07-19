export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ts-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A78BFA" />
          <stop offset="0.5" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      {/* Interlocking timeline bars forming an abstract S */}
      <rect x="6" y="8" width="26" height="7" rx="3.5" fill="url(#ts-grad)" />
      <rect x="16" y="20.5" width="26" height="7" rx="3.5" fill="url(#ts-grad)" opacity="0.85" />
      <rect x="6" y="33" width="26" height="7" rx="3.5" fill="url(#ts-grad)" />
      <circle cx="38" cy="11.5" r="3.5" fill="#22D3EE" />
      <circle cx="10" cy="24" r="3.5" fill="#7C3AED" />
      <circle cx="38" cy="36.5" r="3.5" fill="#22D3EE" />
    </svg>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="text-xl tracking-tight text-foreground">
        <span className="font-light">Time</span>
        <span className="font-bold">Span</span>
      </span>
    </span>
  );
}
