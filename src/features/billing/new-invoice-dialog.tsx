"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { apiFetch, apiFetchPage, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Invoice, parseTaka } from "@/lib/billing";
import { formatPoisha } from "@/lib/money";
import { Patient } from "@/lib/patients";
import { PatientSearch } from "../patients/patient-search";

type CatalogItem = { id: string; name: string; code?: string; price: number };
type Draft =
  | { kind: "service"; serviceId: string; quantity: number }
  | { kind: "lab_test"; labTestId: string; quantity: number }
  | { kind: "custom"; description: string; price: string; quantity: number };

/**
 * Counter bill: pick the patient, add services / lab tests from the catalogue (prices come from
 * the catalogue — not typed), or a custom line (accounts only). Visits and verified lab orders are
 * billed automatically, so this is for walk-in procedures and extras.
 */
export function NewInvoiceDialog({ open, onOpenChange, onCreated, patient: given }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated?: (inv: Invoice) => void; patient?: Patient | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        {open && <Body given={given ?? null} onClose={() => onOpenChange(false)} onCreated={onCreated} />}
      </DialogContent>
    </Dialog>
  );
}

function Body({ given, onClose, onCreated }: { given: Patient | null; onClose: () => void; onCreated?: (inv: Invoice) => void }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [patient, setPatient] = useState<Patient | null>(given);
  const [lines, setLines] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const services = useQuery({ queryKey: ["services", "billing"], queryFn: () => apiFetchPage<CatalogItem>("/services?status=active&limit=100") });
  const tests = useQuery({ queryKey: ["lab-tests", "billing"], queryFn: () => apiFetchPage<CatalogItem>("/lab-tests?status=active&limit=100"), meta: { silent: true } });

  const priceOf = (l: Draft) =>
    l.kind === "service"
      ? (services.data?.items.find((s) => s.id === l.serviceId)?.price ?? 0) * l.quantity
      : l.kind === "lab_test"
        ? (tests.data?.items.find((t) => t.id === l.labTestId)?.price ?? 0) * l.quantity
        : (parseTaka(l.price) ?? 0) * l.quantity;
  const total = lines.reduce((s, l) => s + priceOf(l), 0);

  const save = useMutation({
    mutationFn: (issue: boolean) =>
      apiFetch<Invoice>("/invoices", {
        method: "POST",
        body: {
          patientId: patient!.id,
          issue,
          items: lines.map((l) =>
            l.kind === "custom" ? { kind: "custom", description: l.description.trim(), unitPrice: parseTaka(l.price) ?? 0, quantity: l.quantity } : l,
          ),
        },
      }),
    meta: { silent: true },
    onSuccess: (inv) => {
      toast.success(`${inv.invoiceNo} created · ${formatPoisha(inv.total)}`);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onCreated?.(inv);
      onClose();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  if (!patient) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">New bill · নতুন বিল</DialogTitle>
          <DialogDescription>Find the patient.</DialogDescription>
        </DialogHeader>
        <PatientSearch pageSize={6} onSelect={setPatient} />
      </>
    );
  }

  const update = (i: number, patch: Partial<Draft>) => setLines(lines.map((l, j) => (j === i ? ({ ...l, ...patch } as Draft) : l)));
  const valid = lines.length > 0 && lines.every((l) => (l.kind === "service" ? l.serviceId : l.kind === "lab_test" ? l.labTestId : l.description.trim().length > 1 && parseTaka(l.price)));

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-heading">New bill · {patient.name}</DialogTitle>
        <DialogDescription>
          {patient.patientCode} · Consultations and verified lab tests are billed automatically — add only extras here.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_5rem_6rem_auto] items-end gap-2">
            {l.kind === "service" && (
              <NativeSelect aria-label="Service" value={l.serviceId} onChange={(e) => update(i, { serviceId: e.target.value })}>
                <option value="">Choose a service…</option>
                {services.data?.items.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {formatPoisha(s.price)}
                  </option>
                ))}
              </NativeSelect>
            )}
            {l.kind === "lab_test" && (
              <NativeSelect aria-label="Lab test" value={l.labTestId} onChange={(e) => update(i, { labTestId: e.target.value })}>
                <option value="">Choose a lab test…</option>
                {tests.data?.items.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} · {t.name} — {formatPoisha(t.price)}
                  </option>
                ))}
              </NativeSelect>
            )}
            {l.kind === "custom" && (
              <div className="grid grid-cols-[1fr_6rem] gap-2">
                <Input aria-label="Description" placeholder="Description" value={l.description} onChange={(e) => update(i, { description: e.target.value })} />
                <Input aria-label="Price in taka" placeholder="৳" inputMode="decimal" value={l.price} onChange={(e) => update(i, { price: e.target.value })} />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor={`qty-${i}`} className="text-xs">
                Qty
              </Label>
              <Input id={`qty-${i}`} type="number" min={1} value={l.quantity} onChange={(e) => update(i, { quantity: Math.max(1, Number(e.target.value) || 1) })} />
            </div>
            <p className="pb-2 text-right font-medium tabular-nums">{formatPoisha(priceOf(l))}</p>
            <Button type="button" variant="ghost" size="icon" aria-label="Remove line" onClick={() => setLines(lines.filter((_, j) => j !== i))}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, { kind: "service", serviceId: "", quantity: 1 }])}>
            <Plus /> Service
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, { kind: "lab_test", labTestId: "", quantity: 1 }])}>
            <Plus /> Lab test
          </Button>
          {can("bill:discount") && (
            <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, { kind: "custom", description: "", price: "", quantity: 1 }])}>
              <Plus /> Custom line
            </Button>
          )}
        </div>
        <p className="text-right text-lg font-semibold text-heading">Total {formatPoisha(total)}</p>
        {error && <p className="rounded-lg border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm text-status-danger-fg">{error}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" size="lg" onClick={onClose} disabled={save.isPending}>
          Cancel
        </Button>
        <Button variant="secondary" size="lg" disabled={!valid || save.isPending} onClick={() => save.mutate(false)}>
          Save draft
        </Button>
        <Button size="lg" disabled={!valid || save.isPending} onClick={() => save.mutate(true)}>
          {save.isPending && <Loader2 className="animate-spin" />} Create & issue
        </Button>
      </DialogFooter>
    </>
  );
}
