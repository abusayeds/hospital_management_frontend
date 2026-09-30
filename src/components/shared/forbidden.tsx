"use client";

import Link from "next/link";
import { ArrowLeft, ShieldX } from "lucide-react";
import type { ReactNode } from "react";
import type { Permission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

/** Friendly 403: shown when a user opens a page their role may not use. */
export function Forbidden() {
  const { homePath } = useAuth();
  return (
    <div className="flex flex-col items-center gap-5 rounded-xl border bg-card px-6 py-16 text-center shadow-card">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-status-danger-bg text-status-danger-fg">
        <ShieldX className="size-8" aria-hidden />
      </span>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-status-danger-fg">403 · Access denied</p>
        <h1 className="text-2xl font-semibold text-heading">You don&apos;t have access to this page</h1>
        <p className="font-bangla text-muted-foreground">এই পেজ দেখার অনুমতি আপনার নেই</p>
      </div>
      <p className="max-w-md text-sm text-muted-foreground">
        Each role only sees the screens it needs, to keep patient information private. If you need this page for your
        work, ask the hospital administrator.
      </p>
      <Button size="lg" render={<Link href={homePath} />} nativeButton={false}>
        <ArrowLeft /> Back to my dashboard
      </Button>
    </div>
  );
}

/** Renders children only if the user holds the permission; otherwise the 403 screen. */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = useAuth();
  return can(permission) ? <>{children}</> : <Forbidden />;
}
