"use client";

import { useLabel } from "@/lib/language";
import { ROLES } from "@/lib/navigation";
import type { Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";

// Each role has its own colour so staff can tell accounts apart at a glance (always with text).
export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const t = useLabel();
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2 py-px text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset",
        ROLES[role].badgeClass,
        className,
      )}
    >
      {t(ROLES[role])}
    </span>
  );
}
