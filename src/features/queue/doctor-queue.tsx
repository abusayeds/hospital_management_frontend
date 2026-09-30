"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowDownToLine, BellRing, Clock, FileText, Loader2, Megaphone, PhoneForwarded, UserCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api";
import { AppointmentView, PRIORITY_LABEL, time12 } from "@/lib/appointments";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/master-data";
import { useLiveEvents } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { DoctorQueue, formatMinutes } from "./queue-types";

const LIVE_EVENTS = ["queue:updated", "appointment:updated"];

const PriorityBadge = ({ p }: { p: AppointmentView["priority"] }) =>
  p === "normal" ? null : (
    <StatusBadge tone={p === "emergency" ? "danger" : "waiting"}>
      {PRIORITY_LABEL[p].label} · <span className="font-bangla">{PRIORITY_LABEL[p].labelBn}</span>
    </StatusBadge>
  );

/**
 * One doctor's live queue. `mode="doctor"`: the doctor runs it (Call next, call a
 * specific patient, recall, send back). `mode="desk"`: reception watches it and may
 * only recall or send back (the API enforces the same rules).
 */
export function DoctorQueuePanel({ doctorId, mode }: { doctorId?: string; mode: "doctor" | "desk" }) {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [sendingBack, setSendingBack] = useState<AppointmentView | null>(null);
  const key = ["queue", doctorId ?? "mine"];
  const queue = useQuery({
    queryKey: key,
    queryFn: () => apiFetch<DoctorQueue>(`/queue/today${doctorId ? `?doctorId=${doctorId}` : ""}`),
    refetchInterval: 60_000, // estimated waits drift with time; sockets handle real changes
  });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["queue"] }), [queryClient]);
  useLiveEvents(LIVE_EVENTS, refresh);

  const run = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) => apiFetch<DoctorQueue>(path, { method: "POST", body }),
    onSuccess: (q, { path }) => {
      queryClient.setQueryData(key, q);
      if (path.endsWith("/call-next")) toast.success(q.current ? `Serial ${q.current.serialNo} called — shown on the TV` : "Done. Nobody else is waiting.");
      else if (path.endsWith("/recall")) toast.success("Announced again on the TV");
      else if (path.includes("/call/")) toast.success(`Serial ${q.current?.serialNo} called`);
      else toast.success("Sent back to the waiting list");
    },
  });

  if (queue.isError) {
    const msg = queue.error instanceof ApiError ? queue.error.message : "Could not load the queue.";
    return <EmptyState icon={AlertTriangle} title="Queue unavailable" description={msg} />;
  }
  if (!queue.data) return <PageSkeleton />;
  const q = queue.data;
  const id = q.doctor.id;
  const isDoctor = mode === "doctor";
  const canRecall = isDoctor || can("queue:manage");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Waiting now" value={q.stats.waiting} icon={Clock} hint={q.waiting[0] ? `Next: serial ${q.waiting[0].serialNo}` : "Nobody waiting"} />
        <StatCard label="Not arrived yet" value={q.stats.notArrived} icon={UserCheck} />
        <StatCard label="Seen today" value={q.stats.completed} icon={BellRing} hint={`${q.stats.noShow} no-show · ${q.stats.cancelled} cancelled`} />
        <StatCard
          label="Session"
          value={q.doctor.onLeave ? "On leave" : q.doctor.sessionsToday.map((s) => `${s.startTime}–${s.endTime}`).join(", ") || "No session"}
          hint={`Room ${q.doctor.roomNo ?? "—"} · ~${q.doctor.averageMinutesPerPatient} min/patient`}
          className="[&>p:nth-child(2)]:text-xl"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        {/* Current patient + main action */}
        <section className="flex flex-col rounded-xl border bg-card p-6 shadow-card">
          <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">With the doctor now</p>
          {q.current ? (
            <div className="mt-4 flex items-start gap-5">
              <div className="flex size-24 shrink-0 flex-col items-center justify-center rounded-2xl bg-status-active-bg text-status-active-fg">
                <span className="text-xs font-semibold uppercase">Serial</span>
                <span className="text-5xl leading-none font-black tabular-nums">{q.current.serialNo}</span>
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-2xl font-semibold text-heading">{q.current.patient.name}</p>
                <p className="text-muted-foreground">
                  {q.current.patient.age} y · <span className="capitalize">{q.current.patient.gender}</span> · <span className="font-mono">{q.current.patient.patientCode}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <PriorityBadge p={q.current.priority} />
                  {q.current.type === "follow_up" && <StatusBadge tone="info">Follow-up</StatusBadge>}
                  {q.current.patient.hasAllergies && (
                    <StatusBadge tone="danger">
                      <AlertTriangle className="size-3" /> Has allergies
                    </StatusBadge>
                  )}
                </div>
                {q.current.notes && <p className="rounded-lg bg-muted px-3 py-2 text-sm">“{q.current.notes}”</p>}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-lg text-muted-foreground">Nobody is with the doctor.</p>
          )}

          <div className="mt-auto flex flex-wrap gap-2 pt-6">
            {isDoctor && q.current && (
              <Button size="xl" className="h-16 min-w-52 flex-1 text-lg" render={<Link href={`/doctor/visit/${q.current.id}`} />} nativeButton={false}>
                <FileText className="size-6" /> Open record
              </Button>
            )}
            {isDoctor && (
              <Button
                size="xl"
                variant={q.current ? "outline" : "default"}
                className="h-16 min-w-60 flex-1 text-lg"
                disabled={run.isPending || (!q.current && q.waiting.length === 0)}
                onClick={() => run.mutate({ path: `/queue/${id}/call-next` })}
              >
                {run.isPending ? <Loader2 className="animate-spin" /> : <Megaphone className="size-6" />}
                {q.current ? "Done — call next" : "Call next patient"}
                {q.waiting[0] && <span className="rounded-md bg-white/20 px-2 py-0.5 tabular-nums">#{q.waiting[0].serialNo}</span>}
              </Button>
            )}
            {q.current && canRecall && (
              <Button size="xl" variant="outline" disabled={run.isPending} onClick={() => run.mutate({ path: `/queue/${id}/recall` })}>
                <BellRing /> Recall
              </Button>
            )}
            {q.current && canRecall && (
              <Button size="xl" variant="outline" disabled={run.isPending} onClick={() => setSendingBack(q.current)}>
                <ArrowDownToLine /> Send back
              </Button>
            )}
          </div>
          {!isDoctor && <p className="mt-3 text-xs text-muted-foreground">Only the doctor can call the next patient. Reception may recall or send back.</p>}
        </section>

        {/* Waiting list */}
        <SectionCard title={`Waiting · ${q.waiting.length}`} description="Emergency and elderly patients are placed first" bodyClassName="p-0">
          {q.waiting.length === 0 ? (
            <EmptyState title="No one is waiting" description="Patients appear here as reception checks them in." />
          ) : (
            <ol className="divide-y">
              {q.waiting.map((w) => (
                <li key={w.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-status-waiting-bg text-lg font-bold text-status-waiting-fg tabular-nums">{w.serialNo}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-heading">
                      {w.patient.name} <PriorityBadge p={w.priority} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {w.patient.age} y · {time12(w.slotTime)} slot · ~{formatMinutes(w.estimatedWaitMinutes)} wait
                    </p>
                  </div>
                  {isDoctor && (
                    <Button size="sm" variant="outline" disabled={run.isPending} onClick={() => run.mutate({ path: `/queue/${id}/call/${w.id}` })} title="Call this patient now (out of order)">
                      <PhoneForwarded /> Call
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </div>

      <SectionCard title={`Not arrived yet · ${q.notArrived.length}`} description="Booked for today, not checked in at reception" bodyClassName="p-0">
        {q.notArrived.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">Everyone booked for today has arrived.</p>
        ) : (
          <ul className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
            {q.notArrived.map((a) => (
              <li key={a.id} className="flex items-center gap-3 bg-card px-5 py-3">
                <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {initials(a.patient.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-heading">
                    #{a.serialNo} · {a.patient.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{time12(a.slotTime)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <ConfirmDialog
        open={Boolean(sendingBack)}
        onOpenChange={(o) => !o && setSendingBack(null)}
        title={`Send serial ${sendingBack?.serialNo} back to waiting?`}
        description="Use this when the patient steps out (for a test or a report). They keep their serial and return to the front of their priority group."
        confirmLabel="Send back"
        onConfirm={async () => {
          if (sendingBack) await run.mutateAsync({ path: `/appointments/${sendingBack.id}/send-back` });
        }}
      />
      <p className={cn("text-xs text-muted-foreground")}>Updates live · the waiting-room TV shows the same serials.</p>
    </div>
  );
}
