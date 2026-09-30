"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, BookmarkPlus, CheckCircle2, Cloud, CloudOff, Loader2, Lock, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiFetch, notifyError } from "@/lib/api";
import { GENDER_LABEL } from "@/lib/patients";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { LEVEL_STYLE, Vitals } from "@/features/vitals/types";
import { AiSummaryCard } from "./ai-summary-card";
import { PatientHistory } from "./patient-history";
import { RxEditor } from "./rx-editor";
import { contentOf, RxTemplate, SaveResult, Visit, VisitContent } from "./types";
import { VisitNotes } from "./visit-notes";
import { VisitRecord } from "./visit-record";

type Conflict = { medicine: string; allergy: string };

// ------------------------------------------------------------------ left column

function VitalsCard({ vitals }: { vitals: Vitals | null }) {
  if (!vitals) return <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">No vitals recorded by the nurse.</p>;
  const flagged = new Set(vitals.flags.map((f) => f.key));
  const cell = (key: string, label: string, value: string | null) => (
    <div className={cn("rounded-lg border px-2 py-1.5", flagged.has(key as never) && "border-status-danger-border bg-status-danger-bg")}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-semibold text-heading tabular-nums">{value ?? "—"}</p>
    </div>
  );
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5">
        {cell("bp", "BP", vitals.bpSystolic ? `${vitals.bpSystolic}/${vitals.bpDiastolic}` : null)}
        {cell("pulse", "Pulse", vitals.pulse ? String(vitals.pulse) : null)}
        {cell("temperatureF", "Temp °F", vitals.temperatureF ? String(vitals.temperatureF) : null)}
        {cell("spo2", "SpO₂", vitals.spo2 ? `${vitals.spo2}%` : null)}
        {cell("respiratoryRate", "RR", vitals.respiratoryRate ? String(vitals.respiratoryRate) : null)}
        {cell("bmi", "BMI", vitals.bmi ? String(vitals.bmi) : null)}
        {cell("bmi", "Weight", vitals.weightKg ? `${vitals.weightKg} kg` : null)}
        {cell("bloodSugar", "Sugar", vitals.bloodSugar ? `${vitals.bloodSugar.value} ${vitals.bloodSugar.type === "fasting" ? "F" : "R"}` : null)}
      </div>
      {vitals.flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {vitals.flags.map((f) => (
            <span key={f.key} className={cn("rounded-md border px-1.5 py-0.5 text-xs font-medium", LEVEL_STYLE[f.level].ring, LEVEL_STYLE[f.level].bg, LEVEL_STYLE[f.level].text)}>
              {f.label}
            </span>
          ))}
        </div>
      )}
      {vitals.notes && <p className="text-xs text-muted-foreground">Nurse: “{vitals.notes}”</p>}
    </div>
  );
}

function PatientColumn({ visit, onInsertSummary }: { visit: Visit; onInsertSummary?: (text: string) => void }) {
  const p = visit.patient;
  return (
    <div className="space-y-4">
      <SectionCard title={p.name} description={`${p.age} y · ${GENDER_LABEL[p.gender].label} · ${p.patientCode}${p.bloodGroup ? ` · ${p.bloodGroup}` : ""}`}>
        <div className="space-y-3">
          {p.allergies.length > 0 ? (
            <div className="rounded-lg border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm text-status-danger-fg">
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="size-4" /> Allergies
              </p>
              <p>{p.allergies.join(", ")}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No known allergies</p>
          )}
          {p.chronicConditions.length > 0 && (
            <p className="text-sm">
              <span className="font-medium text-heading">Chronic:</span> {p.chronicConditions.join(", ")}
            </p>
          )}
          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Today&apos;s vitals</p>
            <VitalsCard vitals={visit.vitals} />
          </div>
        </div>
      </SectionCard>
      <AiSummaryCard patientId={p.id} onInsert={onInsertSummary} />
      <SectionCard title="History">
        <PatientHistory patientId={p.id} currentVisitId={visit.id} compact />
      </SectionCard>
    </div>
  );
}

// ------------------------------------------------------------------ templates

