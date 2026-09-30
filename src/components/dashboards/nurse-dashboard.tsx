"use client";

import { Activity, AlertTriangle, Clock, HeartPulse } from "lucide-react";
import { toast } from "sonner";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { SampleVisit, todaysVisits } from "@/lib/sample-data";
import { DashboardIntro } from "./dashboard-intro";
import { SampleDataNote } from "./sample-data-note";

type WaitingRow = SampleVisit & { waitingMin: number; vitals: "pending" | "normal" | "abnormal" | "critical" };

const vitals: WaitingRow["vitals"][] = ["pending", "pending", "abnormal", "pending", "normal", "critical", "pending", "normal"];
const waitingPatients: WaitingRow[] = todaysVisits
  .filter((v) => ["checked_in", "booked", "emergency"].includes(v.status))
  .map((v, i) => ({ ...v, waitingMin: 4 + i * 5, vitals: vitals[i % vitals.length] }));

const columns: DataTableColumn<WaitingRow>[] = [
  { key: "serial", header: "#", className: "w-14", cell: (v) => <span className="text-base font-semibold text-heading tabular-nums">{v.serial}</span> },
  {
    key: "patient",
    header: "Patient",
    cell: (v) => (
      <div>
        <p className="font-medium text-heading">{v.patientName}</p>
        <p className="text-xs text-muted-foreground">
          {v.age} y · for {v.doctor}
        </p>
      </div>
    ),
  },
  { key: "wait", header: "Waiting", className: "hidden sm:table-cell tabular-nums", cell: (v) => `${v.waitingMin} min` },
  { key: "vitals", header: "Vitals", cell: (v) => <StatusBadge status={v.vitals} /> },
  {
    key: "action",
    header: <span className="sr-only">Action</span>,
    className: "text-right",
    cell: (v) =>
      v.vitals === "pending" ? (
        <Button size="sm" onClick={() => toast.info("The vitals form arrives in Phase 4.")}>
          <HeartPulse /> Record vitals
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => toast.info("Viewing vitals arrives in Phase 4.")}>
          View
        </Button>
      ),
  },
];

export function NurseDashboard() {
  const pending = waitingPatients.filter((p) => p.vitals === "pending").length;
  return (
    <div className="space-y-6">
      <DashboardIntro description="Patients waiting for vitals. Abnormal readings are flagged for the doctor automatically." />
      <SampleDataNote phase={4} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Waiting for vitals" value={pending} icon={Clock} />
        <StatCard label="Vitals recorded today" value={23} icon={HeartPulse} trend={{ value: "4", direction: "up", label: "vs yesterday" }} />
        <StatCard label="Abnormal readings" value={3} icon={AlertTriangle} tone="danger" hint="Doctors notified" />
        <StatCard label="Avg. wait before vitals" value="11 min" icon={Activity} />
      </div>

      <DataTable
        data={waitingPatients}
        columns={columns}
        getRowId={(v) => v.id}
        searchText={(v) => `${v.patientName} ${v.patientCode}`}
        searchPlaceholder="Search waiting patients"
        rowClassName={(v) => (v.vitals === "critical" ? "bg-status-danger-bg/60" : undefined)}
      />
    </div>
  );
}
