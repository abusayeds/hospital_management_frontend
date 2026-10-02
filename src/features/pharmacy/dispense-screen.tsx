"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, PackageCheck, Pill, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, getErrorMessage } from "@/lib/api";
import { formatPoisha } from "@/lib/money";
import { formatDate } from "@/lib/patients";
import { Dispense, expiryText, PrescriptionForDispense, QUEUE_STATUS, QueueItem } from "@/lib/pharmacy";
import { useLiveEvents } from "@/lib/socket";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { medicineLabel, MedicinePicker } from "./medicine-picker";

const LIVE = ["pharmacy:updated"];

/**
 * Pharmacy → Dispense. Left: signed prescriptions waiting (search by RX no., name, code or phone).
 * Right: the prescription with suggested quantities, stock and price; give all or part, add extras,
 * and "Dispense & bill" — stock comes from the earliest-expiry batch and the bill goes to the counter.
 */
export function DispenseScreen() {
  return (
    <RequirePermission permission="dispense:create">
      <Content />
    </RequirePermission>
  );
}

function Content() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"pending" | "dispensed">("pending");
  const [q, setQ] = useState("");
  const term = useDebouncedValue(q.trim(), 300);
  const [openId, setOpenId] = useState<string | null>(null);
  const [done, setDone] = useState<Dispense | null>(null);

  const queue = useQuery({
    queryKey: ["pharmacy", "queue", status, term],
    queryFn: () => apiFetch<QueueItem[]>(`/pharmacy/prescriptions?status=${status}&days=14${term ? `&q=${encodeURIComponent(term)}` : ""}`),
  });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["pharmacy"] }), [queryClient]);
  useLiveEvents(LIVE, refresh);

  // An exact RX number opens straight away (scanner or typed)
  const rxMatch = /^RX-?\d+$/i.test(term) && queue.data?.length === 1 ? queue.data[0].visitId : null;
  const activeId = openId ?? rxMatch;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispense · ওষুধ প্রদান"
        description="Signed prescriptions from the doctors. Medicines come from the batch that expires first; the bill is sent to the counter automatically."
      />
      <div className="grid min-h-[560px] gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-card">
          <div className="space-y-2 border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="RX no., patient name, code or phone"
                className="h-10 pl-9"
                aria-label="Find a prescription"
              />
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="tablist">
              {(["pending", "dispensed"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={status === s}
                  onClick={() => setStatus(s)}
                  className={cn("rounded-md py-1.5 text-sm font-medium", status === s ? "bg-card text-heading shadow-sm" : "text-muted-foreground")}
                >
                  {s === "pending" ? "To dispense" : "Dispensed"}
                </button>
              ))}
            </div>
          </div>
          <ul className="max-h-[640px] flex-1 divide-y overflow-y-auto">
            {queue.isPending ? (
              <Skeleton className="m-3 h-40" />
            ) : !queue.data?.length ? (
              <EmptyState
                icon={ClipboardList}
                title={status === "pending" ? "No prescriptions waiting" : "Nothing dispensed yet"}
                description="Prescriptions appear here as soon as a doctor signs them."
              />
            ) : (
              queue.data.map((p) => (
                <li key={p.visitId}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenId(p.visitId);
                      setDone(null);
                    }}
                    className={cn("flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-muted/60", activeId === p.visitId && "bg-muted")}
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium text-heading">{p.patient.name}</span>
                      <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">{p.prescriptionNo}</span>
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {p.medicines} medicine{p.medicines === 1 ? "" : "s"} · {p.preview}
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge tone={QUEUE_STATUS[p.status].tone}>{QUEUE_STATUS[p.status].label}</StatusBadge>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {p.doctor} · {formatDate(p.date)}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <section className="min-w-0 rounded-xl border bg-card shadow-card">
          {done ? (
            <DispenseDone d={done} onNext={() => (setDone(null), setOpenId(null))} />
          ) : activeId ? (
            <DispensePanel key={activeId} visitId={activeId} onDone={(d) => (setDone(d), refresh())} />
          ) : (
            <EmptyState
              icon={Pill}
              title="Choose a prescription"
              description="Pick one on the left, or type the RX number printed on the prescription."
              className="h-full"
            />
          )}
        </section>
      </div>
    </div>
  );
}

type Row = {
  key: string;
  medicineId: string | null;
  label: string;
  sub: string;
  prescribedIndex: number | null;
  quantity: number;
  include: boolean;
  available: number;
  unitPrice: number | null;
  nearestExpiry: string | null;
};