function TemplateBar({ draft, onApply }: { draft: VisitContent; onApply: (t: RxTemplate) => void }) {
  const queryClient = useQueryClient();
  const templates = useQuery({ queryKey: ["rx-templates"], queryFn: () => apiFetch<RxTemplate[]>("/visits/templates") });
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const save = useMutation({
    mutationFn: () =>
      apiFetch<RxTemplate>("/visits/templates", {
        method: "POST",
        body: {
          name,
          diagnosis: draft.provisionalDiagnosis || draft.finalDiagnosis,
          items: draft.prescription.map((i) => ({ ...i, instructionsEn: undefined, instructionsBn: undefined })),
          adviceEn: draft.adviceEn,
          adviceBn: draft.adviceBn,
          investigations: draft.investigations,
        },
      }),
    onSuccess: () => {
      toast.success(`Template “${name}” saved`);
      setNaming(false);
      setName("");
      queryClient.invalidateQueries({ queryKey: ["rx-templates"] });
    },
  });
  return (
    <div className="flex gap-2">
      <NativeSelect
        value=""
        onChange={(e) => {
          const t = templates.data?.find((x) => x.id === e.target.value);
          if (t) onApply(t);
        }}
        aria-label="Apply a template"
        className="h-9 text-sm"
      >
        <option value="">{templates.data?.length ? "Apply template…" : "No templates yet"}</option>
        {templates.data?.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.items.length})
          </option>
        ))}
      </NativeSelect>
      <Button variant="outline" size="sm" disabled={draft.prescription.length === 0} onClick={() => setNaming(true)} title="Save this prescription as a template">
        <BookmarkPlus /> Save
      </Button>
      <Dialog open={naming} onOpenChange={setNaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
            <DialogDescription>Only you can see and use your templates.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Template name</Label>
            <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Adult fever" autoFocus />
          </div>
          <DialogFooter>
            <Button disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>
              {save.isPending && <Loader2 className="animate-spin" />} Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------------------------------------------------------------------ editor (open visit)

function VisitEditor({ visit, onClosed }: { visit: Visit; onClosed: (v: Visit) => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<VisitContent>(() => contentOf(visit));
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(contentOf(visit)));
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [closing, setClosing] = useState(false);
  const debounced = useDebouncedValue(draft, 1200);
  const set = (patch: Partial<VisitContent>) => setDraft((d) => ({ ...d, ...patch }));

  const save = useMutation({
    meta: { silent: true },
    mutationFn: ({ content, overrides }: { content: VisitContent; overrides?: (Conflict & { reason: string })[] }) =>
      apiFetch<SaveResult>(`/visits/${visit.id}`, { method: "PATCH", body: { ...content, ...(overrides && { allergyOverrides: overrides }) } }),
    onSuccess: (_res, { content }) => {
      setSavedJson(JSON.stringify(content));
      setConflicts(null);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "ALLERGY_CONFLICT") {
        setConflicts((err.details as { conflicts: Conflict[] })?.conflicts ?? []);
      } else notifyError(err);
    },
  });
  const { mutate, mutateAsync, isPending, isError } = save;

  // Autosave: 1.2 s after the doctor stops typing (never while an allergy question is open)
  useEffect(() => {
    if (conflicts) return;
    const json = JSON.stringify(debounced);
    if (json !== savedJson && !isPending) mutate({ content: debounced });
  }, [debounced, savedJson, isPending, conflicts, mutate]);

  const dirty = JSON.stringify(draft) !== savedJson;
  const close = useMutation({
    mutationFn: async () => {
      if (dirty) await mutateAsync({ content: draft });
      return apiFetch<Visit>(`/visits/${visit.id}/close`, { method: "POST" });
    },
    onSuccess: (v) => {
      toast.success(`Visit closed · ${v.prescriptionNo}`);
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      queryClient.invalidateQueries({ queryKey: ["emr"] });
      queryClient.invalidateQueries({ queryKey: ["doctor-today"] });
      onClosed(v);
    },
  });

  const applyTemplate = (t: RxTemplate) => {
    setDraft((d) => ({
      ...d,
      prescription: [...d.prescription, ...t.items],
      provisionalDiagnosis: d.provisionalDiagnosis || t.diagnosis,
      adviceBn: d.adviceBn || t.adviceBn,
      adviceEn: d.adviceEn || t.adviceEn,
      investigations: [...d.investigations, ...t.investigations.filter((i) => !d.investigations.some((x) => x.name === i.name))],
    }));
    toast.success(`Template “${t.name}” applied — review the doses`);
  };

  const hasDiagnosis = Boolean(draft.provisionalDiagnosis.trim() || draft.finalDiagnosis.trim());
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/doctor/queue" />} nativeButton={false}>
          <ArrowLeft /> Queue
        </Button>
        <h1 className="text-xl font-semibold text-heading">
          Serial {visit.appointment.serialNo} · {visit.patient.name}
        </h1>
        {visit.appointment.type === "follow_up" && <StatusBadge tone="info">Follow-up</StatusBadge>}
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
          {isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Saving…
            </>
          ) : isError && dirty ? (
            <>
              <CloudOff className="size-3.5 text-status-danger-fg" /> Not saved
            </>
          ) : dirty ? (
            <>
              <Cloud className="size-3.5" /> Unsaved changes
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3.5 text-status-success-fg" /> Saved
            </>
          )}
        </span>
        <Button className="ml-auto" size="lg" disabled={close.isPending} onClick={() => setClosing(true)}>
          {close.isPending ? <Loader2 className="animate-spin" /> : <Lock />} Close visit
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_420px]">
        <PatientColumn
          visit={visit}
          onInsertSummary={(text) => {
            setDraft((d) => ({
              ...d,
              historyOfPresentIllness: [d.historyOfPresentIllness.trim(), `Previous records (AI summary, reviewed by doctor):\n${text}`]
                .filter(Boolean)
                .join("\n\n"),
              aiSummaryUsed: true,
            }));
            toast.success("Summary inserted — edit it as needed");
          }}
        />
        <SectionCard title="Consultation notes">
          <VisitNotes draft={draft} set={set} />
        </SectionCard>
        <SectionCard title="Rx · প্রেসক্রিপশন" action={<TemplateBar draft={draft} onApply={applyTemplate} />}>
          <RxEditor items={draft.prescription} allergies={visit.patient.allergies} onChange={(items) => set({ prescription: items })} />
        </SectionCard>
      </div>

      <ConfirmDialog
        open={closing}
        onOpenChange={setClosing}
        title={hasDiagnosis ? "Close and sign this visit?" : "Write a diagnosis first"}
        description={
          hasDiagnosis
            ? "The record becomes read-only and the patient's appointment is completed. Later corrections are added as addenda."
            : "A provisional or final diagnosis is required before the visit can be closed."
        }
        confirmLabel={hasDiagnosis ? "Close visit" : "OK"}
        onConfirm={async () => {
          if (hasDiagnosis) await close.mutateAsync();
        }}
      />

      <Dialog open={Boolean(conflicts)} onOpenChange={(o) => !o && setConflicts(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-status-danger-fg">
              <AlertTriangle className="size-5" /> Allergy warning
            </DialogTitle>
            <DialogDescription>The prescription was not saved. This patient has a recorded allergy that matches:</DialogDescription>
          </DialogHeader>
          <ul className="space-y-1 text-sm">
            {conflicts?.map((c) => (
              <li key={`${c.medicine}-${c.allergy}`} className="rounded-lg bg-status-danger-bg px-3 py-2 text-status-danger-fg">
                <b>{c.medicine}</b> — allergic to {c.allergy}
              </li>
            ))}
          </ul>
          <div className="space-y-1.5">
            <Label htmlFor="override-reason">To prescribe anyway, write the reason (kept in the audit log)</Label>
            <Textarea id="override-reason" rows={2} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const bad = new Set(conflicts?.map((c) => c.medicine.toLowerCase()));
                setDraft((d) => ({ ...d, prescription: d.prescription.filter((i) => !bad.has(i.brandName.toLowerCase())) }));
                setConflicts(null);
              }}
            >
              Remove medicine
            </Button>
            <Button
              variant="destructive"
              disabled={overrideReason.trim().length < 5 || isPending}
              onClick={() => {
                mutate({ content: draft, overrides: (conflicts ?? []).map((c) => ({ ...c, reason: overrideReason.trim() })) });
                setOverrideReason("");
              }}
            >
              Prescribe anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------------------------------------------------------------------ page

