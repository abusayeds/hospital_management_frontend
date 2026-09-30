"use client";

import { AlertCircle, Banknote, Receipt, Undo2 } from "lucide-react";
import { RankedBarChart } from "@/components/shared/charts";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { collectionByMethod, formatTaka, invoices, SampleInvoice } from "@/lib/sample-data";
import { DashboardIntro } from "./dashboard-intro";
import { SampleDataNote } from "./sample-data-note";

const columns: DataTableColumn<SampleInvoice>[] = [
  { key: "no", header: "Invoice", cell: (i) => <span className="font-mono text-xs font-medium text-heading">{i.invoiceNo}</span> },
  {
    key: "patient",
    header: "Patient",
    cell: (i) => (
      <div>
        <p className="font-medium text-heading">{i.patientName}</p>
        <p className="text-xs text-muted-foreground">{i.items}</p>
      </div>
    ),
  },
  { key: "method", header: "Method", className: "hidden md:table-cell", cell: (i) => i.method },
  { key: "amount", header: "Amount", className: "text-right tabular-nums font-medium text-heading", cell: (i) => formatTaka(i.amount) },
  { key: "status", header: "Status", cell: (i) => <StatusBadge status={i.status} /> },
];

export function AccountsDashboard() {
  const due = invoices.reduce((sum, i) => sum + (i.amount - i.paid), 0);
  return (
    <div className="space-y-6">
      <DashboardIntro description="Today's collection, open invoices and dues." />
      <SampleDataNote phase={7} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected today" value={formatTaka(218800)} icon={Banknote} trend={{ value: "7.4%", direction: "up", label: "vs last Tuesday" }} />
        <StatCard label="Invoices today" value={64} icon={Receipt} />
        <StatCard label="Outstanding dues" value={formatTaka(due)} icon={AlertCircle} tone="danger" hint={`${invoices.filter((i) => i.status !== "paid").length} invoices`} />
        <StatCard label="Refunds" value={1} icon={Undo2} hint={formatTaka(600)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Collection by payment method" description="Today, in taka">
          <RankedBarChart data={collectionByMethod} caption="Collection by payment method" format={formatTaka} />
        </SectionCard>
        <div className="lg:col-span-2">
          <DataTable
            data={invoices}
            columns={columns}
            getRowId={(i) => i.id}
            searchText={(i) => `${i.invoiceNo} ${i.patientName}`}
            searchPlaceholder="Search invoice no or patient"
            pageSize={6}
          />
        </div>
      </div>
    </div>
  );
}
