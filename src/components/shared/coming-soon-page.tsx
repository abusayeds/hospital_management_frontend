"use client";

import Link from "next/link";
import { notFound, usePathname } from "next/navigation";
import { ArrowLeft, Construction } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useLabel } from "@/lib/language";
import { findNavItem, roleFromPath, ROLES } from "@/lib/navigation";
import { PHASES } from "@/lib/roadmap";

/**
 * Catch-all placeholder for every menu item that a later phase builds.
 * Title, icon, description and phase all come from lib/navigation.ts, so no
 * page file is needed until the real feature exists. Unknown URLs → 404.
 */
export default function ComingSoonPage() {
  const pathname = usePathname();
  const t = useLabel();
  const role = roleFromPath(pathname);
  const item = role ? findNavItem(role, pathname) : undefined;
  if (!role || !item || item.href !== pathname || !item.phase) notFound();

  const Icon = item.icon;
  const phase = PHASES[item.phase];

  return (
    <div className="space-y-6">
      <PageHeader title={t(item)} description={item.description} />
      <div className="flex flex-col items-center gap-5 rounded-xl border border-dashed bg-card px-6 py-14 text-center shadow-card">
        <span className="relative flex size-16 items-center justify-center rounded-2xl bg-accent text-primary">
          <Icon className="size-8" aria-hidden />
          <span className="absolute -right-1.5 -bottom-1.5 flex size-7 items-center justify-center rounded-full border-2 border-card bg-status-waiting-bg text-status-waiting-fg">
            <Construction className="size-3.5" aria-hidden />
          </span>
        </span>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-primary">Arrives in Phase {item.phase}</p>
          <p className="text-lg font-semibold text-heading">{phase.title}</p>
          <p className="font-bangla text-sm text-muted-foreground">{phase.titleBn}</p>
        </div>
        <p className="max-w-md text-sm text-muted-foreground">
          The menu, route and layout for this screen are ready. The feature itself is built in its own phase so each
          part can be tested properly before the next one starts.
        </p>
        <Button variant="outline" size="lg" render={<Link href={ROLES[role].basePath} />} nativeButton={false}>
          <ArrowLeft /> Back to dashboard
        </Button>
      </div>
    </div>
  );
}
