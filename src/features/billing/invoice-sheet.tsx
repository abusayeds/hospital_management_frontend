"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, Ban, CreditCard, FileCheck2, Printer, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Invoice, METHOD_LABEL, ORIGIN_LABEL, SOURCE_LABEL } from "@/lib/billing";
import { formatPoisha } from "@/lib/money";
import { formatDate } from "@/lib/patients";
import { MoneyAction, MoneyActionDialog, PaymentDialog } from "./invoice-actions";
import { InvoiceStatusBadge } from "./invoice-status";

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" });

/** One invoice: lines, totals, payment history and every action the user is allowed to take */
export function InvoiceSheet({ invoiceId, onClose }: { invoiceId: string | null; onClose: () => void }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [action, setAction] = useState<MoneyAction | null>(null);
  const [issuing, setIssuing] = useState(false);
  const inv = useQuery({ queryKey: ["invoice", invoiceId], queryFn: () => apiFetch<Invoice>(`/invoices/${invoiceId}`), enabled: Boolean(invoiceId) });
  const issue = useMutation({
    mutationFn: () => apiFetch<Invoice>(`/invoices/${invoiceId}/issue`, { method: "POST" }),
    onSuccess: (i) => {
      toast.success(`${i.invoiceNo} issued`);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice"] });
    },
  });
  const i = inv.data;
  const open = (["issued", "partial", "draft"] as const).includes(i?.status as "issued");

  return (
    <Sheet open={Boolean(invoiceId)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2 text-lg text-heading">
            {i?.invoiceNo ?? "Invoice"} {i && <InvoiceStatusBadge invoice={i} />}
          </SheetTitle>
          <SheetDescription>{i ? `${i.patient.name} · ${i.patient.patientCode} · ${ORIGIN_LABEL[i.origin.type]}` : "Loading…"}</SheetDescription>
        </SheetHeader>

        {i && (
          <div className="space-y-5 px-4 pb-6">
            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Date</dt>
                <dd className="font-medium text-heading">{formatDate(i.date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Due</dt>
                <dd className={i.overdue ? "font-semibold text-status-danger-fg" : "font-medium text-heading"}>{formatDate(i.dueDate)}</dd>
              </div>
              {i.doctor && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Doctor / department</dt>
                  <dd className="font-medium text-heading">
                    {i.doctor.displayName}
                    {i.department && ` · ${i.department.name}`}
                  </dd>
                </div>
              )}
            </dl>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground uppercase">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {i.items.map((l) => (
                  <tr key={l.lineId}>
                    <td className="py-2">
                      <p className="text-heading">{l.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {SOURCE_LABEL[l.source]} · {formatPoisha(l.unitPrice)} each
                      </p>
                    </td>
                    <td className="py-2 text-right tabular-nums">{l.quantity}</td>
                    <td className="py-2 text-right font-medium tabular-nums">{formatPoisha(l.lineTotal)}</td>
                  </tr>
                ))}
                {i.discounts.map((d, k) => (
                  <tr key={k} className="text-status-success-fg">
                    <td className="py-2" colSpan={2}>
                      Discount — {d.reason}
                    </td>
                    <td className="py-2 text-right tabular-nums">− {formatPoisha(d.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="ml-auto w-64 space-y-1 text-sm">
              <Row label="Subtotal" value={formatPoisha(i.subtotal)} />
              {i.discountTotal > 0 && <Row label="Discounts" value={`− ${formatPoisha(i.discountTotal)}`} />}
              <Row label="Total" value={formatPoisha(i.total)} strong />
              <Row label="Paid" value={formatPoisha(i.amountPaid)} />
              <Row label="Due" value={formatPoisha(i.amountDue)} strong danger={i.amountDue > 0} />
            </dl>

            {(i.payments.length > 0 || i.refunds.length > 0) && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-heading">Payments</h3>
                <ul className="divide-y rounded-lg border text-sm">
                  {i.payments.map((p) => (
                    <li key={p.paymentId} className="flex items-center gap-3 px-3 py-2">
                      <CreditCard className="size-4 text-muted-foreground" />
                      <span className="flex-1">
                        {METHOD_LABEL[p.method].label} {p.reference && <span className="text-xs text-muted-foreground">· {p.reference}</span>}
                        <span className="block text-xs text-muted-foreground">{when(p.at)}</span>
                      </span>
                      <span className="font-medium tabular-nums">{formatPoisha(p.amount)}</span>
                    </li>
                  ))}
                  {i.refunds.map((r, k) => (
                    <li key={`r${k}`} className="flex items-center gap-3 px-3 py-2 text-status-danger-fg">
                      <Undo2 className="size-4" />
                      <span className="flex-1">
                        Refund ({METHOD_LABEL[r.method].label}) — {r.reason}
                        <span className="block text-xs opacity-80">{when(r.at)}</span>
                      </span>
                      <span className="font-medium tabular-nums">− {formatPoisha(r.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {i.voidReason && <p className="rounded-lg bg-muted px-3 py-2 text-sm">Voided: {i.voidReason}</p>}

            <div className="flex flex-wrap gap-2 border-t pt-4">
              {can("bill:collect") && open && i.amountDue > 0 && (
                <Button size="lg" onClick={() => setPayOpen(true)}>
                  <CreditCard /> Take payment
                </Button>
              )}
              {can("bill:collect") && i.status === "draft" && (
                <Button size="lg" variant="outline" onClick={() => setIssuing(true)}>
                  <FileCheck2 /> Issue
                </Button>
              )}
              <Button size="lg" variant="outline" render={<a href={`/api/v1/invoices/${i.id}/receipt.pdf`} target="_blank" rel="noopener" />} nativeButton={false}>
                <Printer /> {i.status === "paid" ? "Receipt" : "Invoice"} PDF
              </Button>
              {can("bill:discount") && open && i.amountDue > 0 && (
                <Button variant="ghost" onClick={() => setAction("discount")}>
                  <BadgePercent /> Discount
                </Button>
              )}
              {can("bill:discount") && i.amountPaid > 0 && (
                <Button variant="ghost" onClick={() => setAction("refund")}>
                  <Undo2 /> Refund
                </Button>
              )}
              {can("bill:discount") && i.status !== "void" && i.amountPaid <= 0 && (
                <Button variant="ghost" className="text-destructive" onClick={() => setAction("void")}>
                  <Ban /> Void
                </Button>
              )}
            </div>
          </div>
        )}
        <PaymentDialog open={payOpen} onOpenChange={setPayOpen} invoice={i} />
        <MoneyActionDialog action={action} invoice={i ?? null} onClose={() => setAction(null)} />
        <ConfirmDialog
          open={issuing}
          onOpenChange={setIssuing}
          title={`Issue ${i?.invoiceNo}?`}
          description="Issuing locks the lines. Discounts and payments are still possible."
          confirmLabel="Issue invoice"
          onConfirm={async () => {
            await issue.mutateAsync();
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold text-heading" : "text-muted-foreground"} ${danger ? "text-status-danger-fg" : ""}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
