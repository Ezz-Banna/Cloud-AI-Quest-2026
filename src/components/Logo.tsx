// Bridgecom mark: two rising banks joined by a single arch, with a small sand-coloured traveller point.
export function LogoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <rect width="48" height="48" rx="14" fill="#264653" />
      <path d="M6 36 L14 24 L14 36 Z" fill="#6F9C94" />
      <path d="M42 36 L34 24 L34 36 Z" fill="#6F9C94" />
      <path d="M14 24 Q24 12 34 24" fill="none" stroke="#E8EFEA" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 26 L34 26" stroke="#E8EFEA" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M19 26 L19 20.5 M24 26 L24 18.6 M29 26 L29 20.5" stroke="#E8EFEA" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="24" cy="12.5" r="2.6" fill="#D2A679" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="text-xl font-bold tracking-tight text-teal">Bridge<span className="text-sage">com</span></span>
    </span>
  );
}
