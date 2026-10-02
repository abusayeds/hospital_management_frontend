"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarPlus, CheckCircle2, Clock, Loader2, MapPin, Search, Stethoscope, X } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, getErrorMessage } from "@/lib/api";
import { formatPoisha } from "@/lib/money";
import { AvailabilityDay, dayLabel, PortalAppointment, PortalDoctor, PortalSlots, time12 } from "@/lib/portal";
import { cn } from "@/lib/utils";
import { usePortalMe } from "./portal-home";

const noop = () => () => {};
const useBookParam = () =>
  useSyncExternalStore(
    noop,
    () => new URLSearchParams(window.location.search).get("book") === "1",
    () => false,
  );

/** Patient → Appointments: upcoming and past visits, cancel within the cut-off, and book a new one */
export function PortalAppointments() {
  const queryClient = useQueryClient();
  const me = usePortalMe();
  const openFromLink = useBookParam();
  const [booking, setBooking] = useState<boolean | null>(null);
  const [cancelling, setCancelling] = useState<PortalAppointment | null>(null);
  const list = useQuery({
    queryKey: ["portal", "appointments"],
    queryFn: () => apiFetch<{ upcoming: PortalAppointment[]; past: PortalAppointment[] }>("/portal/appointments"),
  });
  const isBooking = booking ?? openFromLink;
  const family = (me.data?.patients.length ?? 0) > 1;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-heading">Appointments</h1>
          <p className="font-bangla text-sm text-muted-foreground">আপনার সিরিয়াল</p>
        </div>
        <Button size="lg" onClick={() => setBooking(true)}>
          <CalendarPlus /> Book
        </Button>
      </div>

      {list.isPending ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-heading">Upcoming</h2>
            {!list.data?.upcoming.length ? (
              <div className="rounded-2xl border border-dashed bg-card">
                <EmptyState icon={CalendarPlus} title="No upcoming appointment" description="Book one in a minute — choose the doctor, the day and the time." />
              </div>
            ) : (
              <ul className="space-y-3">
                {list.data.upcoming.map((a) => (
                  <li key={a.id} className="rounded-2xl border bg-card p-4 shadow-card">
                    <div className="flex items-start gap-4">
                      <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-accent text-primary">
                        <span className="text-[10px] font-semibold uppercase">Serial</span>
                        <span className="text-2xl leading-none font-bold tabular-nums">{a.serialNo}</span>
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-semibold text-heading">{a.doctor}</p>
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="size-4" /> {dayLabel(a.date)} · {time12(a.slotTime)}
                        </p>
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="size-4" /> {a.roomNo ? `Room ${a.roomNo} · ` : ""}
                          {a.department}
                        </p>
                        {family && <p className="text-xs text-muted-foreground">For {a.patient.name}</p>}
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
                      <span>Please come 15 minutes early and show your serial at the reception.</span>
                      {a.canCancel && (
                        <Button size="sm" variant="ghost" className="shrink-0 text-status-danger-fg" onClick={() => setCancelling(a)}>
                          <X /> Cancel
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!!list.data?.past.length && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-heading">Earlier</h2>
              <ul className="divide-y rounded-2xl border bg-card shadow-card">
                {list.data.past.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-heading">{a.doctor}</p>
                      <p className="text-xs text-muted-foreground">
                        {dayLabel(a.date)} · {time12(a.slotTime)}
                        {family && ` · ${a.patient.name}`}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {me.data && (
        <BookingDialog
          open={isBooking}
          onOpenChange={(o) => {
            setBooking(o);
            if (!o && openFromLink) window.history.replaceState(null, "", "/patient/appointments");
          }}
          patients={me.data.patients}
          onBooked={() => queryClient.invalidateQueries({ queryKey: ["portal"] })}
        />
      )}
      <CancelDialog
        appointment={cancelling}
        cutoff={me.data?.cancellationCutoffMinutes ?? 60}
        onClose={() => setCancelling(null)}
        onDone={() => queryClient.invalidateQueries({ queryKey: ["portal"] })}
      />
    </div>
  );
}

function CancelDialog({
  appointment: a,
  cutoff,
  onClose,
  onDone,
}: {
  appointment: PortalAppointment | null;
  cutoff: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const cancel = useMutation({
    mutationFn: () => apiFetch(`/portal/appointments/${a!.id}/cancel`, { method: "POST", body: { reason: reason || "Not needed any more" } }),
    meta: { silent: true },
    onSuccess: () => (toast.success("Appointment cancelled"), onDone(), onClose(), setReason("")),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  return (
    <Dialog open={Boolean(a)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel this appointment?</DialogTitle>
          <DialogDescription>
            {a && `${a.doctor} · ${dayLabel(a.date)} at ${time12(a.slotTime)}. `}
            Appointments can be cancelled up to {cutoff} minutes before the time.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {["Feeling better", "Cannot come that day", "Booked by mistake"].map((r) => (
            <Button key={r} size="sm" variant={reason === r ? "default" : "outline"} onClick={() => setReason(r)}>
              {r}
            </Button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep it
          </Button>
          <Button variant="destructive" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
            {cancel.isPending && <Loader2 className="animate-spin" />} Cancel appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Step = "who" | "doctor" | "day" | "time" | "confirm" | "done";

function BookingDialog({
  open,
  onOpenChange,
  patients,
  onBooked,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  patients: { id: string; name: string; age: number }[];
  onBooked: () => void;
}) {
  const [patientId, setPatientId] = useState<string | null>(null);
  const [doctor, setDoctor] = useState<PortalDoctor | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [done, setDone] = useState<{ serialNo: number; date: string; slotTime: string; doctor: string } | null>(null);
  const who = patientId ?? (patients.length === 1 ? patients[0].id : null);
  const step: Step = done ? "done" : !who ? "who" : !doctor ? "doctor" : !date ? "day" : !slot ? "time" : "confirm";

  const doctors = useQuery({
    queryKey: ["portal", "doctors"],
    queryFn: () => apiFetch<PortalDoctor[]>("/portal/doctors"),
    enabled: open,
    staleTime: 10 * 60_000,
  });
  const days = useQuery({
    queryKey: ["portal", "availability", doctor?.id],
    queryFn: () => apiFetch<AvailabilityDay[]>(`/portal/doctors/${doctor!.id}/availability`),
    enabled: Boolean(open && doctor),
  });
  const slots = useQuery({
    queryKey: ["portal", "slots", doctor?.id, date],
    queryFn: () => apiFetch<PortalSlots>(`/portal/doctors/${doctor!.id}/slots?date=${date}`),
    enabled: Boolean(open && doctor && date),
  });
  const fee = useQuery({
    queryKey: ["portal", "quote", who, doctor?.id, date],
    queryFn: () => apiFetch<{ type: string; fee: number }>(`/portal/quote?patientId=${who}&doctorId=${doctor!.id}&date=${date}`),
    enabled: step === "confirm",
  });
  const book = useMutation({
    mutationFn: () =>
      apiFetch<{ serialNo: number; date: string; slotTime: string; doctor: string }>("/portal/appointments", {
        method: "POST",
        body: { patientId: who, doctorId: doctor!.id, date, slotTime: slot },
      }),
    meta: { silent: true },
    onSuccess: (r) => (setDone(r), onBooked()),
    onError: (e) => {
      toast.error(getErrorMessage(e));
      setSlot(null);
      slots.refetch();
    },
  });

  const reset = () => {
    setPatientId(null);
    setDoctor(null);
    setDate(null);
    setSlot(null);
    setQ("");
    setDone(null);
  };
  const back = () =>
    step === "confirm"
      ? setSlot(null)
      : step === "time"
        ? setDate(null)
        : step === "day"
          ? setDoctor(null)
          : step === "doctor" && patients.length > 1
            ? setPatientId(null)
            : undefined;
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (doctors.data ?? []).filter((d) => !t || `${d.name} ${d.department} ${d.specialization}`.toLowerCase().includes(t));
  }, [doctors.data, q]);
  const patientName = patients.find((p) => p.id === who)?.name;

  return (
    <Dialog open={open} onOpenChange={(o) => (!o && reset(), onOpenChange(o))}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== "done" && step !== "who" && !(step === "doctor" && patients.length === 1) && (
              <button type="button" onClick={back} className="rounded-md p-1 hover:bg-muted" aria-label="Back">
                <ArrowLeft className="size-4" />
              </button>
            )}
            {step === "done" ? "Booked!" : "Book an appointment"}
          </DialogTitle>
          <DialogDescription>
            {step === "who" && "Who is the appointment for?"}
            {step === "doctor" && "Choose a doctor."}
            {step === "day" && `${doctor?.name} — choose a day.`}
            {step === "time" && `${doctor?.name} · ${date && dayLabel(date)} — choose a time.`}
            {step === "confirm" && "Check and confirm."}
            {step === "done" && "You will get a WhatsApp confirmation."}
          </DialogDescription>
        </DialogHeader>

        {step === "who" && (
          <div className="grid gap-2">
            {patients.map((p) => (
              <button key={p.id} type="button" onClick={() => setPatientId(p.id)} className="rounded-xl border p-4 text-left hover:border-primary">
                <p className="font-semibold text-heading">{p.name}</p>
                <p className="text-sm text-muted-foreground">{p.age} years</p>
              </button>
            ))}
          </div>
        )}

        {step === "doctor" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Doctor or department (e.g. Medicine)" className="h-11 pl-9" />
            </div>
            {doctors.isPending ? (
              <Skeleton className="h-40" />
            ) : (
              <ul className="max-h-[50dvh] space-y-2 overflow-y-auto">
                {filtered.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setDoctor(d)}
                      className="flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:border-primary"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                        <Stethoscope className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-heading">{d.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {d.department}
                          {d.specialization ? ` · ${d.specialization}` : ""}
                          {d.degrees ? ` · ${d.degrees}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">{formatPoisha(d.consultationFee)}</span>
                    </button>
                  </li>
                ))}
                {!filtered.length && <p className="py-6 text-center text-sm text-muted-foreground">No doctor matches.</p>}
              </ul>
            )}
          </div>
        )}

        {step === "day" &&
          (days.isPending ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {(days.data ?? [])
                .filter((d) => d.sits)
                .map((d) => {
                  const free = !d.onLeave && d.availableCount > 0;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      disabled={!free}
                      onClick={() => setDate(d.date)}
                      className={cn("rounded-xl border p-3 text-left", free ? "hover:border-primary" : "cursor-not-allowed opacity-50")}
                    >
                      <span className="block text-sm font-semibold text-heading">{dayLabel(d.date)}</span>
                      <span className={cn("block text-xs", free ? "text-status-success-fg" : "text-muted-foreground")}>
                        {d.onLeave ? "On leave" : free ? `${d.availableCount} free` : "Full"}
                      </span>
                    </button>
                  );
                })}
              {!(days.data ?? []).some((d) => d.sits) && (
                <p className="col-span-full py-6 text-center text-sm text-muted-foreground">No sessions in the next two weeks.</p>
              )}
            </div>
          ))}

        {step === "time" &&
          (slots.isPending ? (
            <Skeleton className="h-40" />
          ) : !slots.data?.slots.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No free time left on this day. Please choose another day.</p>
          ) : (
            <div className="space-y-3">
              {[...new Set(slots.data.slots.map((s) => s.sessionLabel))].map((label) => (
                <div key={label}>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots
                      .data!.slots.filter((s) => s.sessionLabel === label)
                      .map((s) => (
                        <Button key={s.time} variant="outline" onClick={() => setSlot(s.time)} className="tabular-nums">
                          {time12(s.time)}
                        </Button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ))}

        {step === "confirm" && (
          <div className="space-y-2 rounded-xl border p-4 text-sm">
            <Row label="Patient" value={patientName ?? ""} />
            <Row label="Doctor" value={`${doctor?.name} · ${doctor?.department}`} />
            <Row label="Time" value={`${date && dayLabel(date)} · ${slot && time12(slot)}`} />
            <Row
              label="Fee (pay at the hospital)"
              value={fee.data ? `${formatPoisha(fee.data.fee)}${fee.data.type === "follow_up" ? " · follow-up" : ""}` : "…"}
            />
          </div>
        )}

        {step === "done" && done && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="size-12 text-status-success-fg" />
            <p className="text-lg font-semibold text-heading">Serial {done.serialNo}</p>
            <p className="text-sm text-muted-foreground">
              {done.doctor} · {dayLabel(done.date)} · {time12(done.slotTime)}
            </p>
            <p className="font-bangla text-sm">নির্ধারিত সময়ের ১৫ মিনিট আগে এসে রিসেপশনে জানাবেন।</p>
          </div>
        )}

        <DialogFooter>
          {step === "confirm" && (
            <Button size="lg" className="w-full" disabled={book.isPending} onClick={() => book.mutate()}>
              {book.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Confirm booking
            </Button>
          )}
          {step === "done" && (
            <Button size="lg" className="w-full" onClick={() => (reset(), onOpenChange(false))}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-heading">{value}</span>
    </p>
  );
}
