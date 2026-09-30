"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Forbidden } from "@/components/shared/forbidden";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { roleFromPath } from "@/lib/navigation";
import { useLocalStorage } from "@/lib/use-local-storage";
import { cn } from "@/lib/utils";
import { AppHeader } from "./app-header";
import { IdleTimeout } from "./idle-timeout";
import { SidebarNav } from "./sidebar-nav";

/**
 * Staff layout: sidebar + header + content, for the SIGNED-IN user's role.
 * - The menu is always the user's own role (filtered by permission).
 * - Opening another role's area (/doctor while logged in as reception) shows
 *   the friendly 403 page instead of the content.
 * - The API still checks permissions on every request; this is the UX layer.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [collapsedPref, setCollapsedPref] = useLocalStorage("testolife_sidebar_collapsed", "false");
  const collapsed = collapsedPref === "true";
  const [mobileOpen, setMobileOpen] = useState(false);

  // New accounts and admin resets must set their own password first
  useEffect(() => {
    if (user?.mustChangePassword) router.replace("/change-password");
  }, [user, router]);

  if (isLoading || !user || user.mustChangePassword) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageSkeleton />
      </div>
    );
  }

  const role = user.role;
  const inOwnArea = roleFromPath(pathname) === role;

  return (
    <div className="flex min-h-dvh w-full">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 border-r bg-sidebar transition-[width] duration-200 lg:block",
          collapsed ? "w-19" : "w-64",
        )}
      >
        <SidebarNav role={role} collapsed={collapsed} onToggleCollapsed={() => setCollapsedPref(String(!collapsed))} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0 data-[side=left]:sm:max-w-72">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SidebarNav role={role} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader role={role} onMenuClick={() => setMobileOpen(true)} />
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{inOwnArea ? children : <Forbidden />}</div>
        </main>
      </div>

      <IdleTimeout />
    </div>
  );
}
