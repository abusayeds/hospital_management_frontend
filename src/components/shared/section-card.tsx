import { ReactNode } from "react";
import { cn } from "@/lib/utils";

// White card with a title row — the standard container for dashboard sections.
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("flex flex-col rounded-xl border bg-card shadow-card", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2 px-5 pt-5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-heading">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className={cn("flex-1 p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
