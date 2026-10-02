"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PackagePlus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, apiFetchPage, getErrorMessage } from "@/lib/api";
import { addDaysTo, todayDhaka } from "@/lib/appointments";
import { Medicine } from "@/lib/master-data";
import { formatPoisha, takaToPoisha } from "@/lib/money";
import { formatDate } from "@/lib/patients";
import { Purchase } from "@/lib/pharmacy";
import { useLiveEvents } from "@/lib/socket";
import { FormError } from "../master-data/form-bits";
import { medicineLabel, MedicinePicker } from "./medicine-picker";

const LIVE = ["pharmacy:updated"];
const PAGE_SIZE = 20;

/** Pharmacy → Purchases: supplier deliveries. Saving one receives the stock as new batches. */
export function PurchasesScreen() {
  return (
    <RequirePermission permission="stock:manage">
      <Content />
    </RequirePermission>
  );
}

function Content() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Purchase | null>(null);
  const [creating, setCreating] = useState(false);
  const list = useQuery({
    queryKey: ["pharmacy", "purchases", q, page],
    queryFn: () => apiFetchPage<Purchase>(`/pharmacy/purchases?page=${page}&limit=${PAGE_SIZE}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
    placeholderData: keepPreviousData,
  });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["pharmacy"] }), [queryClient]);
  useLiveEvents(LIVE, refresh);

  const columns: DataTableColumn<Purchase>[] = [
    {
      key: "no",
      header: "Delivery",
      cell: (p) => (
        <div>
          <p className="font-mono text-sm font-semibold text-heading">{p.purchaseNo}</p>
          <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
        </div>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      cell: (p) => (
        <div>
          <p className="font-medium">{p.supplier}</p>
          {p.supplierInvoiceNo && <p className="text-xs text-muted-foreground">Invoice {p.supplierInvoiceNo}</p>}
        </div>
      ),
    },
    {
      key: "items",
      header: "Medicines",
      className: "hidden md:table-cell text-sm",
      cell: (p) =>
        p.items
          .map((i) => i.description)
          .slice(0, 3)
          .join(", ") + (p.items.length > 3 ? ` +${p.items.length - 3}` : ""),
    },
    { key: "total", header: "Cost", className: "text-right tabular-nums font-semibold", cell: (p) => formatPoisha(p.total) },
    { key: "by", header: "Received by", className: "hidden lg:table-cell text-sm", cell: (p) => p.receivedBy ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases · ক্রয়"
        description="Supplier deliveries. Enter each medicine with its batch number, expiry, cost and selling price — the stock is added at once."
        actions={
          <Button size="xl" onClick={() => setCreating(true)}>
            <PackagePlus /> Receive delivery
          </Button>
        }
      />
      <DataTable
        data={list.data?.items ?? []}
        columns={columns}
        getRowId={(p) => p.id}
        isLoading={list.isPending}
        onRowClick={setOpen}
        searchPlaceholder="Supplier, delivery or invoice no."
        server={{
          query: q,
          onQueryChange: (v) => (setQ(v), setPage(1)),
          page,
          pageSize: PAGE_SIZE,
          total: list.data?.pagination.total ?? 0,
          totalPages: list.data?.pagination.totalPages ?? 1,
          onPageChange: setPage,
        }}
        emptyTitle="No deliveries yet"
        emptyDescription="Use “Receive delivery” when medicines arrive from a supplier."
      />
      <PurchaseSheet purchase={open} onClose={() => setOpen(null)} />
      <NewPurchaseDialog open={creating} onOpenChange={setCreating} onSaved={(p) => (refresh(), setOpen(p))} />
    </div>
  );
}

function PurchaseSheet({ purchase: p, onClose }: { purchase: Purchase | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(p)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{p?.purchaseNo}</SheetTitle>
          <SheetDescription>
            {p?.supplier}
            {p?.supplierInvoiceNo ? ` · invoice ${p.supplierInvoiceNo}` : ""} · {p && formatDate(p.date)}
          </SheetDescription>
        </SheetHeader>
        {p && (
          <div className="space-y-4 px-4 pb-6">
            <ul className="divide-y rounded-lg border text-sm">
              {p.items.map((i, n) => (
                <li key={n} className="flex gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-heading">{i.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Batch <span className="font-mono">{i.batchNo}</span> · exp {formatDate(i.expiryDate)} · sells at {formatPoisha(i.unitPrice)}
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="font-semibold">{formatPoisha(i.lineTotal)}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.quantity} × {formatPoisha(i.unitCost)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="flex justify-between text-base font-semibold text-heading">
              <span>Total cost</span>
              <span className="tabular-nums">{formatPoisha(p.total)}</span>
            </p>
            {p.notes && <p className="rounded-lg bg-muted/50 p-3 text-sm">{p.notes}</p>}
            <p className="text-xs text-muted-foreground">Received by {p.receivedBy ?? "—"}</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

type Line = { key: string; medicine: Medicine; batchNo: string; expiryDate: string; quantity: string; unitCost: string; unitPrice: string };

function NewPurchaseDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: (p: Purchase) => void }) {
  const [supplier, setSupplier] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(todayDhaka());
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string>();
  const suppliers = useQuery({
    queryKey: ["pharmacy", "suppliers"],
    queryFn: () => apiFetch<string[]>("/pharmacy/purchases/suppliers"),
    enabled: open,
    meta: { silent: true },
  });

  const reset = () => {
    setSupplier("");
    setInvoiceNo("");
    setDate(todayDhaka());
    setNotes("");
    setLines([]);
    setError(undefined);
  };
  const update = (key: string, patch: Partial<Line>) => setLines((all) => all.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * takaToPoisha(Number(l.unitCost) || 0), 0);

  const save = useMutation({
    mutationFn: () =>
      apiFetch<Purchase>("/pharmacy/purchases", {
        method: "POST",
        body: {
          supplier,
          supplierInvoiceNo: invoiceNo || undefined,
          date,
          notes: notes || undefined,
          items: lines.map((l) => ({
            medicineId: l.medicine.id,
            batchNo: l.batchNo,
            expiryDate: l.expiryDate,
            quantity: Math.floor(Number(l.quantity)),
            unitCost: takaToPoisha(Number(l.unitCost)),
            unitPrice: takaToPoisha(Number(l.unitPrice)),
          })),
        },
      }),
    meta: { silent: true },
    onSuccess: (p) => {
      toast.success(`${p.purchaseNo}: ${p.items.length} medicine(s) added to stock`);
      reset();
      onOpenChange(false);
      onSaved(p);
    },
    onError: (e) => setError(getErrorMessage(e)),
  });
  const valid =
    supplier.trim().length >= 2 &&
    lines.length > 0 &&
    lines.every(
      (l) =>
        l.batchNo.trim() &&
        l.expiryDate > date &&
        Number(l.quantity) >= 1 &&
        Number(l.unitCost) >= 0 &&
        Number(l.unitPrice) > 0 &&
        Number(l.unitPrice) >= Number(l.unitCost),
    );

  return (
    <Dialog open={open} onOpenChange={(o) => (!o && reset(), onOpenChange(o))}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Receive a delivery</DialogTitle>
          <DialogDescription>Prices are per unit (one tablet, one bottle …) in taka. The selling price is what the patient pays.</DialogDescription>
        </DialogHeader>
        <FormError message={error} />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="supplier">Supplier</Label>
            <Input
              id="supplier"
              list="supplier-list"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="e.g. Square Pharmaceuticals"
            />
            <datalist id="supplier-list">
              {suppliers.data?.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv">Supplier invoice no. (optional)</Label>
            <Input id="inv" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">Delivery date</Label>
            <Input id="date" type="date" value={date} max={todayDhaka()} onChange={(e) => setDate(e.target.value || todayDhaka())} />
          </div>
        </div>

        <div className="space-y-2">
          {lines.map((l) => {
            const belowCost = l.unitPrice !== "" && l.unitCost !== "" && Number(l.unitPrice) < Number(l.unitCost);
            return (
              <div key={l.key} className="grid items-end gap-2 rounded-lg border p-3 sm:grid-cols-[1.4fr_0.8fr_0.9fr_0.6fr_0.7fr_0.7fr_auto]">
                <div>
                  <p className="text-sm font-medium text-heading">{medicineLabel(l.medicine)}</p>
                  <p className="text-xs text-muted-foreground">{l.medicine.genericName}</p>
                </div>
                <Field label="Batch no." value={l.batchNo} onChange={(v) => update(l.key, { batchNo: v })} />
                <Field label="Expiry" type="date" value={l.expiryDate} min={addDaysTo(date, 1)} onChange={(v) => update(l.key, { expiryDate: v })} />
                <Field label="Units" type="number" value={l.quantity} onChange={(v) => update(l.key, { quantity: v })} />
                <Field label="Cost ৳" type="number" step="0.01" value={l.unitCost} onChange={(v) => update(l.key, { unitCost: v })} />
                <Field label="Sell ৳" type="number" step="0.01" value={l.unitPrice} onChange={(v) => update(l.key, { unitPrice: v })} invalid={belowCost} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLines((all) => all.filter((x) => x.key !== l.key))}
                  aria-label={`Remove ${l.medicine.brandName}`}
                >
                  <Trash2 className="size-4" />
                </Button>
                {belowCost && <p className="text-xs text-status-danger-fg sm:col-span-7">The selling price is below the cost.</p>}
              </div>
            );
          })}
          <MedicinePicker
            placeholder="Add a medicine from the delivery — brand or generic"
            onPick={(m) =>
              setLines((all) => [
                ...all,
                { key: `${m.id}-${Date.now()}`, medicine: m, batchNo: "", expiryDate: addDaysTo(date, 365), quantity: "", unitCost: "", unitPrice: "" },
              ])
            }
          />
        </div>

        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note (optional)" aria-label="Note" />
        <DialogFooter className="items-center gap-3 sm:justify-between">
          <p className="text-sm">
            {lines.length} line{lines.length === 1 ? "" : "s"} · total cost <span className="font-semibold tabular-nums">{formatPoisha(total)}</span>
          </p>
          <Button size="lg" disabled={!valid || save.isPending} onClick={() => (setError(undefined), save.mutate())}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <PackagePlus />} Receive stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  min,
  step,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  min?: string;
  step?: string;
  invalid?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input
        type={type}
        value={value}
        min={min ?? (type === "number" ? "0" : undefined)}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        className="h-9"
      />
    </label>
  );
}
