"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CalendarX2, Hourglass, Loader2, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { apiFetch, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPoisha } from "@/lib/money";
import { formatDate } from "@/lib/patients";
import { expiryText, ExpiryItem, ExpiryReport } from "@/lib/pharmacy";
import { useLiveEvents } from "@/lib/socket";
import { cn } from "@/lib/utils";

const LIVE = ["pharmacy:updated"];
const GROUPS = [
  { bucket: "expired", title: "Expired — remove from the shelf", tone: "border-status-danger-border bg-status-danger-bg/40" },
  { bucket: "30", title: "Expiring within 30 days — sell or return first", tone: "border-status-waiting-border bg-status-waiting-bg/40" },
  { bucket: "90", title: "Expiring within 90 days", tone: "" },
] as const;

/** Pharmacy → Expiry Alerts: batches with units left that are expired or expire soon */
export function ExpiryScreen() {
  return (
    <RequirePermission permission="stock:read">
      <Content />
    </RequirePermission>
  );
}

function Content() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const report = useQuery({ queryKey: ["pharmacy", "expiry"], queryFn: () => apiFetch<ExpiryReport>("/pharmacy/expiry?days=90") });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["pharmacy"] }), [queryClient]);
  useLiveEvents(LIVE, refresh);
  const [writeOff, setWriteOff] = useState<ExpiryItem | null>(null);
  const remove = useMutation({
    mutationFn: (i: ExpiryItem) =>
      apiFetch(`/pharmacy/batches/${i.batchId}/adjust`, { method: "POST", body: { writeOff: true, reason: "Expired — removed from the shelf" } }),
    meta: { silent: true },
    onSuccess: () => (toast.success("Batch written off"), refresh()),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const r = report.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expiry alerts · মেয়াদ সতর্কতা"
        description="Batches with units left that have expired or expire within 90 days. Expired stock is never dispensed; write it off once removed."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Expired on the shelf"
          value={r?.summary.expired.batches ?? "…"}
          icon={CalendarX2}
          tone={r?.summary.expired.batches ? "danger" : "default"}
          hint={r ? `${formatPoisha(r.summary.expired.value)} at cost` : undefined}
        />
        <StatCard
          label="Within 30 days"
          value={r?.summary.within30.batches ?? "…"}
          icon={Hourglass}
          hint={r ? `${formatPoisha(r.summary.within30.value)} at cost` : undefined}
        />
        <StatCard
          label="Within 90 days"
          value={r?.summary.within90.batches ?? "…"}
          icon={CalendarClock}
          hint={r ? `${formatPoisha(r.summary.within90.value)} at cost` : undefined}
        />
      </div>

      {r && r.items.length === 0 && (
        <SectionCard title="All clear">
          <EmptyState icon={CalendarClock} title="Nothing expires in the next 90 days" description="Batches show up here 90 days before they expire." />
        </SectionCard>
      )}
      {GROUPS.map((g) => {
        const items = r?.items.filter((i) => i.bucket === g.bucket) ?? [];
        if (!items.length) return null;
        return (
          <SectionCard key={g.bucket} title={g.title} description={`${items.length} batch${items.length === 1 ? "" : "es"}`} bodyClassName="p-0">
            <ul className="divide-y">
              {items.map((i) => (
                <li key={i.batchId} className={cn("flex flex-wrap items-center gap-3 border-l-4 px-5 py-3 text-sm", g.tone || "border-transparent")}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-heading">{i.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.genericName} · batch <span className="font-mono">{i.batchNo}</span> · {i.supplier || "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatDate(i.expiryDate)}</p>
                    <p className={cn("text-xs", i.bucket === "expired" ? "text-status-danger-fg" : "text-muted-foreground")}>{expiryText(i.expiryDate)}</p>
                  </div>
                  <div className="w-28 text-right tabular-nums">
                    <p className="font-semibold">{i.quantity} units</p>
                    <p className="text-xs text-muted-foreground">{formatPoisha(i.value)}</p>
                  </div>
                  {can("stock:manage") && i.bucket === "expired" && (
                    <Button size="sm" variant="outline" onClick={() => setWriteOff(i)} disabled={remove.isPending}>
                      {remove.isPending && remove.variables?.batchId === i.batchId ? <Loader2 className="animate-spin" /> : <Trash2 />} Write off
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </SectionCard>
        );
      })}
      <ConfirmDialog
        open={Boolean(writeOff)}
        onOpenChange={(o) => !o && setWriteOff(null)}
        tone="danger"
        title={`Write off batch ${writeOff?.batchNo}?`}
        description={`${writeOff?.quantity} units of ${writeOff?.label} leave the stock. Do this after removing them from the shelf. Recorded in the stock history and the audit log.`}
        confirmLabel="Write off"
        onConfirm={async () => {
          if (writeOff) await remove.mutateAsync(writeOff).catch(() => undefined);
        }}
      />
    </div>
  );
}
