import { cn } from "@/lib/utils";

// Simple cross-in-leaf mark drawn in SVG so it stays sharp at every size.
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground", className)}>
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
        <circle cx="12" cy="12" r="9.5" strokeWidth="1.4" opacity="0.55" />
      </svg>
    </span>
  );
}

export function BrandLogo({ subtitle = "Hospital OS", compact, className }: { subtitle?: string; compact?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[15px] font-semibold text-heading">Testolife Hospital</span>
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        </span>
      )}
    </span>
  );
}
