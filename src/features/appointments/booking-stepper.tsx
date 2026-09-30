"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Loader2, Printer, UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiFetch, apiFetchPage, getErrorMessage } from "@/lib/api";
import { AppointmentView, Priority, PRIORITY_LABEL, shortDate, time12, todayDhaka } from "@/lib/appointments";
import { Department, departmentIcon, DoctorSummary } from "@/lib/master-data";
import { formatPoisha } from "@/lib/money";
import { ageGender, formatPhone, Patient } from "@/lib/patients";
import { cn } from "@/lib/utils";
import { DoctorAvatar } from "../master-data/doctors-screen";
import { NewPatientForm } from "../patients/new-patient-form";
import { PatientSearch } from "../patients/patient-search";

type DayAvailability = { date: string; onLeave: boolean; leaveReason?: string; sits: boolean; availableCount: number; nextAvailable: string | null };
type Slot = { time: string; sessionKey: string; sessionLabel: string; available: boolean; reason?: "booked" | "past" | "session_full" };
type DaySlots = { date: string; onLeave: boolean; sessions: { sessionKey: string; label: string; startTime: string; endTime: string; remaining: number; isFull: boolean }[]; slots: Slot[] };

const STEPS = ["Patient", "Doctor", "Date & time", "Confirm"];
const REASON = { booked: "Booked", past: "Passed", session_full: "Session full" };

const nextAvailableText = (days?: DayAvailability[]) => {
  const d = days?.find((x) => x.availableCount > 0);
  if (!d) return "No free slot in the next 2 weeks";
  return `${d.date === todayDhaka() ? "Today" : shortDate(d.date)} · ${time12(d.nextAvailable!)}`;
};

/**
 * New appointment in four quick steps. Every choice is validated by the same
 * booking service the API uses, so what staff see here is what the server allows.
 */
