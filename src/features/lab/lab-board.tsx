"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Clock, FlaskConical, Siren } from "lucide-react";
import { useCallback, useState } from "react";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiFetch } from "@/lib/api";
import { useLiveEvents } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { LabOrderPanel } from "./lab-order-panel";
import { BOARD_COLUMNS, FLAG_STYLE, LAB_LIVE_EVENTS, LabOrder } from "./types";

const minutesAgo = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

function OrderCard({ order, onOpen }: { order: LabOrder; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full space-y-1.5 rounded-xl border bg-card p-3 text-left shadow-card transition hover:border-primary",
        order.priority === "urgent" && "border-l-4 border-l-status-danger-dot",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">{order.orderNo}</span>
        {order.priority === "urgent" && <StatusBadge tone="danger">Urgent</StatusBadge>}
      </div>
      <p className="font-medium text-heading">{order.patient.name}</p>
      <p className="text-xs text-muted-foreground">
        {order.patient.age} y · {order.patient.patientCode}
      </p>
      <p className="text-sm">{order.tests.map((t) => t.code).join(", ")}</p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{order.doctor?.displayName ?? "—"}</span>
        <span className="flex items-center gap-1">
          <Clock className="size-3" /> {minutesAgo(order.createdAt)}
        </span>
      </div>
      {order.worstFlag && order.worstFlag !== "normal" && (
        <p className={cn("text-xs", FLAG_STYLE[order.worstFlag].className)}>{FLAG_STYLE[order.worstFlag].label} values</p>
      )}
    </button>
  );
}

/** The lab's live work board: one column per step, urgent orders first */
export function LabBoard() {
  const queryClient = useQueryClient();
  const board = useQuery({ queryKey: ["lab", "board"], queryFn: () => apiFetch<LabOrder[]>("/lab-orders/board"), refetchInterval: 60_000 });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["lab"] }), [queryClient]);
  useLiveEvents(LAB_LIVE_EVENTS, refresh);
  const [openId, setOpenId] = useState<string | null>(null);
  const [override, setOverride] = useState<LabOrder | null>(null);

  if (!board.data) return <PageSkeleton />;
  const orders = board.data;
  const open = override?.id === openId ? override : orders.find((o) => o.id === openId);
  const count = (s: LabOrder["status"]) => orders.filter((o) => o.status === s).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Samples to collect" value={count("ordered")} icon={FlaskConical} />
        <StatCard label="In progress" value={count("sample_collected") + count("processing")} icon={Clock} />
        <StatCard label="To verify" value={count("awaiting_verification")} icon={BadgeCheck} />
        <StatCard label="Urgent open" value={orders.filter((o) => o.priority === "urgent" && o.status !== "ready").length} icon={Siren} />
      </div>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {BOARD_COLUMNS.map((col) => {
          const items = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="flex min-h-40 flex-col rounded-xl bg-muted/50 p-2">
              <h2 className="flex items-center justify-between px-1 pb-2 text-sm font-semibold text-heading">
                <span>
                  {col.title} <span className="font-bangla font-normal text-muted-foreground">· {col.titleBn}</span>
                </span>
                <span className="rounded-full bg-card px-2 text-xs tabular-nums">{items.length}</span>
              </h2>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="px-1 py-4 text-center text-xs text-muted-foreground">Nothing here</p>
                ) : (
                  items.map((o) => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      onOpen={() => {
                        setOverride(null);
                        setOpenId(o.id);
                      }}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Updates live. Ready reports stay on the board for two days; delivered ones leave it.</p>

      <Sheet open={Boolean(open)} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto data-[side=right]:sm:max-w-xl">
          {open && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle className="text-lg font-semibold text-heading">
                  {open.orderNo} · {open.patient.name}
                </SheetTitle>
                <SheetDescription>{open.tests.map((t) => t.name).join(", ")}</SheetDescription>
              </SheetHeader>
              <div className="p-5">
                <LabOrderPanel key={`${open.id}-${open.status}`} order={open} onChange={setOverride} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
