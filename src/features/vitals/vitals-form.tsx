"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Save } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiFetch, getErrorMessage } from "@/lib/api";
import { computeBmi, FlagLevel, flagVitals, VITAL_LIMITS, VitalKey } from "@/lib/clinical-rules";
import { cn } from "@/lib/utils";
import { LEVEL_STYLE, Vitals } from "./types";

type Field = "bpSystolic" | "bpDiastolic" | "pulse" | "temperatureF" | "spo2" | "respiratoryRate" | "weightKg" | "heightCm" | "sugar";
type Values = Record<Field, string>;

const EMPTY: Values = { bpSystolic: "", bpDiastolic: "", pulse: "", temperatureF: "", spo2: "", respiratoryRate: "", weightKg: "", heightCm: "", sugar: "" };

const toNum = (s: string) => (s.trim() === "" ? null : Number(s));
const fromVitals = (v: Vitals): Values => ({
  bpSystolic: v.bpSystolic?.toString() ?? "",
  bpDiastolic: v.bpDiastolic?.toString() ?? "",
  pulse: v.pulse?.toString() ?? "",
  temperatureF: v.temperatureF?.toString() ?? "",
  spo2: v.spo2?.toString() ?? "",
  respiratoryRate: v.respiratoryRate?.toString() ?? "",
  weightKg: v.weightKg?.toString() ?? "",
  heightCm: v.heightCm?.toString() ?? "",
  sugar: v.bloodSugar?.value?.toString() ?? "",
});

type Props = {
  appointmentId: string;
  /** Called after a successful save; `next` = the nurse wants the next patient */
  onSaved: (next: boolean) => void;
  hasNext: boolean;
};

/**
 * Fast vitals entry: big inputs in the order nurses measure, units shown, colour feedback
 * while typing (same rules as the server), BMI calculated automatically.
 */
export function VitalsForm({ appointmentId, onSaved, hasNext }: Props) {
  const existing = useQuery({
    queryKey: ["vitals", appointmentId],
    queryFn: () => apiFetch<Vitals | null>(`/appointments/${appointmentId}/vitals`),
  });
  if (existing.isPending) return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  // key: a fresh form (fresh state) for every patient
  return <VitalsFormFields key={appointmentId} appointmentId={appointmentId} saved={existing.data ?? null} onSaved={onSaved} hasNext={hasNext} />;
}

