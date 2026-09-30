"use client";

import { ClipboardList, PackageMinus, PackageX, TimerOff } from "lucide-react";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { SampleStockItem, stockItems } from "@/lib/sample-data";
import { DashboardIntro } from "./dashboard-intro";
import { SampleDataNote } from "./sample-data-note";

const columns: DataTableColumn<SampleStockItem>[] = [
  {
    key: "name",
    header: "Medicine",
    cell: (s) => (
      <div>
        <p className="font-medium text-heading">{s.name}</p>
        <p className="text-xs text-muted-foreground">{s.generic}</p>
      </div>
    ),
  },
  { key: "batch", header: "Batch", className: "hidden md:table-cell font-mono text-xs", cell: (s) => s.batch },
  {
    key: "stock",
    header: "Stock",
    className: "text-right tabular-nums",
    cell: (s) => (
      <span>
        <span className="font-semibold text-heading">{s.stock.toLocaleString("en-IN")}</span>
        <span className="text-xs text-muted-foreground"> / min {s.reorderLevel}</span>
      </span>
    ),
  },
  { key: "expiry", header: "Expiry", className: "hidden sm:table-cell tabular-nums", cell: (s) => s.expiry },
  { key: "status", header: "Status", cell: (s) => <StatusBadge status={s.status} /> },
];

export function PharmacyDashboard() {
  const count = (s: string) => stockItems.filter((i) => i.status === s).length;
  return (
    <div className="space-y-6">
      <DashboardIntro description="Prescriptions waiting to be dispensed, and stock that needs attention." />
      <SampleDataNote phase={7} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="To dispense" value={12} icon={ClipboardList} hint="From today's prescriptions" />
        <StatCard label="Low stock" value={count("low_stock")} icon={PackageMinus} />
        <StatCard label="Expiring / expired" value={count("expiring") + count("expired")} icon={TimerOff} hint="Within 90 days" />
        <StatCard label="Out of stock" value={count("out_of_stock")} icon={PackageX} tone="danger" />
      </div>

      <DataTable
        data={stockItems}
        columns={columns}
        getRowId={(s) => s.id}
        searchText={(s) => `${s.name} ${s.generic} ${s.batch}`}
        searchPlaceholder="Search brand, generic or batch"
      />
    </div>
  );
}
