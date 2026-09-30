import type { FieldError as RHFFieldError } from "react-hook-form";
import { cn } from "@/lib/utils";

// Small shared pieces for the admin forms (same look as the Phase 2 user form)

export function FieldError({ error }: { error?: Pick<RHFFieldError, "message"> }) {
  if (!error?.message) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {error.message}
    </p>
  );
}

export function FormError({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={cn("rounded-lg border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm text-status-danger-fg", className)}>
      {message}
    </p>
  );
}

/** "12 hours" / "2 days" for lab turnaround times */
export const formatHours = (h: number) => (h >= 48 && h % 24 === 0 ? `${h / 24} days` : `${h} hours`);
