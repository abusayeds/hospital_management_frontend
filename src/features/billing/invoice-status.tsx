import { cn } from "@/lib/utils";
import type { Invoice } from "@/lib/billing";

/**
 * Invoice status colours (always with a text label):
 * draft gray · issued dark · partial amber · paid green · overdue red · refunded/void neutral.
 */
const STYLE = {
  draft: { label: "Draft", labelBn: "খসড়া", cls: "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border", dot: "bg-status-neutral-dot" },
  issued: { label: "Issued", labelBn: "বকেয়া", cls: "bg-slate-900 text-white border-slate-900", dot: "bg-white" },
  partial: { label: "Partial", labelBn: "আংশিক", cls: "bg-status-waiting-bg text-status-waiting-fg border-status-waiting-border", dot: "bg-status-waiting-dot" },
  paid: { label: "Paid", labelBn: "পরিশোধিত", cls: "bg-status-success-bg text-status-success-fg border-status-success-border", dot: "bg-status-success-dot" },
  overdue: { label: "Overdue", labelBn: "মেয়াদোত্তীর্ণ", cls: "bg-status-danger-bg text-status-danger-fg border-status-danger-border", dot: "bg-status-danger-dot" },
  refunded: { label: "Refunded", labelBn: "ফেরত", cls: "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border", dot: "bg-status-neutral-dot" },
  void: { label: "Void", labelBn: "বাতিল", cls: "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border line-through", dot: "bg-status-neutral-dot" },
} as const;

export function InvoiceStatusBadge({ invoice, className }: { invoice: Pick<Invoice, "status" | "overdue">; className?: string }) {
  const s = STYLE[invoice.overdue ? "overdue" : invoice.status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", s.cls, className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label} <span className="font-bangla opacity-80">· {s.labelBn}</span>
    </span>
  );
}