function DispensePanel({ visitId, onDone }: { visitId: string; onDone: (d: Dispense) => void }) {
  const rx = useQuery({ queryKey: ["pharmacy", "rx", visitId], queryFn: () => apiFetch<PrescriptionForDispense>(`/pharmacy/prescriptions/${visitId}`) });
  if (!rx.data) return <Skeleton className="m-5 h-96" />;
  return <DispenseForm rx={rx.data} onDone={onDone} />;
}

/** Editable rows: suggested quantity minus what was already given; only in-stock catalogue lines ticked */
const buildRows = (rx: PrescriptionForDispense): Row[] =>
  rx.lines.map((l) => {
    const remaining = Math.max(0, l.suggestedQuantity - l.alreadyDispensed);
    return {
      key: `rx-${l.index}`,
      medicineId: l.medicineId,
      label: [l.brandName, l.strength, l.form].filter(Boolean).join(" "),
      sub: `${l.genericName ? `${l.genericName} · ` : ""}${l.dosePattern}${l.durationDays ? ` × ${l.durationDays} days` : l.continued ? " · continue" : ""}${l.alreadyDispensed ? ` · ${l.alreadyDispensed} already given` : ""}`,
      prescribedIndex: l.index,
      quantity: remaining || l.suggestedQuantity,
      include: Boolean(l.medicineId) && remaining > 0 && l.available > 0,
      available: l.available,
      unitPrice: l.unitPrice,
      nearestExpiry: l.nearestExpiry,
    };
  });

