"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { useLabel } from "@/lib/language";
import { isActive, NAVIGATION, NavItem, Role, ROLES, SHARED_LINKS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  role: Role;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void; // closes the mobile drawer after a click
};

// Rendered twice by AppShell: as the desktop sidebar and inside the mobile drawer.
export function SidebarNav({ role, collapsed = false, onToggleCollapsed, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const t = useLabel();
  const { can } = useAuth();

  // Only items the user's permissions allow; sections with nothing left disappear
  const sections = NAVIGATION[role]
    .map((section) => ({ ...section, items: section.items.filter((i) => !i.permission || can(i.permission)) }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 shrink-0 items-center border-b", collapsed ? "justify-center px-2" : "px-5")}>
        <Link href={ROLES[role].basePath} onClick={onNavigate} className="rounded-lg">
          <BrandLogo compact={collapsed} subtitle={t(ROLES[role])} />
        </Link>
      </div>

      <nav aria-label={`${ROLES[role].label} menu`} className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section, i) => (
          <div key={section.title ?? i} className="space-y-1">
            {section.title && !collapsed && (
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
                {t({ label: section.title, labelBn: section.titleBn })}
              </p>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(item, pathname, role)}
                collapsed={collapsed}
                label={t(item)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}

        {role !== "patient" && (
          <div className="space-y-1 border-t pt-4">
            {!collapsed && (
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
                {t({ label: "Displays & tools", labelBn: "ডিসপ্লে ও টুলস" })}
              </p>
            )}
            {SHARED_LINKS.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={pathname === item.href}
                collapsed={collapsed}
                label={t(item)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </nav>

      {onToggleCollapsed && (
        <div className="border-t p-3">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      )}
    </div>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  label,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  label: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const className = cn(
    "group relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
      : "text-sidebar-foreground hover:bg-muted hover:text-heading",
    collapsed && "justify-center px-0",
  );
  const content = (
    <>
      {active && <span aria-hidden className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-sidebar-primary" />}
      <Icon className={cn("size-[18px] shrink-0", active ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-heading")} aria-hidden />
      {!collapsed && <span className="truncate">{label}</span>}
    </>
  );

  if (!collapsed) {
    return (
      <Link href={item.href} onClick={onNavigate} className={className} aria-current={active ? "page" : undefined}>
        {content}
      </Link>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} aria-label={label} />}
        className={className}
      >
        {content}
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
