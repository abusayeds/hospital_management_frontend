"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Search } from "lucide-react";
import { useCallback, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { formatDate } from "@/lib/patients";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useLiveEvents } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { LabOrderPanel } from "./lab-order-panel";
import { FLAG_STYLE, LAB_LIVE_EVENTS, LabOrder } from "./types";

/** One order opened in a side sheet (detail GET = VIEW audit when results are included) */
export function OrderSheet({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const order = useQuery({ queryKey: ["lab", "order", orderId], queryFn: () => apiFetch<LabOrder>(`/lab-orders/${orderId}`), enabled: Boolean(orderId) });
  const o = order.data;
  return (
    <Sheet open={Boolean(orderId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle className="text-lg font-semibold text-heading">{o ? `${o.orderNo} · ${o.patient.name}` : "Lab order"}</SheetTitle>
          <SheetDescription>{o?.tests.map((t) => t.name).join(", ")}</SheetDescription>
        </SheetHeader>
        <div className="p-5">
          {o ? (
            <LabOrderPanel key={`${o.id}-${o.status}`} order={o} onChange={(next) => queryClient.setQueryData(["lab", "order", orderId], next)} />
          ) : (
            <Skeleton className="h-60" />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function OrdersTable({ params, emptyText }: { params: string; emptyText: string }) {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const term = useDebouncedValue(q.trim(), 250);
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["lab", "list", params, term],
    queryFn: () => apiFetchPage<LabOrder>(`/lab-orders?${params}&limit=50${term ? `&q=${encodeURIComponent(term)}` : ""}`),
  });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["lab"] }), [queryClient]);
  useLiveEvents(LAB_LIVE_EVENTS, refresh);

  return (
    <SectionCard
      title="Orders"
      action={
        <div className="relative w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order no, patient name or code" className="pl-9" aria-label="Search orders" />
        </div>
      }
      bodyClassName="p-0"
    >
      {!list.data ? (
        <Skeleton className="m-5 h-40" />
      ) : list.data.items.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No orders" description={emptyText} />
      ) : (
        <ul className="divide-y">
          {list.data.items.map((o) => (
            <li key={o.id}>
              <button type="button" onClick={() => setOpenId(o.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-muted/60">
                <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">{o.orderNo}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-heading">
                    {o.patient.name} <span className="font-normal text-muted-foreground">· {o.patient.patientCode}</span>
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {o.tests.map((t) => t.name).join(", ")} · {formatDate(o.date)}
                  </p>
                </div>
                {o.worstFlag && o.worstFlag !== "normal" && <span className={cn("text-xs", FLAG_STYLE[o.worstFlag].className)}>{FLAG_STYLE[o.worstFlag].label}</span>}
                {o.priority === "urgent" && <StatusBadge tone="danger">Urgent</StatusBadge>}
                <StatusBadge status={o.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <OrderSheet orderId={openId} onClose={() => setOpenId(null)} />
    </SectionCard>
  );
}

/** Reception: verified reports waiting to be printed and handed over */
export function ReceptionLabReports() {
  return (
    <div className="space-y-6">
      <PageHeader title="Lab reports · ল্যাব রিপোর্ট" description="Verified reports: print and hand them to the patient." />
      <OrdersTable params="status=ready,delivered" emptyText="Verified reports appear here." />
    </div>
  );
}

/** Doctor: the tests I ordered, with results once the lab has verified them */
export function DoctorLabOrders() {
  return (
    <div className="space-y-6">
      <PageHeader title="Lab orders · ল্যাব অর্ডার" description="Tests you ordered. Results appear as soon as the lab verifies them." />
      <OrdersTable params="mine=true" emptyText="Tests in a closed visit's investigations are sent to the lab automatically." />
    </div>
  );
}
