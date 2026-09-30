"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, ClipboardPen, Clock } from "lucide-react";
import Link from "next/link";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiFetch } from "@/lib/api";
import { DoctorQueuePanel } from "@/features/queue/doctor-queue";
import type { DoctorToday } from "@/features/visits/types";
import { DashboardIntro } from "./dashboard-intro";

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit" });

/** Doctor home: today's numbers, the visits written today, and the live queue */
export function DoctorDashboard() {
  const today = useQuery({ queryKey: ["doctor-today"], queryFn: () => apiFetch<DoctorToday>("/visits/today"), meta: { silent: true } });
  const t = today.data;
  return (
    <div className="space-y-6">
      <DashboardIntro description="Your OPD today. Call the next patient, open their record, prescribe and close the visit." />
      {t && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Waiting" value={t.waiting} icon={Clock} />
          <StatCard label="Open visits" value={t.open} icon={ClipboardPen} hint={t.open ? "Close them to sign the records" : "All signed"} />
          <StatCard label="Closed today" value={t.closed} icon={CheckCircle2} />
          <StatCard label="Follow-ups due today" value={t.followUpsDue} icon={CalendarClock} />
        </div>
      )}
      <DoctorQueuePanel mode="doctor" />
      {t && t.visits.length > 0 && (
        <SectionCard title="Today's visits" bodyClassName="p-0">
          <ul className="divide-y">
            {t.visits.map((v) => (
              <li key={v.id}>
                <Link href={`/doctor/visit/${v.appointmentId}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/60">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-heading">
                      {v.patient.name} <span className="font-normal text-muted-foreground">· {v.patient.age} y · {v.patient.patientCode}</span>
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{v.diagnosis || "No diagnosis yet"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">{clock(v.closedAt ?? v.openedAt)}</span>
                  <StatusBadge tone={v.status === "open" ? "active" : "success"}>{v.status === "open" ? "Open" : "Closed"}</StatusBadge>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
