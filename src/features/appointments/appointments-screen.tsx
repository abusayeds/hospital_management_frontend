"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, CalendarSync, Footprints, LogIn, MoreHorizontal, Printer, UserX, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { AppointmentStatus, AppointmentView, PRIORITY_LABEL, SOURCE_LABEL, time12, todayDhaka } from "@/lib/appointments";
import { useAuth } from "@/lib/auth";
import { DoctorSummary } from "@/lib/master-data";
import { formatPoisha } from "@/lib/money";
import { formatPhone } from "@/lib/patients";
import { useLiveEvents } from "@/lib/socket";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { CancelDialog, RescheduleDialog, WalkInDialog } from "./appointment-dialogs";
import { BookingStepper } from "./booking-stepper";

const LIVE_EVENTS = ["appointment:updated"];
const PAGE_SIZE = 25;

export function AppointmentsScreen() {
  return (
    <RequirePermission permission="appointment:read">
      <AppointmentsContent />
    </RequirePermission>
  );
}

function AppointmentsContent() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [date, setDate] = useState(todayDhaka());
  const [doctorId, setDoctorId] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [cancelling, setCancelling] = useState<AppointmentView | null>(null);
  const [rescheduling, setRescheduling] = useState<AppointmentView | null>(null);
  const [noShow, setNoShow] = useState<AppointmentView | null>(null);
  const debouncedQ = useDebouncedValue(q);
  const canUpdate = can("appointment:update_status");

  const params = new URLSearchParams({ date, page: String(page), limit: String(PAGE_SIZE) });
  if (doctorId) params.set("doctorId", doctorId);
  if (status) params.set("status", status);
  if (debouncedQ.trim()) params.set("q", debouncedQ.trim());

  const doctors = useQuery({ queryKey: ["doctors", "all-active"], queryFn: () => apiFetchPage<DoctorSummary>("/doctors?limit=100") });
  const list = useQuery({
    queryKey: ["appointments", params.toString()],
    queryFn: () => apiFetchPage<AppointmentView>(`/appointments?${params}`),
    placeholderData: keepPreviousData,
  });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["appointments"] }), [queryClient]);
  useLiveEvents(LIVE_EVENTS, refresh);

  const act = useMutation({
    mutationFn: ({ a, action }: { a: AppointmentView; action: "check-in" | "no-show" }) => apiFetch<AppointmentView>(`/appointments/${a.id}/${action}`, { method: "POST", body: {} }),
    onSuccess: (a, { action }) => {
      toast.success(action === "check-in" ? `Serial ${a.serialNo} checked in — waiting for ${a.doctor.displayName}` : `Serial ${a.serialNo} marked as no-show`);
      refresh();
    },
  });

  const isToday = date === todayDhaka();

  const columns: DataTableColumn<AppointmentView>[] = [
    { key: "serial", header: "#", className: "w-14", cell: (a) => <span className="text-lg font-bold text-heading tabular-nums">{a.serialNo}</span> },
    { key: "time", header: "Time", className: "tabular-nums whitespace-nowrap", cell: (a) => time12(a.slotTime) },
    {
      key: "patient",
      header: "Patient",
      cell: (a) => (
        <Link href={`/reception/patients/${a.patient.id}`} className="group block">
          <p className="font-semibold text-heading group-hover:underline">
            {a.patient.name}
            {a.priority !== "normal" && (
              <StatusBadge tone={a.priority === "emergency" ? "danger" : "waiting"} className="ml-2 align-middle">
                {PRIORITY_LABEL[a.priority].label}
              </StatusBadge>
            )}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {a.patient.patientCode} · {formatPhone(a.patient.phone)}
          </p>
        </Link>
      ),
    },
    {
      key: "doctor",
      header: "Doctor",
      className: "hidden lg:table-cell",
      cell: (a) => (
        <div>
          <p>{a.doctor.displayName}</p>
          <p className="text-xs text-muted-foreground">
            {a.department.name} · Room {a.doctor.roomNo ?? "—"}
          </p>
        </div>
      ),
    },
    {
      key: "fee",
      header: "Fee",
      className: "hidden xl:table-cell tabular-nums",
      cell: (a) => (
        <span>
          {formatPoisha(a.fee)}
          {a.type === "follow_up" && <span className="block text-xs text-muted-foreground">Follow-up</span>}
        </span>
      ),
    },
    { key: "source", header: "Via", className: "hidden xl:table-cell text-xs", cell: (a) => SOURCE_LABEL[a.source] },
    {
      key: "status",
      header: "Status",
      cell: (a) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge status={a.status} />
          {a.doctorAbsent && a.status === "booked" && <StatusBadge tone="danger">Doctor absent</StatusBadge>}
          {a.confirmedByPatient && a.status === "booked" && <StatusBadge tone="success">Confirmed by patient</StatusBadge>}
        </div>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (a) => (
        <div className="flex items-center justify-end gap-1.5">
          {canUpdate && a.status === "booked" && isToday && (
            <Button size="sm" onClick={() => act.mutate({ a, action: "check-in" })} disabled={act.isPending}>
              <LogIn /> Check in
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`More actions for serial ${a.serialNo}`} />}>
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem className="h-9" render={<a href={`/print/token/${a.id}`} target="_blank" rel="noopener" />}>
                <Printer className="size-4" /> Print token
              </DropdownMenuItem>
              {canUpdate && ["booked", "checked_in"].includes(a.status) && (
                <>
                  <DropdownMenuItem className="h-9" onClick={() => setRescheduling(a)}>
                    <CalendarSync className="size-4" /> Reschedule
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {a.status === "booked" && a.date <= todayDhaka() && (
                    <DropdownMenuItem className="h-9" onClick={() => setNoShow(a)}>
                      <UserX className="size-4" /> Mark no-show
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="h-9" variant="destructive" onClick={() => setCancelling(a)}>
                    <XCircle className="size-4" /> Cancel
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const statusOptions: { value: AppointmentStatus | ""; label: string }[] = [
    { value: "", label: "All statuses" },
    { value: "booked", label: "Not arrived" },
    { value: "checked_in", label: "Waiting" },
    { value: "in_consultation", label: "With doctor" },
    { value: "completed", label: "Completed" },
    { value: "no_show", label: "No-show" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments · অ্যাপয়েন্টমেন্ট"
        description="Check patients in as they arrive. Every change appears instantly on the doctor's screen and the waiting-room TV."
        actions={
          can("appointment:create") && (
            <>
              <Button size="xl" variant="outline" onClick={() => setWalkInOpen(true)}>
                <Footprints /> Walk-in
              </Button>
              <Button size="xl" onClick={() => setBookingOpen(true)}>
                <CalendarPlus /> New appointment
              </Button>
            </>
          )
        }
      />

      <DataTable
        data={list.data?.items ?? []}
        columns={columns}
        getRowId={(a) => a.id}
        isLoading={list.isPending}
        searchPlaceholder="Name, code or phone"
        rowClassName={(a) => (a.doctorAbsent && a.status === "booked" ? "bg-status-danger-bg/60" : a.status === "in_consultation" ? "bg-status-active-bg/50" : a.status === "cancelled" || a.status === "no_show" ? "opacity-60" : undefined)}
        server={{
          query: q,
          onQueryChange: (v) => {
            setQ(v);
            setPage(1);
          },
          page,
          pageSize: PAGE_SIZE,
          total: list.data?.pagination.total ?? 0,
          totalPages: list.data?.pagination.totalPages ?? 1,
          onPageChange: setPage,
        }}
        filters={
          <>
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value || todayDhaka());
                setPage(1);
              }}
              aria-label="Date"
              className="w-auto"
            />
            <NativeSelect
              value={doctorId}
              onChange={(e) => {
                setDoctorId(e.target.value);
                setPage(1);
              }}
              aria-label="Doctor"
              className="w-auto max-w-56"
            >
              <option value="">All doctors</option>
              {doctors.data?.items.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.displayName}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Status"
              className="w-auto"
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </>
        }
        emptyTitle={isToday ? "No appointments today yet" : "No appointments on this day"}
        emptyDescription="Book one with New appointment, or pick another date."
      />

      <BookingStepper open={bookingOpen} onOpenChange={setBookingOpen} />
      <WalkInDialog open={walkInOpen} onOpenChange={setWalkInOpen} />
      <CancelDialog appointment={cancelling} onClose={() => setCancelling(null)} />
      <RescheduleDialog appointment={rescheduling} onClose={() => setRescheduling(null)} />
      <ConfirmDialog
        open={Boolean(noShow)}
        onOpenChange={(o) => !o && setNoShow(null)}
        tone="danger"
        title={`Mark serial ${noShow?.serialNo} as no-show?`}
        description={`${noShow?.patient.name} did not come. The slot is released.`}
        confirmLabel="Mark no-show"
        onConfirm={async () => {
          if (noShow) await act.mutateAsync({ a: noShow, action: "no-show" });
        }}
      />
    </div>
  );
}