export function BookingStepper({ open, onOpenChange, initialPatient }: { open: boolean; onOpenChange: (o: boolean) => void; initialPatient?: Patient | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-4xl">
        {open && <Stepper key={initialPatient?.id ?? "new"} onClose={() => onOpenChange(false)} initialPatient={initialPatient ?? null} />}
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ onClose, initialPatient }: { onClose: () => void; initialPatient: Patient | null }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(initialPatient ? 1 : 0);
  const [patient, setPatient] = useState<Patient | null>(initialPatient);
  const [registering, setRegistering] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState("");
  const [doctor, setDoctor] = useState<DoctorSummary | null>(null);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [priority, setPriority] = useState<Priority>("normal");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<AppointmentView | null>(null);

  const departments = useQuery({ queryKey: ["departments", "active"], queryFn: () => apiFetch<Department[]>("/departments?status=active") });
  const doctors = useQuery({
    queryKey: ["doctors", "booking", departmentId],
    queryFn: () => apiFetchPage<DoctorSummary>(`/doctors?departmentId=${departmentId}&limit=50`),
    enabled: Boolean(departmentId),
  });
  // Next free slot of each doctor in the department (a department has only a few doctors)
  const availability = useQueries({
    queries: (doctors.data?.items ?? []).map((d) => ({
      queryKey: ["availability", d.id],
      queryFn: () => apiFetch<DayAvailability[]>(`/doctors/${d.id}/availability?days=14`),
      staleTime: 30_000,
    })),
  });
  const calendar = doctor ? availability[(doctors.data?.items ?? []).findIndex((d) => d.id === doctor.id)]?.data : undefined;
  const slots = useQuery({
    queryKey: ["slots", doctor?.id, date],
    queryFn: () => apiFetch<DaySlots>(`/doctors/${doctor!.id}/slots?date=${date}`),
    enabled: Boolean(doctor && date),
  });

  const book = useMutation({
    mutationFn: (checkInNow: boolean) =>
      apiFetch<AppointmentView>("/appointments", {
        method: "POST",
        body: { patientId: patient!.id, doctorId: doctor!.id, date, slotTime: slot!.time, priority, notes: notes.trim() || undefined, checkInNow },
      }),
    meta: { silent: true },
    onSuccess: (a) => {
      setBooked(a);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      // The slot was taken meanwhile: refresh the grid and send staff back to pick again
      if (err instanceof ApiError && err.status === 409) {
        queryClient.invalidateQueries({ queryKey: ["slots", doctor?.id, date] });
        setSlot(null);
        setStep(2);
      }
    },
  });

  if (booked) return <BookedView appointment={booked} onClose={onClose} />;

  const chooseDoctor = (d: DoctorSummary, days?: DayAvailability[]) => {
    setDoctor(d);
    const first = days?.find((x) => x.availableCount > 0)?.date ?? todayDhaka();
    setDate(first);
    setSlot(null);
    setStep(2);
  };

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-heading">New appointment · নতুন অ্যাপয়েন্টমেন্ট</DialogTitle>
        <DialogDescription className="sr-only">Book an appointment in four steps</DialogDescription>
      </DialogHeader>

      {/* Step indicator */}
      <ol className="flex items-center gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary/15 text-primary ring-2 ring-primary" : "bg-muted text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={cn("hidden text-sm sm:inline", i === step ? "font-semibold text-heading" : "text-muted-foreground")}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden />}
          </li>
        ))}
      </ol>

      {patient && step > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/60 px-4 py-2.5 text-sm">
          <span className="font-semibold text-heading">{patient.name}</span>
          <span className="font-mono text-muted-foreground">{patient.patientCode}</span>
          <span className="text-muted-foreground">
            {ageGender(patient)} · {formatPhone(patient.phone)}
          </span>
          {patient.allergies.length > 0 && (
            <span className="inline-flex items-center gap-1 text-status-danger-fg">
              <AlertTriangle className="size-3.5" /> {patient.allergies.join(", ")}
            </span>
          )}
          <button className="ml-auto text-sm font-medium text-primary hover:underline" onClick={() => setStep(0)}>
            Change
          </button>
        </div>
      )}

      {/* STEP 1 — patient */}
      {step === 0 &&
        (registering !== null ? (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => setRegistering(null)}>
              <ArrowLeft /> Back to search
            </Button>
            <NewPatientForm
              compact
              initialPhone={/^[\d\s+-]{5,}$/.test(registering) ? registering : ""}
              initialName={/^[\d\s+-]{5,}$/.test(registering) ? "" : registering}
              onDone={(p) => {
                setPatient(p);
                setRegistering(null);
                setStep(1);
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <PatientSearch
              pageSize={6}
              onSelect={(p) => {
                setPatient(p);
                setStep(1);
              }}
              emptyAction={(q) => (
                <Button size="lg" onClick={() => setRegistering(q)}>
                  <UserPlus /> Register new patient
                </Button>
              )}
            />
            <Button variant="outline" onClick={() => setRegistering("")}>
              <UserPlus /> New patient
            </Button>
          </div>
        ))}

      {/* STEP 2 — department → doctor */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {departments.data?.map((d) => {
              const Icon = departmentIcon(d.icon);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDepartmentId(d.id)}
                  aria-pressed={departmentId === d.id}
                  className={cn(
                    "flex min-h-16 items-center gap-2 rounded-xl border p-3 text-left transition-colors",
                    departmentId === d.id ? "border-primary bg-accent" : "bg-card hover:border-primary",
                  )}
                >
                  <Icon className="size-5 shrink-0 text-primary" />
                  <span className="leading-tight">
                    <span className="block text-sm font-semibold text-heading">{d.name}</span>
                    <span className="font-bangla block text-xs text-muted-foreground">{d.nameBn}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {departmentId && (
            <div className="grid gap-3 sm:grid-cols-2">
              {doctors.isPending && <p className="text-sm text-muted-foreground">Loading doctors…</p>}
              {doctors.data?.items.length === 0 && <p className="text-sm text-muted-foreground">No active doctors in this department.</p>}
              {doctors.data?.items.map((d, i) => {
                const days = availability[i]?.data;
                const hasSlot = days?.some((x) => x.availableCount > 0);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => chooseDoctor(d, days)}
                    className="flex items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-card transition-colors hover:border-primary"
                  >
                    <DoctorAvatar doctor={d} className="size-12 text-base" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-heading">{d.displayName}</span>
                      <span className="block truncate text-xs text-muted-foreground">{d.specialization ?? d.degrees}</span>
                      <span className="mt-1 flex flex-wrap gap-x-3 text-sm">
                        <span className="font-semibold text-heading">{formatPoisha(d.consultationFee)}</span>
                        <span className="text-muted-foreground">Room {d.roomNo ?? "—"}</span>
                      </span>
                      <span className={cn("mt-1 block text-xs font-medium", hasSlot ? "text-status-success-fg" : "text-muted-foreground")}>
                        {days ? `Next: ${nextAvailableText(days)}` : "Checking availability…"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STEP 3 — date strip + slots */}
      {step === 2 && doctor && (
        <div className="space-y-4">
          <p className="text-sm">
            <span className="font-semibold text-heading">{doctor.displayName}</span> · {doctor.department.name} · Room {doctor.roomNo ?? "—"}
            <button className="ml-3 font-medium text-primary hover:underline" onClick={() => setStep(1)}>
              Change doctor
            </button>
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Date">
            {(calendar ?? []).map((d) => {
              const disabled = d.availableCount === 0;
              return (
                <button
                  key={d.date}
                  type="button"
                  role="option"
                  aria-selected={date === d.date}
                  disabled={disabled}
                  onClick={() => {
                    setDate(d.date);
                    setSlot(null);
                  }}
                  title={d.onLeave ? `On leave${d.leaveReason ? `: ${d.leaveReason}` : ""}` : !d.sits ? "Does not sit" : disabled ? "Full" : `${d.availableCount} free`}
                  className={cn(
                    "flex w-20 shrink-0 flex-col items-center rounded-xl border px-2 py-2 text-center transition-colors",
                    date === d.date ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary",
                    disabled && "cursor-not-allowed opacity-40 hover:border-border",
                  )}
                >
                  <span className="text-xs">{d.date === todayDhaka() ? "Today" : shortDate(d.date).split(" ")[0]}</span>
                  <span className="text-lg font-bold tabular-nums">{Number(d.date.slice(8))}</span>
                  <span className="text-[10px]">{d.onLeave ? "Leave" : !d.sits ? "Off" : disabled ? "Full" : `${d.availableCount} free`}</span>
                </button>
              );
            })}
          </div>
          {slots.isPending ? (
            <p className="text-sm text-muted-foreground">Loading times…</p>
          ) : (
            slots.data?.sessions.map((s) => (
              <fieldset key={s.sessionKey} className="space-y-2">
                <legend className="text-sm font-semibold text-heading">
                  {s.label} · {s.startTime}–{s.endTime}{" "}
                  <span className={cn("font-normal", s.isFull ? "text-status-danger-fg" : "text-muted-foreground")}>
                    ({s.isFull ? "full" : `${s.remaining} seats left`})
                  </span>
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {slots.data!.slots
                    .filter((x) => x.sessionKey === s.sessionKey)
                    .map((x) => (
                      <button
                        key={x.time}
                        type="button"
                        disabled={!x.available}
                        onClick={() => {
                          setSlot(x);
                          setError(null);
                          setStep(3);
                        }}
                        title={x.reason ? REASON[x.reason] : "Free"}
                        className={cn(
                          "h-11 min-w-20 rounded-lg border px-2 text-sm font-medium tabular-nums transition-colors",
                          slot?.time === x.time ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary",
                          !x.available && "cursor-not-allowed bg-muted text-muted-foreground line-through opacity-60 hover:border-border",
                        )}
                      >
                        {time12(x.time)}
                      </button>
                    ))}
                </div>
              </fieldset>
            ))
          )}
          {error && <p className="rounded-lg border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm text-status-danger-fg">{error}</p>}
        </div>
      )}

      {/* STEP 4 — confirm */}
      {step === 3 && doctor && slot && patient && (
        <div className="space-y-4">
          <dl className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
            <Item label="Doctor">{doctor.displayName}</Item>
            <Item label="Department · Room">
              {doctor.department.name} · {doctor.roomNo ?? "—"}
            </Item>
            <Item label="Date">{date === todayDhaka() ? `Today, ${shortDate(date)}` : shortDate(date)}</Item>
            <Item label="Time">
              {time12(slot.time)} ({slot.sessionLabel})
            </Item>
            <Item label="Fee">
              {formatPoisha(doctor.consultationFee)}{" "}
              <span className="text-xs font-normal text-muted-foreground">(follow-up {formatPoisha(doctor.followUpFee)} if within {doctor.followUpValidDays} days)</span>
            </Item>
            <Item label="Serial">Given on booking</Item>
          </dl>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Priority</legend>
            <div className="grid grid-cols-3 gap-2">
              {(["normal", "elderly", "emergency"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={priority === p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    "h-11 rounded-lg border text-sm font-medium",
                    priority === p ? (p === "emergency" ? "border-destructive bg-destructive text-white" : "border-primary bg-primary text-primary-foreground") : "bg-card hover:border-primary",
                  )}
                >
                  {PRIORITY_LABEL[p].label} · <span className="font-bangla">{PRIORITY_LABEL[p].labelBn}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="bk-notes">Note for the doctor (optional)</Label>
            <Textarea id="bk-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for visit" />
          </div>
          {error && <p className="rounded-lg border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm text-status-danger-fg">{error}</p>}
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="outline" size="lg" onClick={() => setStep(2)}>
              <ArrowLeft /> Back
            </Button>
            <div className="flex flex-wrap gap-2">
              {date === todayDhaka() && (
                <Button variant="secondary" size="xl" onClick={() => book.mutate(true)} disabled={book.isPending}>
                  Book & check in
                </Button>
              )}
              <Button size="xl" onClick={() => book.mutate(false)} disabled={book.isPending}>
                {book.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Confirm booking
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-heading">{children}</dd>
    </div>
  );
}

/** Success: the serial number, big, and the token printer */
export function BookedView({ appointment: a, onClose }: { appointment: AppointmentView; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <DialogTitle className="sr-only">Appointment booked</DialogTitle>
      <span className="flex size-14 items-center justify-center rounded-full bg-status-success-bg text-status-success-fg">
        <CheckCircle2 className="size-8" />
      </span>
      <p className="text-lg font-semibold text-heading">
        Booked{a.status === "checked_in" ? " and checked in" : ""} · <span className="font-bangla">নিশ্চিত হয়েছে</span>
      </p>
      <div>
        <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">Serial</p>
        <p className="text-8xl leading-none font-black text-primary tabular-nums">{a.serialNo}</p>
      </div>
      <p className="text-muted-foreground">
        {a.patient.name} · {a.doctor.displayName} · Room {a.doctor.roomNo ?? "—"}
        <br />
        {a.date === todayDhaka() ? "Today" : shortDate(a.date)}, {time12(a.slotTime)} · {formatPoisha(a.fee)} {a.type === "follow_up" && "(follow-up)"}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="xl" render={<a href={`/print/token/${a.id}`} target="_blank" rel="noopener" />} nativeButton={false}>
          <Printer /> Print token
        </Button>
        <Button size="xl" variant="outline" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
