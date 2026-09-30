"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, LogOut } from "lucide-react";
import { ReactNode } from "react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Forbidden } from "@/components/shared/forbidden";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
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
import { useLabel } from "@/lib/language";
import { isActive, NAVIGATION } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { initials } from "./app-header";
import { IdleTimeout } from "./idle-timeout";
import { LanguageToggle } from "./language-toggle";

/**
 * Patient portal layout: phone-first. Big tap targets, a bottom tab bar like
 * common mobile apps, and a narrow centered column on larger screens.
 */
export function PatientShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const t = useLabel();
  const items = NAVIGATION.patient.flatMap((s) => s.items);
  const { user, isLoading, logout } = useAuth();

  if (isLoading || !user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <PageSkeleton />
      </div>
    );
  }
  // Staff accounts do not belong in the patient portal
  if (user.role !== "patient") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Forbidden />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/patient">
            <BrandLogo subtitle="Patient portal" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Account menu" />}>
                <Avatar className="size-9">
                  <AvatarFallback className="bg-accent text-xs font-semibold text-primary">{initials(user.name)}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <span className="block text-sm font-semibold text-heading">{user.name}</span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/change-password" />} className="h-10">
                  <KeyRound className="size-4" /> Change password
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout()} className="h-10">
                  <LogOut className="size-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <nav aria-label="Patient menu" className="mx-auto hidden max-w-3xl gap-1 px-4 pb-2 sm:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item, pathname, "patient") ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium",
                isActive(item, pathname, "patient") ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t(item)}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-28 sm:pb-10">{children}</main>

      {/* Bottom tab bar on phones */}
      <nav
        aria-label="Patient menu"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item, pathname, "patient");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}
            >
              <Icon className="size-5" aria-hidden />
              <span className="max-w-full truncate px-1">{t(item)}</span>
            </Link>
          );
        })}
      </nav>
      <IdleTimeout />
    </div>
  );
}
