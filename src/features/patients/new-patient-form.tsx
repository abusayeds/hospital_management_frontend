"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, UserCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiFetch, getErrorMessage } from "@/lib/api";
import { ageGender, BLOOD_GROUPS, formatDate, formatPhone, Gender, Patient } from "@/lib/patients";
import { cn } from "@/lib/utils";
import { FormError } from "../master-data/form-bits";

const PHONE_RX = /^(\+?88)?01[3-9]\d{8}$/;
const phoneOk = (v: string) => PHONE_RX.test(v.replace(/[\s-]/g, ""));
const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

type Form = {
  name: string;
  gender: Gender | "";
  ageMode: "age" | "dob";
  ageYears: string;
  dateOfBirth: string;
  phone: string;
  nameBn: string;
  altPhone: string;
  bloodGroup: string;
  allergies: string;
  chronicConditions: string;
  area: string;
  upazila: string;
  district: string;
  ecName: string;
  ecPhone: string;
  ecRelation: string;
  nid: string;
  notes: string;
};

const EMPTY: Form = {
  name: "",
  gender: "",
  ageMode: "age",
  ageYears: "",
  dateOfBirth: "",
  phone: "",
  nameBn: "",
  altPhone: "",
  bloodGroup: "",
  allergies: "",
  chronicConditions: "",
  area: "",
  upazila: "",
  district: "",
  ecName: "",
  ecPhone: "",
  ecRelation: "",
  nid: "",
  notes: "",
};

/** Existing patient → form values (edit mode) */
const fromPatient = (p: Patient): Form => ({
  ...EMPTY,
  name: p.name,
  gender: p.gender,
  ageMode: p.dateOfBirth ? "dob" : "age",
  ageYears: String(p.age),
  dateOfBirth: p.dateOfBirth ?? "",
  phone: formatPhone(p.phone).replace("-", ""),
  nameBn: p.nameBn ?? "",
  altPhone: p.altPhone ? formatPhone(p.altPhone).replace("-", "") : "",
  bloodGroup: p.bloodGroup ?? "",
  allergies: p.allergies.join(", "),
  chronicConditions: (p.chronicConditions ?? []).join(", "),
  area: p.address?.area ?? "",
  upazila: p.address?.upazila ?? "",
  district: p.address?.district ?? "",
  ecName: p.emergencyContact?.name ?? "",
  ecPhone: p.emergencyContact?.phone ? formatPhone(p.emergencyContact.phone).replace("-", "") : "",
  ecRelation: p.emergencyContact?.relation ?? "",
  notes: p.notes ?? "",
});

type Errors = Partial<Record<keyof Form | "root", string>>;

/**
 * Registration in under a minute: name, gender, age (or date of birth) and phone are
 * all that is required. Everything else sits under "More details". If the phone and
 * name match an existing patient, the matches are shown as cards to pick instead.
 */
