"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, HeartPulse, Pencil, UserRound } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { RequirePermission } from "@/components/shared/forbidden";
import { TableRowsSkeleton } from "@/components/shared/loading-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiFetch } from "@/lib/api";
import { PRIORITY_LABEL } from "@/lib/appointments";
import { useLiveEvents } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { formatMinutes } from "../queue/queue-types";
import { LEVEL_STYLE, WorklistEntry } from "./types";
import { VitalsForm } from "./vitals-form";

const LIVE = ["queue:updated", "appointment:updated", "vitals:updated"];

export function NurseWorklist() {
  return (
    <RequirePermission permission="vitals:create">
      <Worklist />
    </RequirePermission>
  );
}

function Worklist() {
  const queryClient = useQueryClient();
  const [doctorId, setDoctorId] = useState("");
  const [open, setOpen] = useState<WorklistEntry | null>(null);

  const list = useQuery({
    queryKey: ["vitals-worklist", doctorId],
    queryFn: () => apiFetch<WorklistEntry[]>(`/vitals/worklist${doctorId ? `?doctorId=${doctorId}` : ""}`),
    refetchInterval: 60_000, // waiting minutes keep ticking even without events
  });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["vitals-worklist"] }), [queryClient]);
  useLiveEvents(LIVE, refresh);

  const rows = useMemo(() => list.data ?? [], [list.data]);
  // Doctors present today, for the filter (derived from the unfiltered list when possible)
  const doctors = useMemo(() => {
    const map = new Map(rows.map((r) => [r.doctor.id, r.doctor]));
    return [...map.values()];
  }, [rows]);

  const pending = rows.filter((r) => !r.vitals.recorded && r.status === "checked_in");
  const recorded = rows.filter((r) => r.vitals.recorded);
  const flagged = recorded.filter((r) => r.vitals.recorded && r.vitals.flagLevel !== "normal");
  const nextPending = open ? pending.find((r) => r.appointmentId !== open.appointmentId) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vitals worklist"
        description="Today's checked-in patients. Record vitals before they see the doctor — the doctor sees them instantly."
        actions={
          <NativeSelect value={doctorId} onChange={(e) => setDoctorId(e.target.value)} aria-label="Filter by doctor" className="w-auto min-w-52">
            <option value="">All doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.displayName}
                {d.roomNo ? ` · Room ${d.roomNo}` : ""}
              </option>
            ))}
          </NativeSelect>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Waiting for vitals" value={pending.length} icon={Clock} tone={pending.length > 5 ? "danger" : "default"} />
        <StatCard label="Vitals recorded" value={recorded.length} icon={CheckCircle2} />
        <StatCard label="Abnormal / critical" value={flagged.length} icon={AlertTriangle} tone={flagged.length ? "danger" : "default"} hint="Doctors see these highlighted" />
      </div>

      <section className="overflow-hidden rounded-xl border bg-card shadow-card" aria-label="Patients">
        {list.isPending ? (
          <TableRowsSkeleton rows={5} columns={4} />
        ) : !rows.length ? (
          <EmptyState icon={HeartPulse} title="Nobody is waiting" description="Checked-in patients appear here automatically." />
        ) : (
          <ul className="divide-y">
            {rows.map((r) => {
              const v = r.vitals;
              const level = v.recorded ? LEVEL_STYLE[v.flagLevel] : null;
              return (
                <li key={r.appointmentId} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3", r.priority === "emergency" && "bg-status-danger-bg/40")}>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-lg font-bold text-primary tabular-nums">{r.serialNo}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-heading">
                      {r.patient.name}
                      {r.priority !== "normal" && (
                        <StatusBadge tone={r.priority === "emergency" ? "danger" : "waiting"}>{PRIORITY_LABEL[r.priority].label}</StatusBadge>
                      )}
                      {r.patient.allergies.length > 0 && <StatusBadge tone="danger">Allergy: {r.patient.allergies.join(", ")}</StatusBadge>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.patient.age} y · {r.patient.gender} · {r.patient.patientCode} · {r.doctor.displayName}
                      {r.doctor.roomNo ? ` (Room ${r.doctor.roomNo})` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.status === "in_consultation" ? (
                      <StatusBadge status="in_consultation" />
                    ) : (
                      r.waitingMinutes !== null && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                          <Clock className="size-3.5" /> {formatMinutes(r.waitingMinutes)}
                        </span>
                      )
                    )}
                    {level ? (
                      <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", level.bg, level.ring, level.text)}>
                        {v.recorded && v.flagLevel === "normal" ? "Vitals normal" : level.label}
                      </span>
                    ) : (
                      <StatusBadge tone="waiting">No vitals yet</StatusBadge>
                    )}
                    <Button size="lg" variant={v.recorded ? "outline" : "default"} onClick={() => setOpen(r)} disabled={v.recorded && r.status !== "checked_in"}>
                      {v.recorded ? <Pencil /> : <HeartPulse />}
                      {v.recorded ? "Edit" : "Record"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Sheet open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto data-[side=right]:sm:max-w-xl">
          {open && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-heading">
                  <UserRound className="size-5 text-primary" /> #{open.serialNo} · {open.patient.name}
                </SheetTitle>
                <SheetDescription>
                  {open.patient.age} y · {open.patient.gender} · {open.patient.patientCode} · {open.doctor.displayName}
                </SheetDescription>
                {open.patient.allergies.length > 0 && (
                  <p className="rounded-md bg-status-danger-bg px-2 py-1 text-xs font-semibold text-status-danger-fg">Allergies: {open.patient.allergies.join(", ")}</p>
                )}
              </SheetHeader>
              <div className="px-4 pb-6">
                <VitalsForm
                  appointmentId={open.appointmentId}
                  hasNext={Boolean(nextPending)}
                  onSaved={(next) => setOpen(next && nextPending ? nextPending : null)}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
