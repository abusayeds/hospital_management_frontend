"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, PackageMinus, PackagePlus, PackageX, Pill, TimerOff } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPoisha } from "@/lib/money";
import { PharmacySummary, QUEUE_STATUS, STOCK_STATUS } from "@/lib/pharmacy";
import { useLiveEvents } from "@/lib/socket";
import { DashboardIntro } from "./dashboard-intro";

const LIVE = ["pharmacy:updated"];

/** Pharmacy home: prescriptions waiting, today's dispensing, and stock that needs attention */
export function PharmacyDashboard() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const summary = useQuery({ queryKey: ["pharmacy", "summary"], queryFn: () => apiFetch<PharmacySummary>("/pharmacy/summary"), refetchInterval: 60_000 });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["pharmacy"] }), [queryClient]);
  useLiveEvents(LIVE, refresh);
  const s = summary.data;

  return (
    <div className="space-y-6">
      <DashboardIntro
        description="Prescriptions to dispense, today's work and the stock that needs attention."
        actions={
          <>
            {can("stock:manage") && (
              <Button size="xl" variant="outline" render={<Link href="/pharmacy/purchases" />} nativeButton={false}>
                <PackagePlus /> Receive delivery
              </Button>
            )}
            <Button size="xl" render={<Link href="/pharmacy/dispense" />} nativeButton={false}>
              <Pill /> Dispense
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Prescriptions waiting" value={s?.pendingPrescriptions ?? "…"} icon={ClipboardList} hint="Signed in the last 2 days" />
        <StatCard label="Dispensed today" value={s?.dispensedToday ?? "…"} icon={Pill} hint={s ? `${formatPoisha(s.dispensedValueToday)} billed` : undefined} />
        <StatCard
          label="Low / out of stock"
          value={s ? `${s.lowStock} / ${s.outOfStock}` : "…"}
          icon={PackageMinus}
          tone={s?.outOfStock ? "danger" : "default"}
        />
        <StatCard
          label="Expiring in 30 days"
          value={s?.expiring30 ?? "…"}
          icon={TimerOff}
          tone={s?.expired ? "danger" : "default"}
          hint={s ? `${s.expired} expired batch(es) on the shelf` : undefined}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Waiting at the counter"
          bodyClassName="p-0"
          action={
            <Button variant="outline" size="sm" render={<Link href="/pharmacy/dispense" />} nativeButton={false}>
              Open
            </Button>
          }
        >
          {!s?.queue.length ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">No prescriptions waiting.</p>
          ) : (
            <ul className="divide-y">
              {s.queue.map((p) => (
                <li key={p.visitId} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-heading">{p.patient.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.prescriptionNo} · {p.preview}
                    </p>
                  </div>
                  <StatusBadge tone={QUEUE_STATUS[p.status].tone}>{QUEUE_STATUS[p.status].label}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard
          title="Stock to reorder"
          bodyClassName="p-0"
          action={
            <Button variant="outline" size="sm" render={<Link href="/pharmacy/stock" />} nativeButton={false}>
              <PackageX /> Stock
            </Button>
          }
        >
          {!s?.attention.length ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">Nothing is low. 👍</p>
          ) : (
            <ul className="divide-y">
              {s.attention.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-heading">{m.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.inStock} left · reorder at {m.reorderLevel}
                    </p>
                  </div>
                  <StatusBadge tone={STOCK_STATUS[m.status].tone}>{STOCK_STATUS[m.status].label}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
