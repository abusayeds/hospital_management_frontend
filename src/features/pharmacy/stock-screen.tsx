"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Loader2, PackageMinus, PackageX, Save, SlidersHorizontal, Trash2, Wallet } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, apiFetchPage, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPoisha } from "@/lib/money";
import { formatDate } from "@/lib/patients";
import { expiryText, MedicineStock, MOVEMENT_LABEL, PharmacySummary, STOCK_STATUS, StockRow } from "@/lib/pharmacy";
import { useLiveEvents } from "@/lib/socket";
import { cn } from "@/lib/utils";

const LIVE = ["pharmacy:updated"];
const PAGE_SIZE = 25;
const FILTERS = [
  { id: "all", label: "All medicines" },
  { id: "in_stock", label: "In stock" },
  { id: "low", label: "Low" },
  { id: "out", label: "Out of stock" },
] as const;

/** Pharmacy → Stock: every medicine with units on sale, batches, value and reorder status */
export function StockScreen() {
  return (
    <RequirePermission permission="stock:read">
      <Content />
    </RequirePermission>
  );
}

function Content() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("in_stock");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["pharmacy", "stock", filter, q, page],
    queryFn: () => apiFetchPage<StockRow>(`/pharmacy/stock?filter=${filter}&page=${page}&limit=${PAGE_SIZE}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
    placeholderData: keepPreviousData,
  });
  const summary = useQuery({ queryKey: ["pharmacy", "summary"], queryFn: () => apiFetch<PharmacySummary>("/pharmacy/summary") });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["pharmacy"] }), [queryClient]);
  useLiveEvents(LIVE, refresh);
  const s = summary.data;

  const columns: DataTableColumn<StockRow>[] = [
    {
      key: "medicine",
      header: "Medicine",
      cell: (m) => (
        <div>
          <p className="font-medium text-heading">{m.label}</p>
          <p className="text-xs text-muted-foreground">{m.genericName}</p>
        </div>
      ),
    },
    {
      key: "stock",
      header: "In stock",
      className: "text-right tabular-nums",
      cell: (m) => (
        <span>
          <span className={cn("font-semibold", m.status === "out" ? "text-status-danger-fg" : "text-heading")}>{m.inStock.toLocaleString("en-IN")}</span>
          <span className="text-xs text-muted-foreground"> / reorder {m.reorderLevel}</span>
          {m.expiredQty > 0 && <span className="block text-xs text-status-danger-fg">{m.expiredQty} expired on shelf</span>}
        </span>
      ),
    },
    { key: "batches", header: "Batches", className: "hidden md:table-cell text-center tabular-nums", cell: (m) => m.batchCount || "—" },
    {
      key: "expiry",
      header: "Next expiry",
      className: "hidden lg:table-cell text-sm",
      cell: (m) =>
        m.nearestExpiry ? (
          <span>
            {formatDate(m.nearestExpiry)}
            <span className="block text-xs text-muted-foreground">{expiryText(m.nearestExpiry)}</span>
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "price",
      header: "Price",
      className: "hidden md:table-cell text-right tabular-nums",
      cell: (m) => (m.unitPrice !== null ? formatPoisha(m.unitPrice) : "—"),
    },
    { key: "status", header: "Status", cell: (m) => <StatusBadge tone={STOCK_STATUS[m.status].tone}>{STOCK_STATUS[m.status].label}</StatusBadge> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock · স্টক"
        description="Units on sale per medicine (expired batches are never sold). Open a medicine for its batches, history, adjustments and reorder level."
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Stock value (cost)" value={s ? formatPoisha(s.stockValue) : "…"} icon={Wallet} />
        <StatCard
          label="Low stock"
          value={s?.lowStock ?? "…"}
          icon={PackageMinus}
          tone={s?.lowStock ? "danger" : "default"}
          hint="At or below the reorder level"
        />
        <StatCard
          label="Out of stock"
          value={s?.outOfStock ?? "…"}
          icon={PackageX}
          tone={s?.outOfStock ? "danger" : "default"}
          hint="Stocked before, none left"
        />
        <StatCard label="Expiring in 30 days" value={s?.expiring30 ?? "…"} icon={Boxes} hint={s ? `${s.expired} expired batch(es) on the shelf` : undefined} />
      </div>
      <DataTable
        data={list.data?.items ?? []}
        columns={columns}
        getRowId={(m) => m.id}
        isLoading={list.isPending}
        onRowClick={(m) => setOpenId(m.id)}
        rowClassName={(m) => (m.status === "out" ? "bg-status-danger-bg/40" : m.status === "low" ? "bg-status-waiting-bg/40" : undefined)}
        searchPlaceholder="Brand or generic name"
        server={{
          query: q,
          onQueryChange: (v) => (setQ(v), setPage(1)),
          page,
          pageSize: PAGE_SIZE,
          total: list.data?.pagination.total ?? 0,
          totalPages: list.data?.pagination.totalPages ?? 1,
          onPageChange: setPage,
        }}
        filters={
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <Button key={f.id} size="sm" variant={filter === f.id ? "default" : "outline"} onClick={() => (setFilter(f.id), setPage(1))}>
                {f.label}
              </Button>
            ))}
          </div>
        }
        emptyTitle={filter === "in_stock" ? "No stock yet" : "Nothing here"}
        emptyDescription="Receive a supplier delivery under Pharmacy → Purchases to add stock."
      />
      <MedicineSheet id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function MedicineSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: ["pharmacy", "medicine", id], queryFn: () => apiFetch<MedicineStock>(`/pharmacy/stock/${id}`), enabled: Boolean(id) });
  const [level, setLevel] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<MedicineStock["batches"][number] | null>(null);
  const after = (d: MedicineStock) => {
    queryClient.setQueryData(["pharmacy", "medicine", id], d);
    queryClient.invalidateQueries({ queryKey: ["pharmacy", "stock"] });
    queryClient.invalidateQueries({ queryKey: ["pharmacy", "summary"] });
  };
  const saveLevel = useMutation({
    mutationFn: () => apiFetch<MedicineStock>(`/pharmacy/stock/${id}/reorder-level`, { method: "PUT", body: { reorderLevel: Number(level) } }),
    meta: { silent: true },
    onSuccess: (d) => (after(d), setLevel(null), toast.success("Reorder level saved")),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const d = detail.data;

  return (
    <Sheet open={Boolean(id)} onOpenChange={(o) => !o && (onClose(), setLevel(null))}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{d?.label ?? "Medicine"}</SheetTitle>
          <SheetDescription>{d?.genericName}</SheetDescription>
        </SheetHeader>
        {!d ? (
          <Skeleton className="m-4 h-64" />
        ) : (
          <div className="space-y-6 px-4 pb-6">
            <div className="flex items-end gap-3 rounded-lg border p-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="reorder">Reorder level (units)</Label>
                <Input
                  id="reorder"
                  type="number"
                  min={0}
                  value={level ?? String(d.reorderLevel)}
                  onChange={(e) => setLevel(e.target.value)}
                  disabled={!can("stock:manage")}
                />
                <p className="text-xs text-muted-foreground">Pharmacy staff are alerted when stock falls to this level.</p>
              </div>
              {can("stock:manage") && (
                <Button onClick={() => saveLevel.mutate()} disabled={level === null || level === "" || saveLevel.isPending}>
                  <Save /> Save
                </Button>
              )}
            </div>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-heading">Batches</h3>
              {d.batches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No batches yet.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {d.batches.map((b) => (
                    <li key={b.id} className={cn("flex items-center gap-3 px-3 py-2.5 text-sm", (b.expired || b.writtenOff) && "bg-muted/40")}>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono font-medium text-heading">{b.batchNo}</p>
                        <p className="text-xs text-muted-foreground">
                          Exp {formatDate(b.expiryDate)} ({expiryText(b.expiryDate)}) · {b.supplier || "—"} · cost {formatPoisha(b.unitCost)} · price{" "}
                          {formatPoisha(b.unitPrice)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums">
                          {b.quantity}
                          <span className="text-xs font-normal text-muted-foreground"> / {b.initialQuantity}</span>
                        </p>
                        {b.writtenOff ? (
                          <StatusBadge tone="neutral">Written off</StatusBadge>
                        ) : b.expired && b.quantity > 0 ? (
                          <StatusBadge tone="danger">Expired</StatusBadge>
                        ) : null}
                      </div>
                      {can("stock:manage") && !b.writtenOff && b.quantity > 0 && (
                        <Button size="sm" variant="ghost" onClick={() => setAdjusting(b)} aria-label={`Adjust batch ${b.batchNo}`}>
                          <SlidersHorizontal />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-heading">History</h3>
              {d.movements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No movements yet.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {d.movements.map((m, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className={cn("w-14 text-right font-semibold tabular-nums", m.quantity > 0 ? "text-status-success-fg" : "text-status-danger-fg")}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {MOVEMENT_LABEL[m.type]} · {m.batchNo}
                        {m.reason && <span className="text-muted-foreground"> · {m.reason}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {m.by ?? "system"} · {new Date(m.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
        <AdjustDialog batch={adjusting} onClose={() => setAdjusting(null)} onSaved={after} />
      </SheetContent>
    </Sheet>
  );
}

function AdjustDialog({
  batch,
  onClose,
  onSaved,
}: {
  batch: MedicineStock["batches"][number] | null;
  onClose: () => void;
  onSaved: (d: MedicineStock) => void;
}) {
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState("");
  const close = () => (setCounted(""), setReason(""), onClose());
  const save = useMutation({
    mutationFn: (writeOff: boolean) =>
      apiFetch<MedicineStock>(`/pharmacy/batches/${batch!.id}/adjust`, {
        method: "POST",
        body: writeOff ? { writeOff: true, reason } : { change: Number(counted) - batch!.quantity, reason },
      }),
    meta: { silent: true },
    onSuccess: (d, writeOff) => (onSaved(d), toast.success(writeOff ? "Batch written off" : "Stock corrected"), close()),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const countOk = counted !== "" && Number(counted) >= 0 && Number(counted) !== batch?.quantity;
  return (
    <Dialog open={Boolean(batch)} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Batch {batch?.batchNo}</DialogTitle>
          <DialogDescription>
            {batch?.quantity} units on record. Correct the count after a physical check, or write the batch off (expired, damaged, recalled).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="counted">Units counted on the shelf</Label>
            <Input
              id="counted"
              type="number"
              min={0}
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              placeholder={String(batch?.quantity ?? "")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason (required)</Label>
            <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Monthly count, two strips damaged" />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" className="text-status-danger-fg" disabled={reason.trim().length < 3 || save.isPending} onClick={() => save.mutate(true)}>
            <Trash2 /> Write off all
          </Button>
          <Button disabled={!countOk || reason.trim().length < 3 || save.isPending} onClick={() => save.mutate(false)}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save count
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
