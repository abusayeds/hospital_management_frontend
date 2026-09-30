"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Footprints, Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, apiFetchPage, getErrorMessage } from "@/lib/api";
import { AppointmentView, Priority, PRIORITY_LABEL, shortDate, time12, todayDhaka } from "@/lib/appointments";
import { DoctorSummary } from "@/lib/master-data";
import { formatPoisha } from "@/lib/money";
import { ageGender, Patient } from "@/lib/patients";
import { cn } from "@/lib/utils";
import { FormError } from "../master-data/form-bits";
import { NewPatientForm } from "../patients/new-patient-form";
import { PatientSearch } from "../patients/patient-search";
import { BookedView } from "./booking-stepper";

type Slot = { time: string; sessionKey: string; sessionLabel: string; available: boolean; reason?: string };

// ---------------------------------------------------------------- cancel (with reason)

const CANCEL_REASONS = ["Patient called to cancel", "Doctor unavailable", "Booked by mistake", "Patient did not want to wait"];

export function CancelDialog({ appointment, onClose }: { appointment: AppointmentView | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const cancel = useMutation({
    mutationFn: () => apiFetch<AppointmentView>(`/appointments/${appointment!.id}/cancel`, { method: "POST", body: { reason: reason.trim() } }),
    meta: { silent: true },
    onSuccess: (a) => {
      toast.success(`Serial ${a.serialNo} cancelled`);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setReason("");
      onClose();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });
  return (
    <Dialog open={Boolean(appointment)} onOpenChange={(o) => !o && !cancel.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">Cancel serial {appointment?.serialNo}?</DialogTitle>
          <DialogDescription>
            {appointment?.patient.name} · {appointment?.doctor.displayName} at {appointment && time12(appointment.slotTime)}. The slot becomes free for others.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {CANCEL_REASONS.map((r) => (
            <button key={r} type="button" onClick={() => setReason(r)} className={cn("rounded-full border px-3 py-1.5 text-sm", reason === r ? "border-primary bg-accent text-primary" : "hover:border-primary")}>
              {r}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cancel-reason">Reason</Label>
          <Input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <FormError message={error} />
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={onClose} disabled={cancel.isPending}>
            Keep appointment
          </Button>
          <Button size="lg" className="bg-destructive text-white hover:bg-destructive/90" disabled={reason.trim().length < 2 || cancel.isPending} onClick={() => cancel.mutate()}>
            {cancel.isPending && <Loader2 className="animate-spin" />} Cancel appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- reschedule

type DayAvailability = { date: string; onLeave: boolean; sits: boolean; availableCount: number };

export function RescheduleDialog({ appointment, onClose }: { appointment: AppointmentView | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(appointment)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">{appointment && <RescheduleBody key={appointment.id} appointment={appointment} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}

function RescheduleBody({ appointment: a, onClose }: { appointment: AppointmentView; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState<string>();
  const calendar = useQuery({ queryKey: ["availability", a.doctor.id], queryFn: () => apiFetch<DayAvailability[]>(`/doctors/${a.doctor.id}/availability?days=14`) });
  const slots = useQuery({
    queryKey: ["slots", a.doctor.id, date],
    queryFn: () => apiFetch<{ slots: Slot[] }>(`/doctors/${a.doctor.id}/slots?date=${date}`),
    enabled: Boolean(date),
  });
  const move = useMutation({
    mutationFn: () => apiFetch<AppointmentView>(`/appointments/${a.id}/reschedule`, { method: "POST", body: { date, slotTime: time } }),
    meta: { silent: true },
    onSuccess: (n) => {
      toast.success(`Moved to ${shortDate(n.date)} ${time12(n.slotTime)} · new serial ${n.serialNo}`);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      onClose();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-heading">Reschedule serial {a.serialNo}</DialogTitle>
        <DialogDescription>
          {a.patient.name} with {a.doctor.displayName}. The old appointment is cancelled and linked to the new one in a single step.
        </DialogDescription>
      </DialogHeader>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {calendar.data?.map((d) => (
          <button
            key={d.date}
            type="button"
            disabled={d.availableCount === 0}
            onClick={() => {
              setDate(d.date);
              setTime("");
            }}
            className={cn(
              "flex w-18 shrink-0 flex-col items-center rounded-lg border px-2 py-1.5 text-center text-xs",
              date === d.date ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary",
              d.availableCount === 0 && "cursor-not-allowed opacity-40",
            )}
          >
            <span>{d.date === todayDhaka() ? "Today" : shortDate(d.date).split(" ")[0]}</span>
            <span className="text-base font-bold">{Number(d.date.slice(8))}</span>
          </button>
        ))}
      </div>
      {date && (
        <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
          {slots.data?.slots.map((s) => (
            <button
              key={s.time}
              type="button"
              disabled={!s.available}
              onClick={() => setTime(s.time)}
              className={cn(
                "h-10 min-w-20 rounded-lg border px-2 text-sm tabular-nums",
                time === s.time ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary",
                !s.available && "cursor-not-allowed bg-muted text-muted-foreground line-through opacity-60",
              )}
            >
              {time12(s.time)}
            </button>
          ))}
        </div>
      )}
      <FormError message={error} />
      <DialogFooter>
        <Button variant="outline" size="lg" onClick={onClose}>
          Close
        </Button>
        <Button size="lg" disabled={!date || !time || move.isPending} onClick={() => move.mutate()}>
          {move.isPending && <Loader2 className="animate-spin" />} Move appointment
        </Button>
      </DialogFooter>
    </>
  );
}

// ---------------------------------------------------------------- walk-in (book today + check in, one click)

export function WalkInDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-3xl">{open && <WalkInBody onClose={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function WalkInBody({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [registering, setRegistering] = useState(false);
  const [priority, setPriority] = useState<Priority>("normal");
  const [error, setError] = useState<string>();
  const [booked, setBooked] = useState<AppointmentView | null>(null);
  const today = todayDhaka();
  const doctors = useQuery({ queryKey: ["doctors", "today", today], queryFn: () => apiFetchPage<DoctorSummary>(`/doctors?availableOn=${today}&limit=100`) });

  const walkIn = useMutation({
    mutationFn: (doctorId: string) =>
      apiFetch<AppointmentView>("/appointments", { method: "POST", body: { patientId: patient!.id, doctorId, date: today, source: "walk_in", priority } }),
    meta: { silent: true },
    onSuccess: (a) => {
      setBooked(a);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  if (booked) return <BookedView appointment={booked} onClose={onClose} />;

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-heading">
          <Footprints className="size-5 text-primary" /> Walk-in · সরাসরি রোগী
        </DialogTitle>
        <DialogDescription>Books the next free slot today with the chosen doctor and checks the patient in immediately.</DialogDescription>
      </DialogHeader>

      {!patient ? (
        registering ? (
          <NewPatientForm compact onDone={setPatient} />
        ) : (
          <div className="space-y-3">
            <PatientSearch pageSize={5} onSelect={setPatient} emptyAction={() => <Button onClick={() => setRegistering(true)}>Register new patient</Button>} />
            <Button variant="outline" onClick={() => setRegistering(true)}>
              <UserPlus /> New patient
            </Button>
          </div>
        )
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/60 px-4 py-2.5 text-sm">
            <span className="font-semibold text-heading">{patient.name}</span>
            <span className="font-mono text-muted-foreground">{patient.patientCode}</span>
            <span className="text-muted-foreground">{ageGender(patient)}</span>
            <button className="ml-auto font-medium text-primary hover:underline" onClick={() => setPatient(null)}>
              Change
            </button>
          </div>
          <div className="flex gap-2">
            {(["normal", "elderly", "emergency"] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={priority === p}
                onClick={() => setPriority(p)}
                className={cn("h-10 flex-1 rounded-lg border text-sm font-medium", priority === p ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary")}
              >
                {PRIORITY_LABEL[p].label}
              </button>
            ))}
          </div>
          <p className="text-sm font-medium text-heading">Choose the doctor (sitting today):</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {doctors.data?.items.map((d) => (
              <Button key={d.id} variant="outline" size="xl" className="h-auto justify-start py-3 text-left" disabled={walkIn.isPending} onClick={() => walkIn.mutate(d.id)}>
                <span className="flex-1">
                  <span className="block font-semibold">{d.displayName}</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {d.department.name} · Room {d.roomNo ?? "—"} · {formatPoisha(d.consultationFee)}
                  </span>
                </span>
              </Button>
            ))}
            {doctors.data?.items.length === 0 && <p className="text-sm text-muted-foreground">No doctor sits today.</p>}
          </div>
          <FormError message={error} />
        </>
      )}
    </div>
  );
}
