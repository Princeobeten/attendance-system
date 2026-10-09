export function CardIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M14 9.5a3.5 3.5 0 0 1 0 5M16.5 8a6 6 0 0 1 0 8" strokeLinecap="round" />
      <path d="M6 15h4" strokeLinecap="round" />
    </svg>
  );
}