function DispenseForm({ rx: r, onDone }: { rx: PrescriptionForDispense; onDone: (d: Dispense) => void }) {
  const [rows, setRows] = useState<Row[]>(() => buildRows(r));
  const [notes, setNotes] = useState("");

  const extraStock = useMutation({
    mutationFn: (medicineId: string) =>
      apiFetch<{ batches: { quantity: number; expired: boolean; writtenOff: boolean; unitPrice: number; expiryDate: string }[] }>(
        `/pharmacy/stock/${medicineId}`,
      ),
  });

  const submit = useMutation({
    mutationFn: () =>
      apiFetch<Dispense>("/pharmacy/dispenses", {
        method: "POST",
        body: {
          patientId: r.patient.id,
          visitId: r.visitId,
          notes: notes.trim() || undefined,
          items: rows
            .filter((r) => r.include && r.medicineId)
            .map((r) => ({ medicineId: r.medicineId, quantity: r.quantity, prescribedIndex: r.prescribedIndex })),
        },
      }),
    meta: { silent: true },
    onSuccess: (d) => {
      toast.success(`${d.dispenseNo} dispensed — the bill (${formatPoisha(d.total)}) is at the counter`);
      onDone(d);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const chosen = rows.filter((x) => x.include && x.medicineId);
  const estimate = chosen.reduce((s, x) => s + x.quantity * (x.unitPrice ?? 0), 0);
  const problems = chosen.filter((x) => x.quantity > x.available);
  const update = (key: string, patch: Partial<Row>) => setRows((all) => all.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  return (
    <div className="flex h-full flex-col">
      {/* patient */}
      <div className="flex flex-wrap items-start gap-4 border-b p-5">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-heading">
            {r.patient.name}
            {r.patient.nameBn && <span className="font-bangla ml-2 text-base font-normal text-muted-foreground">{r.patient.nameBn}</span>}
          </p>
          <p className="text-sm text-muted-foreground">
            {r.patient.patientCode} · {r.patient.age ?? "—"} y · {r.patient.gender} · {r.prescriptionNo} · {r.doctor} · {formatDate(r.date)}
          </p>
        </div>
        <StatusBadge tone={QUEUE_STATUS[r.status].tone}>{QUEUE_STATUS[r.status].label}</StatusBadge>
        {r.patient.allergies.length > 0 && (
          <p className="flex w-full items-center gap-2 rounded-lg border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm font-medium text-status-danger-fg">
            <AlertTriangle className="size-4 shrink-0" /> Allergies: {r.patient.allergies.join(", ")}
          </p>
        )}
      </div>

      {/* lines */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-2">
                <span className="sr-only">Give</span>
              </th>
              <th className="px-2 py-2 font-medium">Medicine</th>
              <th className="px-2 py-2 font-medium">Stock</th>
              <th className="w-28 px-2 py-2 font-medium">Qty</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((x) => {
              const short = x.include && x.quantity > x.available;
              return (
                <tr key={x.key} className={cn(!x.include && "opacity-55")}>
                  <td className="px-4 py-3 align-top">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-[var(--primary)]"
                      checked={x.include}
                      disabled={!x.medicineId}
                      onChange={(e) => update(x.key, { include: e.target.checked })}
                      aria-label={`Give ${x.label}`}
                    />
                  </td>
                  <td className="px-2 py-3 align-top">
                    <p className="font-medium text-heading">{x.label}</p>
                    <p className="text-xs text-muted-foreground">{x.sub}</p>
                    {!x.medicineId && <p className="mt-1 text-xs text-status-waiting-fg">Not in the catalogue — give it by hand or ask an admin to add it.</p>}
                  </td>
                  <td className="px-2 py-3 align-top text-xs">
                    {x.medicineId ? (
                      <>
                        <p className={cn("font-semibold tabular-nums", x.available ? "text-heading" : "text-status-danger-fg")}>
                          {x.available ? `${x.available} in stock` : "Out of stock"}
                        </p>
                        {x.nearestExpiry && <p className="text-muted-foreground">Next batch {expiryText(x.nearestExpiry)}</p>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-2 py-3 align-top">
                    <Input
                      type="number"
                      min={1}
                      max={9999}
                      value={x.quantity}
                      disabled={!x.include}
                      onChange={(e) => update(x.key, { quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
                      aria-invalid={short}
                      className={cn("h-9 w-24 tabular-nums", short && "border-status-danger-border")}
                      aria-label={`Quantity of ${x.label}`}
                    />
                    {short && <p className="mt-1 text-xs text-status-danger-fg">Only {x.available}</p>}
                  </td>
                  <td className="px-4 py-3 text-right align-top tabular-nums">
                    {x.unitPrice !== null ? (
                      <>
                        <p className="font-semibold text-heading">{formatPoisha(x.quantity * x.unitPrice)}</p>
                        <p className="text-xs text-muted-foreground">{formatPoisha(x.unitPrice)} each</p>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="pr-3 align-top">
                    {x.prescribedIndex === null && (
                      <Button variant="ghost" size="icon" onClick={() => setRows((all) => all.filter((y) => y.key !== x.key))} aria-label={`Remove ${x.label}`}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="border-t p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Plus className="size-3.5" /> Add a medicine the patient asks for (not on the prescription)
          </p>
          <MedicinePicker
            onPick={async (m) => {
              if (rows.some((x) => x.medicineId === m.id)) return toast.info(`${medicineLabel(m)} is already on the list`);
              const s = await extraStock.mutateAsync(m.id).catch(() => null);
              const live = (s?.batches ?? [])
                .filter((b) => b.quantity > 0 && !b.expired && !b.writtenOff)
                .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
              setRows((all) => [
                ...all,
                {
                  key: `extra-${m.id}`,
                  medicineId: m.id,
                  label: medicineLabel(m),
                  sub: `${m.genericName} · added at the counter`,
                  prescribedIndex: null,
                  quantity: 1,
                  include: live.length > 0,
                  available: live.reduce((t, b) => t + b.quantity, 0),
                  unitPrice: live[0]?.unitPrice ?? null,
                  nearestExpiry: live[0]?.expiryDate ?? null,
                },
              ]);
            }}
          />
        </div>
      </div>

      {/* footer */}
      <div className="space-y-3 border-t bg-muted/30 p-5">
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note (optional) — e.g. patient took 5 days now, will come back for the rest"
          aria-label="Note"
        />
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground">
              Estimated bill · {chosen.length} medicine{chosen.length === 1 ? "" : "s"}
            </p>
            <p className="text-2xl font-semibold text-heading tabular-nums">{formatPoisha(estimate)}</p>
          </div>
          <Button size="xl" className="ml-auto" disabled={!chosen.length || problems.length > 0 || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? <Loader2 className="animate-spin" /> : <PackageCheck />} Dispense &amp; bill
          </Button>
        </div>
        {problems.length > 0 && (
          <p className="text-sm text-status-danger-fg">Reduce the quantity of {problems.map((p) => p.label).join(", ")} — not enough in stock.</p>
        )}
      </div>
    </div>
  );
}

function DispenseDone({ d, onNext }: { d: Dispense; onNext: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-status-success-bg text-status-success-fg">
        <CheckCircle2 className="size-7" />
      </span>
      <div>
        <p className="text-xl font-semibold text-heading">{d.dispenseNo} dispensed</p>
        <p className="text-sm text-muted-foreground">
          {d.patient.name} · bill {formatPoisha(d.total)} sent to the counter
        </p>
      </div>
      <ul className="w-full divide-y rounded-lg border text-left text-sm">
        {d.items.map((i) => (
          <li key={i.medicineId} className="flex gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-heading">
                {i.description} × {i.quantity}
              </p>
              <p className="text-xs text-muted-foreground">
                {i.batches.map((b) => `Batch ${b.batchNo} (${b.quantity}, exp ${formatDate(b.expiryDate)})`).join(" · ")}
              </p>
            </div>
            <span className="font-semibold tabular-nums">{formatPoisha(i.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <Button size="lg" onClick={onNext}>
        Next prescription
      </Button>
    </div>
  );
}
