"use client";

import { useQuery } from "@tanstack/react-query";
import { FlaskConical, X } from "lucide-react";
import { ReactNode, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetchPage } from "@/lib/api";
import { addDaysTo, todayDhaka } from "@/lib/appointments";
import type { LabTest } from "@/lib/master-data";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { Investigation, VisitContent } from "./types";

const Field = ({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) => (
  <div className="space-y-1.5">
    <Label htmlFor={htmlFor} className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {label}
    </Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

/** Type and press Enter to add a chip (chief complaints) */
function ChipInput({ values, onChange, placeholder, id }: { values: string[]; onChange: (v: string[]) => void; placeholder: string; id: string }) {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (v && !values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setText("");
  };
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      {values.map((v) => (
        <span key={v} className="flex items-center gap-1 rounded-md bg-status-info-bg px-2 py-0.5 text-sm text-status-info-fg">
          {v}
          <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
          if (e.key === "Backspace" && !text && values.length) onChange(values.slice(0, -1));
        }}
        onBlur={add}
        placeholder={values.length ? "" : placeholder}
        className="min-w-32 flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

function InvestigationPicker({ values, onChange }: { values: Investigation[]; onChange: (v: Investigation[]) => void }) {
  const [q, setQ] = useState("");
  const term = useDebouncedValue(q.trim(), 250);
  const results = useQuery({
    queryKey: ["lab-test-search", term],
    queryFn: () => apiFetchPage<LabTest>(`/lab-tests?q=${encodeURIComponent(term)}&status=active&limit=8`),
    enabled: term.length >= 2,
  });
  const items = term.length >= 2 ? (results.data?.items ?? []).filter((t) => !values.some((v) => v.labTestId === t.id)) : [];
  const add = (inv: Investigation) => {
    onChange([...values, inv]);
    setQ("");
  };
  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <span key={`${v.name}-${i}`} className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-sm">
              <FlaskConical className="size-3 text-muted-foreground" /> {v.name}
              <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} aria-label={`Remove ${v.name}`}>
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q.trim()) {
              e.preventDefault();
              const first = items[0];
              add(first ? { labTestId: first.id, name: first.name, note: "" } : { labTestId: null, name: q.trim(), note: "" });
            }
          }}
          placeholder="Add test (CBC, RBS, X-ray chest…)"
          aria-label="Search lab tests"
        />
        {items.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border bg-popover shadow-lg">
            {items.map((t) => (
              <li key={t.id}>
                <button type="button" className="flex w-full justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => add({ labTestId: t.id, name: t.name, note: "" })}>
                  <span className="font-medium text-heading">{t.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** The middle column: history, examination, diagnosis, tests, advice and follow-up */
export function VisitNotes({ draft, set }: { draft: VisitContent; set: (patch: Partial<VisitContent>) => void }) {
  const today = todayDhaka();
  const followDate = draft.followUp?.date ?? "";
  const setFollow = (date: string | null) => set({ followUp: date || draft.followUp?.note ? { date, note: draft.followUp?.note ?? "" } : null });
  return (
    <div className="space-y-4">
      <Field label="Chief complaints" htmlFor="cc" hint="Press Enter after each one">
        <ChipInput id="cc" values={draft.chiefComplaints} onChange={(v) => set({ chiefComplaints: v })} placeholder="Fever 3 days, headache…" />
      </Field>
      <Field label="History of present illness" htmlFor="hpi">
        <Textarea id="hpi" rows={3} value={draft.historyOfPresentIllness} onChange={(e) => set({ historyOfPresentIllness: e.target.value })} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Examination" htmlFor="exam">
          <Textarea id="exam" rows={3} value={draft.examination} onChange={(e) => set({ examination: e.target.value })} placeholder="Chest clear, no pallor…" />
        </Field>
        <Field label="Past history" htmlFor="past">
          <Textarea id="past" rows={3} value={draft.pastHistory} onChange={(e) => set({ pastHistory: e.target.value })} />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Provisional diagnosis" htmlFor="pdx">
          <Input id="pdx" value={draft.provisionalDiagnosis} onChange={(e) => set({ provisionalDiagnosis: e.target.value })} className="font-medium" />
        </Field>
        <Field label="Final diagnosis" htmlFor="fdx">
          <Input id="fdx" value={draft.finalDiagnosis} onChange={(e) => set({ finalDiagnosis: e.target.value })} />
        </Field>
      </div>
      <Field label="Investigations">
        <InvestigationPicker values={draft.investigations} onChange={(v) => set({ investigations: v })} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Advice (Bangla)" htmlFor="adv-bn">
          <Textarea id="adv-bn" rows={3} value={draft.adviceBn} onChange={(e) => set({ adviceBn: e.target.value })} className="font-bangla" placeholder="প্রচুর পানি পান করবেন…" />
        </Field>
        <Field label="Advice (English)" htmlFor="adv-en">
          <Textarea id="adv-en" rows={3} value={draft.adviceEn} onChange={(e) => set({ adviceEn: e.target.value })} />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Follow-up">
          <div className="flex flex-wrap gap-1.5">
            {[7, 14, 30].map((d) => {
              const date = addDaysTo(today, d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFollow(followDate === date ? null : date)}
                  className={cn("rounded-md border px-2.5 py-1 text-sm", followDate === date ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
                >
                  {d === 30 ? "1 month" : `${d} days`}
                </button>
              );
            })}
            <Input type="date" min={addDaysTo(today, 1)} value={followDate} onChange={(e) => setFollow(e.target.value || null)} aria-label="Follow-up date" className="h-8 w-40" />
          </div>
        </Field>
        <Field label="Referral" htmlFor="ref">
          <Input
            id="ref"
            value={draft.referral?.to ?? ""}
            onChange={(e) => set({ referral: e.target.value ? { to: e.target.value, reason: draft.referral?.reason ?? "" } : null })}
            placeholder="e.g. Cardiology OPD"
          />
        </Field>
      </div>
    </div>
  );
}
