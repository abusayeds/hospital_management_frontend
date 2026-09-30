import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  // e.g. { value: "12%", direction: "up", good: true } → green "↑ 12%"
  trend?: { value: string; direction: "up" | "down"; good?: boolean; label?: string };
  tone?: "default" | "danger";
  className?: string;
};

// Dashboard KPI tile: one number, what it means, and how it is moving.
export function StatCard({ label, value, icon: Icon, hint, trend, tone = "default", className }: StatCardProps) {
  const TrendIcon = trend?.direction === "down" ? TrendingDown : TrendingUp;
  const trendGood = trend?.good ?? trend?.direction === "up";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-card",
        tone === "danger" ? "border-status-danger-border" : "border-border",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              tone === "danger" ? "bg-status-danger-bg text-status-danger-fg" : "bg-accent text-primary",
            )}
          >
            <Icon className="size-[18px]" aria-hidden />
          </span>
        )}
      </div>
      <p
        className={cn(
          "text-3xl leading-none font-semibold tracking-tight tabular-nums",
          tone === "danger" ? "text-status-danger-fg" : "text-heading",
        )}
      >
        {value}
      </p>
      {(trend || hint) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-semibold",
                trendGood ? "text-status-success-fg" : "text-status-danger-fg",
              )}
            >
              <TrendIcon className="size-3.5" aria-hidden />
              {trend.value}
              <span className="sr-only">{trend.direction === "up" ? "increase" : "decrease"}</span>
            </span>
          )}
          {trend?.label && <span className="text-muted-foreground">{trend.label}</span>}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </div>
  );
}
