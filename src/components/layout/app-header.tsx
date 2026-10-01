"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, KeyRound, LogOut, Menu, MonitorX } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SystemStatus } from "@/components/shared/system-status";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { AutomationAlerts } from "@/features/automation/automation-alerts";
import { InboxBell } from "@/features/inbox/inbox-bell";
import { useLabel } from "@/lib/language";
import { findNavItem, Role } from "@/lib/navigation";
import { LanguageToggle } from "./language-toggle";
import { RoleBadge } from "./role-badge";

export const initials = (name: string) =>
  name
    .replace(/^Dr\.\s*/, "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function AppHeader({ role, onMenuClick }: { role: Role; onMenuClick?: () => void }) {
  const pathname = usePathname();
  const t = useLabel();
  const { user, logout } = useAuth();
  const [confirmAll, setConfirmAll] = useState(false);
  const current = findNavItem(role, pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur supports-backdrop-filter:bg-card/75 sm:px-6">
      {onMenuClick && (
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-base leading-tight font-semibold text-heading">{current ? t(current) : "Testolife"}</p>
      </div>

      <SystemStatus className="hidden md:inline-flex" />
      <LanguageToggle className="hidden sm:inline-flex" />

      <AutomationAlerts />

      <InboxBell inboxHref={role === "super_admin" ? "/admin/inbox" : "/reception/inbox"} />

      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" className="h-11 gap-2.5 px-2 sm:pr-3" aria-label="Account menu" />}>
            <Avatar className="size-8">
              <AvatarFallback className="bg-accent text-xs font-semibold text-primary">{initials(user.name)}</AvatarFallback>
            </Avatar>
            <span className="hidden min-w-0 text-left leading-tight md:block">
              <span className="block max-w-40 truncate text-sm font-semibold text-heading">{user.name}</span>
              <RoleBadge role={user.role} className="mt-0.5" />
            </span>
            <ChevronDown className="hidden size-4 text-muted-foreground md:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="space-y-1 text-foreground">
                <span className="block text-sm font-semibold text-heading">{user.name}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                <RoleBadge role={user.role} className="md:hidden" />
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/change-password" />} className="h-9">
              <KeyRound className="size-4" /> Change password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="h-9">
              <LogOut className="size-4" /> Log out
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setConfirmAll(true)} className="h-9">
              <MonitorX className="size-4" /> Log out of all devices
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title="Log out of all devices?"
        description="You will be signed out here and on every other computer or phone where you are signed in. Use this if you forgot to log out on a shared computer."
        confirmLabel="Log out everywhere"
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={() => logout({ everywhere: true })}
      />
    </header>
  );
}
