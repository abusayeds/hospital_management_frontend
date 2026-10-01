"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, apiFetchPage, getErrorMessage } from "@/lib/api";
import { Invoice, METHOD_LABEL, parseTaka, PaymentMethod } from "@/lib/billing";
import { formatPoisha, poishaToTaka } from "@/lib/money";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { InvoiceStatusBadge } from "./invoice-status";

const METHODS: PaymentMethod[] = ["cash", "card", "bkash", "nagad"];

const useInvalidateBilling = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    queryClient.invalidateQueries({ queryKey: ["invoice"] });
    queryClient.invalidateQueries({ queryKey: ["daily-collection"] });
  };
};

function Err({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm text-status-danger-fg">
      {message}
    </p>
  );
}

/** Pick an unpaid invoice by number, patient name, code or phone (for the floating "Take payment" button) */
function InvoicePicker({ onPick }: { onPick: (inv: Invoice) => void }) {
  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q.trim(), 250);
  const found = useQuery({
    queryKey: ["invoices", "picker", debounced],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "8", ...(debounced && { q: debounced }) });
      const [issued, partial] = await Promise.all([
        apiFetchPage<Invoice>(`/invoices?status=issued&${params}`),
        apiFetchPage<Invoice>(`/invoices?status=partial&${params}`),
      ]);
      return [...partial.items, ...issued.items];
    },
  });
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Invoice no., patient name, code or phone" className="h-11 pl-9" aria-label="Find invoice" />
      </div>
      <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
        {found.data?.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No unpaid invoices found</li>}
        {found.data?.map((inv) => (
          <li key={inv.id}>
            <button type="button" onClick={() => onPick(inv)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/60">
              <span className="flex-1">
                <span className="block font-medium text-heading">{inv.patient.name}</span>
                <span className="text-xs text-muted-foreground">
                  {inv.invoiceNo} · {inv.patient.patientCode}
                </span>
              </span>
              <InvoiceStatusBadge invoice={inv} />
              <span className="font-semibold text-heading tabular-nums">{formatPoisha(inv.amountDue)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Take a payment. Opened from an invoice (invoice given) or from the floating button (pick one).
 * The amount defaults to what is due; bKash/Nagad need the transaction ID.
 */
export function PaymentDialog({ open, onOpenChange, invoice: given }: { open: boolean; onOpenChange: (o: boolean) => void; invoice?: Invoice | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <PaymentBody key={given?.id ?? "pick"} given={given ?? null} onClose={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function PaymentBody({ given, onClose }: { given: Invoice | null; onClose: () => void }) {
  const invalidate = useInvalidateBilling();
  const [invoice, setInvoice] = useState<Invoice | null>(given);
  const [amount, setAmount] = useState(given ? String(poishaToTaka(given.amountDue)) : "");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pay = useMutation({
    mutationFn: (poisha: number) =>
      apiFetch<Invoice>(`/invoices/${invoice!.id}/payment`, { method: "POST", body: { amount: poisha, method, reference: reference.trim() || undefined } }),
    meta: { silent: true },
    onSuccess: (inv) => {
      toast.success(`Payment recorded · ${inv.invoiceNo} ${inv.amountDue ? `· ${formatPoisha(inv.amountDue)} still due` : "· fully paid"}`);
      invalidate();
      onClose();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  if (!invoice) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">Take payment · টাকা গ্রহণ</DialogTitle>
          <DialogDescription>Find the invoice first.</DialogDescription>
        </DialogHeader>
        <InvoicePicker
          onPick={(inv) => {
            setInvoice(inv);
            setAmount(String(poishaToTaka(inv.amountDue)));
          }}
        />
      </>
    );
  }

  const submit = () => {
    const poisha = parseTaka(amount);
    if (!poisha) return setError("Enter the amount received.");
    if (poisha > invoice.amountDue) return setError(`Only ${formatPoisha(invoice.amountDue)} is due.`);
    if ((method === "bkash" || method === "nagad") && !reference.trim()) return setError("Enter the bKash/Nagad transaction ID.");
    setError(null);
    pay.mutate(poisha);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-heading">Take payment · {invoice.invoiceNo}</DialogTitle>
        <DialogDescription>
          {invoice.patient.name} · {invoice.patient.patientCode} — due <b className="text-heading">{formatPoisha(invoice.amountDue)}</b> of {formatPoisha(invoice.total)}
        </DialogDescription>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Method · মাধ্যম</legend>
          <div className="grid grid-cols-4 gap-2">
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={method === m}
                onClick={() => setMethod(m)}
                className={cn("h-11 rounded-lg border text-sm font-medium", method === m ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary")}
              >
                {METHOD_LABEL[m].label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount">Amount (৳)</Label>
            <Input id="pay-amount" inputMode="decimal" className="h-11 text-lg tabular-nums" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-ref">{method === "bkash" || method === "nagad" ? "Transaction ID *" : "Reference (optional)"}</Label>
            <Input id="pay-ref" className="h-11" value={reference} onChange={(e) => setReference(e.target.value)} placeholder={method === "card" ? "Slip no." : method === "cash" ? "" : "TrxID"} />
          </div>
        </div>
        <Err message={error} />
        <DialogFooter>
          {!given && (
            <Button type="button" variant="ghost" onClick={() => setInvoice(null)}>
              Other invoice
            </Button>
          )}
          <Button type="button" variant="outline" size="lg" onClick={onClose} disabled={pay.isPending}>
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={pay.isPending}>
            {pay.isPending && <Loader2 className="animate-spin" />} Record payment
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export type MoneyAction = "discount" | "refund" | "void";

const ACTION_COPY: Record<MoneyAction, { title: string; button: string; danger: boolean; help: string }> = {
  discount: { title: "Give a discount", button: "Apply discount", danger: false, help: "Reduces what the patient owes. The reason is kept in the audit log." },
  refund: { title: "Refund money", button: "Record refund", danger: true, help: "Money given back to the patient. Never more than was paid." },
  void: { title: "Void invoice", button: "Void invoice", danger: true, help: "The bill is cancelled but kept for the record. Refund any payment first." },
};

/** Discount / refund / void — each needs a reason (and an amount, except void) */
export function MoneyActionDialog({ action, invoice, onClose }: { action: MoneyAction | null; invoice: Invoice | null; onClose: () => void }) {
  const invalidate = useInvalidateBilling();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const copy = action ? ACTION_COPY[action] : null;

  const run = useMutation({
    mutationFn: (body: unknown) => apiFetch<Invoice>(`/invoices/${invoice!.id}/${action}`, { method: "POST", body }),
    meta: { silent: true },
    onSuccess: () => {
      toast.success(action === "void" ? "Invoice voided" : action === "refund" ? "Refund recorded" : "Discount applied");
      invalidate();
      setAmount("");
      setReason("");
      onClose();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const submit = () => {
    if (reason.trim().length < 3) return setError("Give a short reason.");
    if (action === "void") return run.mutate({ reason: reason.trim() });
    const poisha = parseTaka(amount);
    if (!poisha) return setError("Enter an amount.");
    setError(null);
    run.mutate(action === "refund" ? { amount: poisha, method, reason: reason.trim() } : { amount: poisha, reason: reason.trim() });
  };

  return (
    <Dialog open={Boolean(action && invoice)} onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">
            {copy?.title} · {invoice?.invoiceNo}
          </DialogTitle>
          <DialogDescription>{copy?.help}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {action !== "void" && (
            <div className="space-y-1.5">
              <Label htmlFor="ma-amount">
                Amount (৳) — {action === "refund" ? `paid ${formatPoisha(invoice?.amountPaid ?? 0)}` : `due ${formatPoisha(invoice?.amountDue ?? 0)}`}
              </Label>
              <Input id="ma-amount" inputMode="decimal" className="h-11 tabular-nums" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          )}
          {action === "refund" && (
            <div className="grid grid-cols-4 gap-2">
              {METHODS.map((m) => (
                <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(m)} className={cn("h-10 rounded-lg border text-sm", method === m ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
                  {METHOD_LABEL[m].label}
                </button>
              ))}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="ma-reason">Reason · কারণ</Label>
            <Input id="ma-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={action === "discount" ? "Poor patient support, staff family…" : "Wrong charge, test cancelled…"} />
          </div>
          <Err message={error} />
        </div>
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={onClose} disabled={run.isPending}>
            Close
          </Button>
          <Button size="lg" onClick={submit} disabled={run.isPending} className={cn(copy?.danger && "bg-destructive text-white hover:bg-destructive/90")}>
            {run.isPending && <Loader2 className="animate-spin" />} {copy?.button}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