export function NewPatientForm({
  onDone,
  initialPhone = "",
  initialName = "",
  compact = false,
  patient,
}: {
  onDone: (p: Patient) => void;
  initialPhone?: string;
  initialName?: string;
  compact?: boolean;
  patient?: Patient; // present = edit mode
}) {
  const queryClient = useQueryClient();
  const [f, setF] = useState<Form>(() => (patient ? fromPatient(patient) : { ...EMPTY, phone: initialPhone, name: initialName }));
  // Reception gets the BASIC view (no chronic-condition list, no notes), so it must never send those back
  const canEditChronic = !patient || patient.chronicConditions !== undefined;
  const [more, setMore] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [duplicates, setDuplicates] = useState<Patient[] | null>(null);
  const set = (key: keyof Form, value: string) => setF((x) => ({ ...x, [key]: value }));

  const body = (allowDuplicate: boolean) => ({
    name: f.name.trim(),
    gender: f.gender,
    ...(f.ageMode === "age" ? { ageYears: Number(f.ageYears) } : { dateOfBirth: f.dateOfBirth }),
    phone: f.phone.trim(),
    nameBn: f.nameBn.trim() || undefined,
    altPhone: f.altPhone.trim() || undefined,
    bloodGroup: f.bloodGroup || undefined,
    allergies: list(f.allergies),
    ...(canEditChronic && { chronicConditions: list(f.chronicConditions) }),
    address: f.area || f.upazila || f.district ? { area: f.area.trim(), upazila: f.upazila.trim(), district: f.district.trim() } : undefined,
    emergencyContact: f.ecName || f.ecPhone ? { name: f.ecName.trim(), phone: f.ecPhone.trim(), relation: f.ecRelation.trim() } : undefined,
    nid: f.nid.trim() || undefined, // blank = unchanged
    ...(canEditChronic && { notes: f.notes.trim() || undefined }),
    ...(!patient && { allowDuplicate }),
  });

  const save = useMutation({
    mutationFn: (allowDuplicate: boolean) =>
      patient
        ? apiFetch<Patient>(`/patients/${patient.id}`, { method: "PATCH", body: body(false) })
        : apiFetch<Patient>("/patients", { method: "POST", body: body(allowDuplicate) }),
    meta: { silent: true },
    onSuccess: (p) => {
      toast.success(patient ? `Saved ${p.name}` : `Registered ${p.name} · ${p.patientCode}`);
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      onDone(p);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        const found = (err.details as { possibleDuplicates?: Patient[] } | undefined)?.possibleDuplicates;
        if (found?.length) return setDuplicates(found);
      }
      if (err instanceof ApiError && err.fieldErrors.length) {
        const next: Errors = {};
        err.fieldErrors.forEach((fe) => (next[fe.path.replace(/^body\./, "").split(".")[0] as keyof Form] = fe.message));
        setErrors(next);
        setMore(true);
      } else setErrors({ root: getErrorMessage(err) });
    },
  });

  const submit = () => {
    const e: Errors = {};
    if (f.name.trim().length < 2) e.name = "Enter the patient's name";
    if (!f.gender) e.gender = "Choose gender";
    if (f.ageMode === "age" && (f.ageYears === "" || Number(f.ageYears) < 0 || Number(f.ageYears) > 120)) e.ageYears = "Enter age in years (0–120)";
    if (f.ageMode === "dob" && !f.dateOfBirth) e.dateOfBirth = "Choose the date of birth";
    if (!phoneOk(f.phone)) e.phone = "Enter a valid mobile number (01XXXXXXXXX)";
    if (f.altPhone && !phoneOk(f.altPhone)) e.altPhone = "Enter a valid mobile number";
    if (f.nid && !/^(\d{10}|\d{13}|\d{17})$/.test(f.nid.trim())) e.nid = "NID must be 10, 13 or 17 digits";
    setErrors(e);
    if (Object.keys(e).length) {
      if (e.altPhone || e.nid) setMore(true);
      return;
    }
    save.mutate(false);
  };

  if (duplicates) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-status-waiting-border bg-status-waiting-bg px-4 py-3 text-sm text-status-waiting-fg">
          <p className="font-semibold">This may be an existing patient</p>
          <p>Same phone number and a similar name. Please choose the existing record if it is the same person.</p>
          <p className="font-bangla">একই ফোন নম্বর ও প্রায় একই নাম। একই রোগী হলে পুরোনো রেকর্ডটি বেছে নিন।</p>
        </div>
        <ul className="space-y-2">
          {duplicates.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onDone(p)}
                className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-card transition-colors hover:border-primary"
              >
                <UserCheck className="size-6 shrink-0 text-primary" />
                <span className="flex-1">
                  <span className="block font-semibold text-heading">
                    {p.name} <span className="font-mono text-sm text-muted-foreground">{p.patientCode}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {ageGender(p)} · {formatPhone(p.phone)} · Last visit {formatDate(p.lastVisitDate)}
                  </span>
                </span>
                <span className="text-sm font-semibold text-primary">Use this patient</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="outline" size="lg" onClick={() => setDuplicates(null)}>
            Back to form
          </Button>
          <Button variant="secondary" size="lg" onClick={() => save.mutate(true)} disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} Different person — register anyway
          </Button>
        </div>
      </div>
    );
  }

  const err = (k: keyof Form) =>
    errors[k] && (
      <p className="text-xs text-destructive" role="alert">
        {errors[k]}
      </p>
    );

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-5"
    >
      <div className={cn("grid gap-4", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4")}>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="p-name">Full name · পুরো নাম *</Label>
          <Input id="p-name" autoFocus autoComplete="off" className="h-12 text-base" value={f.name} aria-invalid={Boolean(errors.name)} onChange={(e) => set("name", e.target.value)} />
          {err("name")}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="p-phone">Mobile · মোবাইল *</Label>
          <Input id="p-phone" inputMode="tel" placeholder="01XXXXXXXXX" className="h-12 text-base tabular-nums" value={f.phone} aria-invalid={Boolean(errors.phone)} onChange={(e) => set("phone", e.target.value)} />
          {err("phone")}
        </div>
        <fieldset className="space-y-1.5 sm:col-span-2">
          <legend className="text-sm font-medium">Gender · লিঙ্গ *</legend>
          <div className="grid grid-cols-3 gap-2">
            {(["male", "female", "other"] as const).map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={f.gender === g}
                onClick={() => set("gender", g)}
                className={cn(
                  "h-12 rounded-lg border text-sm font-medium transition-colors",
                  f.gender === g ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary",
                )}
              >
                {g === "male" ? "Male · পুরুষ" : g === "female" ? "Female · মহিলা" : "Other"}
              </button>
            ))}
          </div>
          {err("gender")}
        </fieldset>
        <div className="space-y-1.5 sm:col-span-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={f.ageMode === "age" ? "p-age" : "p-dob"}>{f.ageMode === "age" ? "Age (years) · বয়স *" : "Date of birth · জন্ম তারিখ *"}</Label>
            <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => set("ageMode", f.ageMode === "age" ? "dob" : "age")}>
              {f.ageMode === "age" ? "Know the date of birth?" : "Enter age instead"}
            </button>
          </div>
          {f.ageMode === "age" ? (
            <Input id="p-age" type="number" min={0} max={120} inputMode="numeric" className="h-12 text-base" value={f.ageYears} aria-invalid={Boolean(errors.ageYears)} onChange={(e) => set("ageYears", e.target.value)} />
          ) : (
            <Input id="p-dob" type="date" max={new Date().toISOString().slice(0, 10)} className="h-12 text-base" value={f.dateOfBirth} aria-invalid={Boolean(errors.dateOfBirth)} onChange={(e) => set("dateOfBirth", e.target.value)} />
          )}
          {err("ageYears")}
          {err("dateOfBirth")}
        </div>
      </div>

      <div className="rounded-xl border">
        <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-heading">
          More details · আরও তথ্য <span className="font-normal text-muted-foreground">(optional)</span>
          <ChevronDown className={cn("size-4 transition-transform", more && "rotate-180")} />
        </button>
        {more && (
          <div className={cn("grid gap-4 border-t p-4", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}>
            <Field id="p-nameBn" label="নাম (বাংলা)" value={f.nameBn} onChange={(v) => set("nameBn", v)} className="font-bangla" />
            <Field id="p-alt" label="Alternative mobile" value={f.altPhone} onChange={(v) => set("altPhone", v)} error={errors.altPhone} inputMode="tel" />
            <div className="space-y-1.5">
              <Label htmlFor="p-blood">Blood group</Label>
              <NativeSelect id="p-blood" value={f.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)}>
                <option value="">Unknown</option>
                {BLOOD_GROUPS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Field id="p-allergies" label="Allergies (comma separated)" value={f.allergies} onChange={(v) => set("allergies", v)} placeholder="Penicillin, Sulfa" />
            {canEditChronic && (
              <Field id="p-chronic" label="Chronic conditions" value={f.chronicConditions} onChange={(v) => set("chronicConditions", v)} placeholder="Diabetes, Hypertension" />
            )}
            <Field id="p-nid" label={patient?.nidMasked ? `NID (saved: ${patient.nidMasked}) — type to replace` : "NID (stored encrypted)"} value={f.nid} onChange={(v) => set("nid", v)} error={errors.nid} inputMode="numeric" />
            <Field id="p-area" label="Area / village" value={f.area} onChange={(v) => set("area", v)} />
            <Field id="p-upazila" label="Upazila / thana" value={f.upazila} onChange={(v) => set("upazila", v)} placeholder="Keraniganj" />
            <Field id="p-district" label="District" value={f.district} onChange={(v) => set("district", v)} placeholder="Dhaka" />
            <Field id="p-ecName" label="Emergency contact name" value={f.ecName} onChange={(v) => set("ecName", v)} />
            <Field id="p-ecPhone" label="Emergency contact mobile" value={f.ecPhone} onChange={(v) => set("ecPhone", v)} inputMode="tel" />
            <Field id="p-ecRel" label="Relation" value={f.ecRelation} onChange={(v) => set("ecRelation", v)} placeholder="Son, wife…" />
            {canEditChronic && (
              <div className="space-y-1.5 sm:col-span-full">
                <Label htmlFor="p-notes">Notes</Label>
                <Textarea id="p-notes" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
              </div>
            )}
          </div>
        )}
      </div>

      <FormError message={errors.root} />
      <Button type="submit" size="xl" className="w-full sm:w-auto" disabled={save.isPending}>
        {save.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />} {patient ? "Save changes" : "Register patient"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  className,
  ...rest
}: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string } & Omit<React.ComponentProps<typeof Input>, "onChange" | "value">) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)} className={className} {...rest} />
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function NewPatientDialog({ open, onOpenChange, onDone, initialQuery = "" }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: (p: Patient) => void; initialQuery?: string }) {
  // Pre-fill from what reception already typed in the search box
  const looksLikePhone = /^[\d\s+-]{5,}$/.test(initialQuery);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">New patient · নতুন রোগী</DialogTitle>
          <DialogDescription>Only name, mobile, gender and age are required.</DialogDescription>
        </DialogHeader>
        {open && (
          <NewPatientForm
            compact
            initialPhone={looksLikePhone ? initialQuery : ""}
            initialName={looksLikePhone ? "" : initialQuery}
            onDone={(p) => {
              onOpenChange(false);
              onDone(p);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
