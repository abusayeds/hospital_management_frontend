"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, FlaskConical, History } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAuth } from "@/lib/auth";
import { useLiveEvents } from "@/lib/socket";
import { OrderSheet } from "@/features/lab/lab-lists";
import { FLAG_STYLE, LabOrder } from "@/features/lab/types";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/patients";
import { cn } from "@/lib/utils";
import { LEVEL_STYLE } from "@/features/vitals/types";
import { EmrHistory, Visit } from "./types";
import { VisitRecord } from "./visit-record";

export const useEmr = (patientId: string) =>
  useQuery({ queryKey: ["emr", patientId], queryFn: () => apiFetch<EmrHistory>(`/patients/${patientId}/emr`) });

/** One past visit, opened read-only in a side sheet (each open is a VIEW audit entry) */
function VisitSheet({ visitId, onClose }: { visitId: string | null; onClose: () => void }) {
  const visit = useQuery({
    queryKey: ["visit", visitId],
    queryFn: () => apiFetch<Visit>(`/visits/${visitId}`),
    enabled: Boolean(visitId),
  });
  return (
    <Sheet open={Boolean(visitId)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle className="text-lg font-semibold text-heading">Visit record</SheetTitle>
          <SheetDescription>{visit.data ? `${formatDate(visit.data.date)} · ${visit.data.doctor.displayName}` : "Loading…"}</SheetDescription>
        </SheetHeader>
        <div className="p-5">{visit.data ? <VisitRecord visit={visit.data} /> : <Skeleton className="h-60" />}</div>
      </SheetContent>
    </Sheet>
  );
}

/** The patient's lab orders; results show once the lab has verified them. Updates live. */
function LabHistory({ patientId }: { patientId: string }) {
  const queryClient = useQueryClient();
  const key = ["lab", "patient", patientId];
  const orders = useQuery({ queryKey: key, queryFn: () => apiFetch<LabOrder[]>(`/patients/${patientId}/lab-orders`) });
  const [open, setOpen] = useState<string | null>(null);
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["lab", "patient", patientId] }), [queryClient, patientId]);
  const announce = useCallback(() => {
    toast.info("A lab report was just verified", { description: "Lab results are updated in the patient's history." });
    refresh();
  }, [refresh]);
  useLiveEvents(["lab:updated"], refresh);
  useLiveEvents(["lab:report_ready"], announce);

  if (!orders.data?.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Lab reports</p>
      <ul className="divide-y rounded-lg border">
        {orders.data.map((o) => (
          <li key={o.id}>
            <button type="button" onClick={() => setOpen(o.id)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/60">
              <FlaskConical className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-heading">{o.tests.map((t) => t.code).join(", ")}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(o.date)}
                  {o.worstFlag && o.worstFlag !== "normal" && <span className={cn("ml-1", FLAG_STYLE[o.worstFlag].className)}>· {FLAG_STYLE[o.worstFlag].label}</span>}
                </p>
              </div>
              <StatusBadge status={o.status} />
            </button>
          </li>
        ))}
      </ul>
      <OrderSheet orderId={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/** Previous visits and the vitals trend, for the doctor's left column and the patient page */
export function PatientHistory({ patientId, currentVisitId, compact }: { patientId: string; currentVisitId?: string; compact?: boolean }) {
  const emr = useEmr(patientId);
  const { can } = useAuth();
  const [open, setOpen] = useState<string | null>(null);

  if (!emr.data) return <Skeleton className="h-40" />;
  const visits = emr.data.visits.filter((v) => v.id !== currentVisitId);
  const vitals = emr.data.vitals.slice(0, compact ? 5 : 10);

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Previous visits</p>
        {visits.length === 0 ? (
          <EmptyState icon={History} title="First visit" description="No earlier records for this patient." className="py-6" />
        ) : (
          <ul className="divide-y rounded-lg border">
            {visits.map((v) => (
              <li key={v.id}>
                <button type="button" onClick={() => setOpen(v.id)} className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-muted/60">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-heading">
                      {formatDate(v.date)} · <span className="font-normal">{v.diagnosis || v.chiefComplaints.join(", ") || "No diagnosis written"}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {v.doctor.displayName}
                      {v.medicines.length > 0 && ` · ${v.medicines.join(", ")}`}
                      {v.addendaCount > 0 && ` · ${v.addendaCount} addendum`}
                      {v.status === "open" && " · still open"}
                    </p>
                  </div>
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {can("lab_report:read") && <LabHistory patientId={patientId} />}

      {vitals.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Vitals trend</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs tabular-nums">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">Date</th>
                  <th className="px-2 py-1.5 text-left font-medium">BP</th>
                  <th className="px-2 py-1.5 text-left font-medium">Pulse</th>
                  <th className="px-2 py-1.5 text-left font-medium">SpO₂</th>
                  <th className="px-2 py-1.5 text-left font-medium">Wt</th>
                  <th className="px-2 py-1.5 text-left font-medium">Sugar</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {vitals.map((v) => (
                  <tr key={v.id} className={cn(v.flagLevel !== "normal" && LEVEL_STYLE[v.flagLevel].bg)}>
                    <td className="px-2 py-1.5">{formatDate(v.date)}</td>
                    <td className="px-2 py-1.5">{v.bpSystolic ? `${v.bpSystolic}/${v.bpDiastolic}` : "—"}</td>
                    <td className="px-2 py-1.5">{v.pulse ?? "—"}</td>
                    <td className="px-2 py-1.5">{v.spo2 ? `${v.spo2}%` : "—"}</td>
                    <td className="px-2 py-1.5">{v.weightKg ?? "—"}</td>
                    <td className="px-2 py-1.5">{v.bloodSugar ? `${v.bloodSugar.value}${v.bloodSugar.type === "fasting" ? " F" : ""}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <VisitSheet visitId={open} onClose={() => setOpen(null)} />
    </div>
  );
}
