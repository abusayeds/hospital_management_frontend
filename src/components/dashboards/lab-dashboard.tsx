"use client";

import { FileCheck2, FlaskConical, Siren, TestTube2 } from "lucide-react";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { labOrders, SampleLabOrder } from "@/lib/sample-data";
import { DashboardIntro } from "./dashboard-intro";
import { SampleDataNote } from "./sample-data-note";

const columns: DataTableColumn<SampleLabOrder>[] = [
  { key: "order", header: "Order", cell: (o) => <span className="font-mono text-xs font-medium text-heading">{o.orderNo}</span> },
  {
    key: "patient",
    header: "Patient / Test",
    cell: (o) => (
      <div>
        <p className="font-medium text-heading">{o.test}</p>
        <p className="text-xs text-muted-foreground">{o.patientName}</p>
      </div>
    ),
  },
  { key: "doctor", header: "Ordered by", className: "hidden md:table-cell", cell: (o) => o.doctor },
  {
    key: "priority",
    header: "Priority",
    cell: (o) => (o.priority === "urgent" ? <StatusBadge tone="danger">Urgent</StatusBadge> : <StatusBadge tone="neutral">Routine</StatusBadge>),
  },
  { key: "status", header: "Status", cell: (o) => <StatusBadge status={o.status} /> },
];

export function LabDashboard() {
  const count = (s: string) => labOrders.filter((o) => o.status === s).length;
  return (
    <div className="space-y-6">
      <DashboardIntro description="Paid lab orders flow here automatically. Urgent tests are listed first." />
      <SampleDataNote phase={4} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Samples to collect" value={count("pending")} icon={TestTube2} />
        <StatCard label="Processing" value={count("processing") + count("sample_collected")} icon={FlaskConical} />
        <StatCard label="Reports ready" value={count("ready")} icon={FileCheck2} hint="Patients notified by SMS" />
        <StatCard label="Urgent orders" value={labOrders.filter((o) => o.priority === "urgent").length} icon={Siren} tone="danger" />
      </div>

      <DataTable
        data={[...labOrders].sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "urgent" ? -1 : 1))}
        columns={columns}
        getRowId={(o) => o.id}
        searchText={(o) => `${o.orderNo} ${o.patientName} ${o.test}`}
        searchPlaceholder="Search order no, patient or test"
      />
    </div>
  );
}
