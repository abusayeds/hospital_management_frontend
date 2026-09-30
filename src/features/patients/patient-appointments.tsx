"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiFetchPage } from "@/lib/api";
import { AppointmentView, shortDate, SOURCE_LABEL, time12 } from "@/lib/appointments";
import { formatPoisha } from "@/lib/money";
import { useLiveEvents } from "@/lib/socket";

const LIVE_EVENTS = ["appointment:updated"];

const columns: DataTableColumn<AppointmentView>[] = [
  { key: "date", header: "Date", cell: (a) => <span className="font-medium text-heading">{shortDate(a.date)}</span> },
  { key: "time", header: "Time", className: "tabular-nums", cell: (a) => `${time12(a.slotTime)} · #${a.serialNo}` },
  {
    key: "doctor",
    header: "Doctor",
    cell: (a) => (
      <div>
        <p>{a.doctor.displayName}</p>
        <p className="text-xs text-muted-foreground">{a.department.name}</p>
      </div>
    ),
  },
  { key: "type", header: "Type", className: "hidden md:table-cell", cell: (a) => (a.type === "follow_up" ? "Follow-up" : "New") },
  { key: "fee", header: "Fee", className: "hidden md:table-cell tabular-nums", cell: (a) => formatPoisha(a.fee) },
  { key: "source", header: "Booked via", className: "hidden lg:table-cell text-xs", cell: (a) => SOURCE_LABEL[a.source] },
  { key: "status", header: "Status", cell: (a) => <StatusBadge status={a.status} /> },
];

/** The patient's appointment history, newest first (live: refreshes when any appointment changes) */
export function PatientAppointments({ patientId }: { patientId: string }) {
  const history = useQuery({
    queryKey: ["patient-appointments", patientId],
    queryFn: () => apiFetchPage<AppointmentView>(`/patients/${patientId}/appointments?limit=100`),
  });
  const queryClient = useQueryClient();
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["patient-appointments", patientId] }), [queryClient, patientId]);
  useLiveEvents(LIVE_EVENTS, refresh);

  return (
    <DataTable
      data={history.data?.items ?? []}
      columns={columns}
      getRowId={(a) => a.id}
      isLoading={history.isPending}
      emptyTitle="No appointments yet"
      emptyDescription="Appointments booked for this patient appear here."
      pageSize={10}
    />
  );
}