function VitalsFormFields({ appointmentId, saved, onSaved, hasNext }: Props & { saved: Vitals | null }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Values>(() => (saved ? fromVitals(saved) : EMPTY));
  const [sugarType, setSugarType] = useState<"random" | "fasting">(() => saved?.bloodSugar?.type ?? "random");
  const [notes, setNotes] = useState(() => saved?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const numbers = useMemo(
    () => ({
      bpSystolic: toNum(values.bpSystolic),
      bpDiastolic: toNum(values.bpDiastolic),
      pulse: toNum(values.pulse),
      temperatureF: toNum(values.temperatureF),
      spo2: toNum(values.spo2),
      respiratoryRate: toNum(values.respiratoryRate),
      weightKg: toNum(values.weightKg),
      heightCm: toNum(values.heightCm),
      bloodSugar: toNum(values.sugar) === null ? null : { value: toNum(values.sugar), type: sugarType },
    }),
    [values, sugarType],
  );
  const flags = useMemo(() => flagVitals(numbers), [numbers]);
  const levelOf = (key: VitalKey): FlagLevel | null => flags.find((f) => f.key === key)?.level ?? null;
  const bmi = computeBmi(numbers.weightKg, numbers.heightCm);

  const save = useMutation({
    mutationFn: () =>
      apiFetch<Vitals>(`/appointments/${appointmentId}/vitals`, {
        method: saved ? "PATCH" : "POST",
        body: { ...numbers, notes },
      }),
    meta: { silent: true },
  });

  const submit = async (next: boolean) => {
    setErrors({});
    try {
      await save.mutateAsync();
      toast.success("Vitals saved");
      queryClient.invalidateQueries({ queryKey: ["vitals"] });
      queryClient.invalidateQueries({ queryKey: ["vitals-worklist"] });
      onSaved(next);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors.length) {
        setErrors(Object.fromEntries(err.fieldErrors.map((f) => [f.path.replace(/^body\./, "").replace("bloodSugar.value", "sugar"), f.message])));
      } else {
        toast.error(getErrorMessage(err));
      }
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit(false);
  };
  const set = (field: Field) => (v: string) => setValues((s) => ({ ...s, [field]: v.replace(/[^\d.]/g, "") }));

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid grid-cols-2 gap-3">
        {/* Blood pressure takes the whole row: systolic / diastolic */}
        <VitalBox label="Blood pressure" labelBn="রক্তচাপ" unit="mmHg" level={levelOf("bp")} className="col-span-2" error={errors.bpSystolic ?? errors.bpDiastolic}>
          <div className="flex items-center gap-2">
            <BigInput id="bpSystolic" value={values.bpSystolic} onChange={set("bpSystolic")} placeholder="120" autoFocus aria-label="Systolic BP" />
            <span className="text-2xl text-muted-foreground">/</span>
            <BigInput id="bpDiastolic" value={values.bpDiastolic} onChange={set("bpDiastolic")} placeholder="80" aria-label="Diastolic BP" />
          </div>
        </VitalBox>
        <VitalBox label="Pulse" labelBn="পালস" unit={VITAL_LIMITS.pulse.unit} level={levelOf("pulse")} error={errors.pulse}>
          <BigInput id="pulse" value={values.pulse} onChange={set("pulse")} placeholder="72" />
        </VitalBox>
        <VitalBox label="Temperature" labelBn="তাপমাত্রা" unit="°F" level={levelOf("temperatureF")} error={errors.temperatureF}>
          <BigInput id="temperatureF" value={values.temperatureF} onChange={set("temperatureF")} placeholder="98.4" decimal />
        </VitalBox>
        <VitalBox label="SpO₂" labelBn="অক্সিজেন" unit="%" level={levelOf("spo2")} error={errors.spo2}>
          <BigInput id="spo2" value={values.spo2} onChange={set("spo2")} placeholder="98" />
        </VitalBox>
        <VitalBox label="Respiratory rate" labelBn="শ্বাসের হার" unit="/min" level={levelOf("respiratoryRate")} error={errors.respiratoryRate}>
          <BigInput id="respiratoryRate" value={values.respiratoryRate} onChange={set("respiratoryRate")} placeholder="16" />
        </VitalBox>
        <VitalBox label="Weight" labelBn="ওজন" unit="kg" level={null} error={errors.weightKg}>
          <BigInput id="weightKg" value={values.weightKg} onChange={set("weightKg")} placeholder="60" decimal />
        </VitalBox>
        <VitalBox label="Height" labelBn="উচ্চতা" unit="cm" level={null} error={errors.heightCm}>
          <BigInput id="heightCm" value={values.heightCm} onChange={set("heightCm")} placeholder="160" decimal />
        </VitalBox>
        <VitalBox label="BMI (automatic)" labelBn="বিএমআই" unit="kg/m²" level={levelOf("bmi")}>
          <p className="flex h-12 items-center text-2xl font-semibold text-heading tabular-nums" aria-live="polite">
            {bmi ?? "—"}
          </p>
        </VitalBox>
        <VitalBox label="Blood sugar (optional)" labelBn="রক্তে সুগার" unit="mmol/L" level={levelOf("bloodSugar")} error={errors.sugar}>
          <BigInput id="sugar" value={values.sugar} onChange={set("sugar")} placeholder="6.5" decimal />
          <div role="radiogroup" aria-label="Sugar test type" className="mt-2 flex gap-1.5">
            {(["random", "fasting"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={sugarType === t}
                onClick={() => setSugarType(t)}
                className={cn(
                  "h-8 rounded-full border px-3 text-xs font-medium capitalize",
                  sugarType === t ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                {t === "random" ? "Random · র‍্যান্ডম" : "Fasting · খালি পেটে"}
              </button>
            ))}
          </div>
        </VitalBox>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="vitals-notes">Notes · মন্তব্য</Label>
        <Textarea id="vitals-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="e.g. patient looks tired, BP rechecked after 5 minutes" />
      </div>

      {flags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Warnings">
          {flags.map((f) => (
            <li key={f.key} className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", LEVEL_STYLE[f.level].bg, LEVEL_STYLE[f.level].ring, LEVEL_STYLE[f.level].text)}>
              {f.label} · <span className="font-bangla font-normal">{f.labelBn}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" size="xl" variant={hasNext ? "outline" : "default"} className="flex-1" disabled={save.isPending}>
          {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save
        </Button>
        {hasNext && (
          <Button type="button" size="xl" className="flex-1" disabled={save.isPending} onClick={() => void submit(true)}>
            Save &amp; next patient <ArrowRight />
          </Button>
        )}
      </div>
    </form>
  );
}

function VitalBox({
  label,
  labelBn,
  unit,
  level,
  error,
  className,
  children,
}: {
  label: string;
  labelBn: string;
  unit: string;
  level: FlagLevel | null;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const style = level ? LEVEL_STYLE[level] : null;
  return (
    <div className={cn("rounded-xl border-2 bg-card p-3 transition-colors", style ? `${style.ring} ${style.bg}` : "border-border", error && "border-destructive", className)}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-heading">
          {label} <span className="font-bangla font-normal text-muted-foreground">· {labelBn}</span>
        </span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      {children}
      {style && level !== "normal" && <p className={cn("mt-1 text-xs font-semibold", style.text)}>{style.label}</p>}
      {error && (
        <p className="mt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function BigInput({
  id,
  value,
  onChange,
  decimal,
  ...rest
}: { id: string; value: string; onChange: (v: string) => void; decimal?: boolean } & Omit<React.ComponentProps<"input">, "onChange" | "value">) {
  return (
    <input
      id={id}
      inputMode={decimal ? "decimal" : "numeric"}
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-2xl font-semibold text-heading tabular-nums outline-none placeholder:text-muted-foreground/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      {...rest}
    />
  );
}
