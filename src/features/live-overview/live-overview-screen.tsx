"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CalendarDays, Siren, Wallet } from "lucide-react";
import { useCallback } from "react";
import { ColumnChart, RankedBarChart } from "@/components/shared/charts";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { RequirePermission } from "@/components/shared/forbidden";
import { StatCard } from "@/components/shared/stat-card";
import { STATUS_CONFIG, StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { formatPoisha as formatTaka } from "@/lib/money";
import { useLiveEvents } from "@/lib/socket";
import type { AppointmentStatus, DashboardStats } from "@/lib/types";

const LIVE_EVENTS = ["appointment:created", "appointment:updated", "chat:handoff", "chat:resolved"];
const STATUSES: AppointmentStatus[] = ["booked", "checked_in", "in_consultation", "completed", "cancelled", "no_show"];

const shortDay = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" });

export function LiveOverviewScreen() {
  return (
    <div className="space-y-6">
      <PageHeader title="Live overview" description="Real data from today's appointments and assistant chats. Updates the moment anything changes." />
      <RequirePermission permission="report:operations">
        <Overview />
      </RequirePermission>
    </div>
  );
}

function Overview() {
  const queryClient = useQueryClient();
  const stats = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => apiFetch<DashboardStats>("/dashboard/stats") });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }), [queryClient]);
  useLiveEvents(LIVE_EVENTS, refresh);

  if (!stats.data) return <PageSkeleton />;
  const s = stats.data;
  const waiting = (s.appointments.byStatus.checked_in ?? 0) + (s.appointments.byStatus.in_consultation ?? 0);
  const aiShare = s.appointments.total ? Math.round((s.ai.bookingsByAi / s.appointments.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {s.ai.pendingHandoffs > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-status-danger-border bg-status-danger-bg px-4 py-3 text-status-danger-fg">
          <Siren className="size-5" aria-hidden />
          <p className="flex-1 text-sm font-medium">{s.ai.pendingHandoffs} patient(s) from the assistant chat are waiting for a staff call-back.</p>
          <Button size="sm" variant="outline" render={<Link href="/reception/ai-alerts" />} nativeButton={false}>
            Open assistant alerts
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Appointments today" value={s.appointments.total} icon={CalendarDays} hint={`${waiting} in the hospital now`} />
        <StatCard label="Booked by assistant" value={s.ai.bookingsByAi} icon={Bot} hint={`${aiShare}% of total · ${s.ai.chatSessions} chats`} />
        <StatCard label="Fees collected" value={formatTaka(s.revenue.collected)} icon={Wallet} hint={`Expected ${formatTaka(s.revenue.expected)}`} />
        <StatCard
          label="Emergency alerts"
          value={s.ai.emergencies}
          icon={Siren}
          tone={s.ai.emergencies ? "danger" : "default"}
          hint={`No-show rate ${s.appointments.noShowRate}%`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <SectionCard title="Appointments · last 7 days" description="Excluding cancelled" className="lg:col-span-3">
          <ColumnChart data={s.last7Days.map((d) => ({ label: shortDay(d.date), value: d.count }))} caption="Appointments per day" highlightLast />
        </SectionCard>
        <SectionCard title="By department" description="Today" className="lg:col-span-2">
          {s.byDepartment.length ? (
            <RankedBarChart data={s.byDepartment.map((d) => ({ label: d.department, value: d.count }))} caption="Appointments by department today" />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No appointments yet today</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="By status">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STATUSES.map((k) => (
            <div key={k} className="space-y-2 rounded-lg border bg-muted/40 px-4 py-3">
              <StatusBadge status={k} />
              <p className="text-2xl font-semibold text-heading tabular-nums">{s.appointments.byStatus[k] ?? 0}</p>
              <span className="sr-only">{STATUS_CONFIG[k].label}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
