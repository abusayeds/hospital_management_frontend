"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Clock, Stethoscope, UserX, Users } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";
import { StatCardsSkeleton } from "@/components/shared/loading-skeleton";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiFetch } from "@/lib/api";
import { useLiveEvents } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { BoardDoctor, formatMinutes, TodayGlance } from "./queue-types";

const LIVE_EVENTS = ["appointment:updated", "queue:updated"];

export const useTodayGlance = () => {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["dashboard-today"], queryFn: () => apiFetch<TodayGlance>("/dashboard/today"), refetchInterval: 60_000 });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["dashboard-today"] }), [queryClient]);
  useLiveEvents(LIVE_EVENTS, refresh);
  return query;
};

/** Real counts for today (no patient details) — the top of reception, management and admin dashboards */
export function TodayStats({ data }: { data?: TodayGlance }) {
  if (!data) return <StatCardsSkeleton count={5} />;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatCard label="Appointments today" value={data.total} icon={CalendarDays} hint={`${data.booked} not arrived yet`} />
      <StatCard label="Checked in" value={data.checkedInTotal} icon={Users} hint={`${data.inConsultation} with a doctor now`} />
      <StatCard label="Waiting now" value={data.waiting} icon={Clock} hint={data.averageWaitMinutes !== null ? `Avg wait ${formatMinutes(data.averageWaitMinutes)}` : "No waits measured yet"} />
      <StatCard label="Completed" value={data.completed} icon={CheckCircle2} />
      <StatCard label="No-shows" value={data.noShow} icon={UserX} hint={`${data.cancelled} cancelled`} tone={data.noShow > 0 ? "danger" : "default"} />
    </div>
  );
}

/** Doctor-wise mini board: in session or not, current serial, waiting count */
export function DoctorMiniBoard({ doctors, linkBase }: { doctors?: BoardDoctor[]; linkBase?: string }) {
  if (!doctors) return null;
  if (doctors.length === 0) return <p className="text-sm text-muted-foreground">No doctor sits today.</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {doctors.map((d) => {
        const body = (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-heading">{d.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {d.department} · Room {d.roomNo ?? "—"}
                </p>
              </div>
              {d.onLeave ? (
                <StatusBadge tone="neutral">On leave</StatusBadge>
              ) : d.currentSerial !== null ? (
                <StatusBadge tone="active">In session</StatusBadge>
              ) : d.inSessionNow ? (
                <StatusBadge tone="info">Sitting now</StatusBadge>
              ) : (
                <StatusBadge tone="neutral">{d.sessionsToday[0] ?? "Off"}</StatusBadge>
              )}
            </div>
            <div className="mt-3 flex items-end gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Now</p>
                <p className={cn("text-3xl leading-none font-bold tabular-nums", d.currentSerial === null && "text-muted-foreground/40")}>{d.currentSerial ?? "–"}</p>
              </div>
              <div className="text-sm">
                <p>
                  <span className="font-semibold text-heading tabular-nums">{d.waiting}</span> waiting
                </p>
                <p className="text-muted-foreground">
                  {d.notArrived} not arrived · {d.completed} done
                </p>
              </div>
            </div>
          </>
        );
        return linkBase ? (
          <Link key={d.doctorId} href={`${linkBase}?doctor=${d.doctorId}`} className="rounded-xl border bg-card p-4 shadow-card transition-colors hover:border-primary">
            {body}
          </Link>
        ) : (
          <div key={d.doctorId} className="rounded-xl border bg-card p-4 shadow-card">
            {body}
          </div>
        );
      })}
    </div>
  );
}

/** Compact read-only widget for management and admin dashboards */
export function TodayAtAGlance() {
  const today = useTodayGlance();
  return (
    <SectionCard
      title="Today at a glance"
      description="Live counts from appointments and queues. Full analytics arrive in Phase 7."
      action={<Stethoscope className="size-5 text-muted-foreground" aria-hidden />}
      bodyClassName="space-y-5"
    >
      <TodayStats data={today.data} />
      {today.data && (
        <p className="text-sm text-muted-foreground">
          {today.data.doctorsInSessionNow} of {today.data.doctorsSittingToday} doctors sitting today are in session now.
        </p>
      )}
    </SectionCard>
  );
}
