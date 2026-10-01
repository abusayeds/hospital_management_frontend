"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { apiFetchPage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Invoice, ORIGIN_LABEL } from "@/lib/billing";
import { formatPoisha } from "@/lib/money";
import { formatDate } from "@/lib/patients";
import { useLiveEvents } from "@/lib/socket";
import { InvoiceSheet } from "./invoice-sheet";
import { InvoiceStatusBadge } from "./invoice-status";

const LIVE_EVENTS = ["billing:updated"];

const columns: DataTableColumn<Invoice>[] = [
  { key: "no", header: "Invoice", cell: (i) => <span className="font-mono text-sm font-semibold text-heading">{i.invoiceNo}</span> },
  { key: "date", header: "Date", cell: (i) => formatDate(i.date) },
  { key: "for", header: "For", className: "hidden md:table-cell text-sm", cell: (i) => i.items.map((l) => l.description).join(", ") || ORIGIN_LABEL[i.origin.type] },
  { key: "total", header: "Total", className: "text-right tabular-nums font-semibold", cell: (i) => formatPoisha(i.total) },
  { key: "due", header: "Due", className: "text-right tabular-nums", cell: (i) => (i.amountDue > 0 && i.status !== "void" ? <span className="text-status-danger-fg">{formatPoisha(i.amountDue)}</span> : "—") },
  { key: "status", header: "Status", cell: (i) => <InvoiceStatusBadge invoice={i} /> },
];

/** Patient profile → Bills: every invoice of this patient with live payment status */
export function PatientBills({ patientId }: { patientId: string }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const bills = useQuery({
    queryKey: ["invoices", "patient", patientId],
    queryFn: () => apiFetchPage<Invoice>(`/invoices?patientId=${patientId}&limit=100`),
    enabled: can("bill:read"),
  });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["invoices", "patient", patientId] }), [queryClient, patientId]);
  useLiveEvents(LIVE_EVENTS, refresh);

  if (!can("bill:read")) return <p className="text-sm text-muted-foreground">Billing is visible to reception and accounts staff.</p>;
  const due = (bills.data?.items ?? []).filter((i) => i.status !== "void").reduce((s, i) => s + i.amountDue, 0);

  return (
    <div className="space-y-3">
      {due > 0 && (
        <p className="rounded-lg border border-status-danger-border bg-status-danger-bg px-4 py-2.5 text-sm font-medium text-status-danger-fg">
          Outstanding: {formatPoisha(due)} · <span className="font-bangla">বকেয়া</span>
        </p>
      )}
      <DataTable
        data={bills.data?.items ?? []}
        columns={columns}
        getRowId={(i) => i.id}
        isLoading={bills.isPending}
        onRowClick={(i) => setOpenId(i.id)}
        emptyTitle="No bills yet"
        emptyDescription="Bills are created automatically after a consultation or a verified lab report."
        pageSize={10}
      />
      <InvoiceSheet invoiceId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