/** The doctor's screen for one appointment: open visit → editor; closed visit → signed record */
export function VisitWorkspace({ appointmentId }: { appointmentId: string }) {
  const queryClient = useQueryClient();
  const key = ["visit-for-appointment", appointmentId];
  const visit = useQuery({ queryKey: key, queryFn: () => apiFetch<Visit | null>(`/appointments/${appointmentId}/visit`) });
  const start = useMutation({
    mutationFn: () => apiFetch<Visit>(`/appointments/${appointmentId}/visit`, { method: "POST" }),
    onSuccess: (v) => {
      queryClient.setQueryData(key, v);
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
  const setVisit = (v: Visit) => queryClient.setQueryData(key, v);

  if (visit.isError) {
    const msg = visit.error instanceof ApiError ? visit.error.message : "Could not load the visit.";
    return <EmptyState icon={AlertTriangle} title="Visit unavailable" description={msg} />;
  }
  if (visit.data === undefined) return <PageSkeleton />;
  const v = visit.data;

  if (!v) {
    return (
      <EmptyState
        icon={Stethoscope}
        title="Consultation not started"
        description="Start the visit to open the patient's record. A waiting patient is moved to “with the doctor”."
        action={
          <Button size="lg" disabled={start.isPending} onClick={() => start.mutate()}>
            {start.isPending && <Loader2 className="animate-spin" />} Start consultation
          </Button>
        }
      />
    );
  }
  if (v.status === "open") return <VisitEditor key={v.id} visit={v} onClosed={setVisit} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/doctor/queue" />} nativeButton={false}>
          <ArrowLeft /> Queue
        </Button>
        <h1 className="text-xl font-semibold text-heading">{v.patient.name}</h1>
      </div>
      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <PatientColumn visit={v} />
        <SectionCard title="Visit record">
          <VisitRecord visit={v} onChanged={setVisit} />
        </SectionCard>
      </div>
    </div>
  );
}
