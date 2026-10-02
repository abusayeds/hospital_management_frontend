import Image from "next/image";
import { cn } from "@/lib/utils";

export const LOGO_SRC = "/images/testolife-logo.jpg";

// The hospital's logo (same image as the home page), on a white tile so it reads on any background.
// Size it with className (e.g. "size-11"); the image scales to fit.
export function BrandMark({ className, alt = "" }: { className?: string; alt?: string }) {
  return (
    <span className={cn("relative flex size-9 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-black/5", className)}>
      <Image src={LOGO_SRC} alt={alt} fill sizes="80px" className="object-contain p-0.5" />
    </span>
  );
}

export function BrandLogo({ subtitle = "Hospital OS", compact, className }: { subtitle?: string; compact?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark alt={compact ? "Testolife Hospital" : ""} />
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[15px] font-semibold text-heading">Testolife Hospital</span>
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        </span>
      )}
    </span>
  );
}
