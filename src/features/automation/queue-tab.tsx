"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DecisionTimeline } from "./outbox-tab";
import { Job, JOB_TONE, when } from "./types";

const hourOf = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "2-digit" }) + ":00";

/** Jobs about to go out, grouped by hour and rule — the admin can look inside and cancel one */
export function QueueTab() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [minutes, setMinutes] = useState(60);
  const [open, setOpen] = useState<Job | null>(null);
  const [confirm, setConfirm] = useState<Job | null>(null);
  const queue = useQuery({
    queryKey: ["automation", "queue", minutes],
    queryFn: () => apiFetch<Job[]>(`/automation/queue?minutes=${minutes}`),
    refetchInterval: 20_000,
  });
  const cancel = useMutation({
    mutationFn: (id: string) => apiFetch<Job>(`/automation/jobs/${id}/cancel`, { method: "POST", body: {} }),
    onSuccess: () => {
      toast.success("Job cancelled — it will not be sent");
      queryClient.invalidateQueries({ queryKey: ["automation"] });
      setOpen(null);
    },
  });

  const groups = new Map<string, Map<string, Job[]>>();
  for (const j of queue.data ?? []) {
    const hour = hourOf(j.scheduledFor);
    const byRule = groups.get(hour) ?? new Map<string, Job[]>();
    byRule.set(j.title, [...(byRule.get(j.title) ?? []), j]);
    groups.set(hour, byRule);
  }

  return (
    <SectionCard
      title="Scheduled queue"
      description="Planned messages that are due soon. Each is checked again (still booked? opted out? quiet hours?) right before sending."
      action={
        <NativeSelect className="w-40" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} aria-label="Window">
          <option value={60}>Next 60 minutes</option>
          <option value={180}>Next 3 hours</option>
          <option value={1440}>Next 24 hours</option>
        </NativeSelect>
      }
    >
      {!queue.data ? (
        <Skeleton className="h-48" />
      ) : queue.data.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Nothing due" description="No automated message is planned in this window." />
      ) : (
        <div className="space-y-5">
          {[...groups.entries()].map(([hour, byRule]) => (
            <div key={hour}>
              <h3 className="mb-2 text-sm font-semibold text-heading">{hour}</h3>
              <div className="space-y-3">
                {[...byRule.entries()].map(([rule, jobs]) => (
                  <div key={rule} className="rounded-lg border">
                    <p className="border-b bg-muted/40 px-3 py-1.5 text-xs font-medium">
                      {rule} · {jobs.length}
                    </p>
                    <ul className="divide-y">
                      {jobs.map((j) => (
                        <li key={j.id}>
                          <button type="button" className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50" onClick={() => setOpen(j)}>
                            <span className="w-14 shrink-0 text-xs text-muted-foreground tabular-nums">
                              {new Date(j.scheduledFor).toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{j.patient ? `${j.patient.name} (${j.patient.patientCode})` : `${j.scope.type} ${j.scope.id.slice(-6)}`}</span>
                            {j.urgent && <StatusBadge tone="danger">urgent</StatusBadge>}
                            {j.deferCount > 0 && <StatusBadge tone="waiting">deferred ×{j.deferCount}</StatusBadge>}
                            <StatusBadge tone={JOB_TONE[j.status] ?? "neutral"}>{j.status}</StatusBadge>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto data-[side=right]:sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle className="text-lg font-semibold text-heading">{open?.title}</SheetTitle>
            <SheetDescription className="font-mono text-xs">{open?.dedupeKey}</SheetDescription>
          </SheetHeader>
          {open && (
            <div className="space-y-5 p-5 text-sm">
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-muted-foreground">Planned for</dt>
                  <dd className="font-medium">{when(open.scheduledFor)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Originally</dt>
                  <dd>{when(open.originalScheduledFor)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">About</dt>
                  <dd>
                    {open.scope.type} <code className="text-xs">{open.scope.id}</code>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Patient</dt>
                  <dd>{open.patient ? `${open.patient.name} (${open.patient.patientCode})` : "—"}</dd>
                </div>
              </dl>
              <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                The text is written at send time from the latest data (doctor, time, serial) — so a change made now is reflected in the message.
              </p>
              <DecisionTimeline job={open} />
              {can("automation:manage") && ["scheduled", "ready"].includes(open.status) && (
                <Button variant="destructive" onClick={() => setConfirm(open)}>
                  <XCircle /> Cancel this job
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Cancel this message?"
        description="It will not be sent. The cancellation is recorded with your name."
        confirmLabel="Cancel message"
        tone="danger"
        onConfirm={async () => {
          if (confirm) await cancel.mutateAsync(confirm.id);
          setConfirm(null);
        }}
      />
    </SectionCard>
  );
}
