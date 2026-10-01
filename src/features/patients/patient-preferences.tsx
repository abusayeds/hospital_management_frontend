"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BellOff } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/shared/section-card";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Patient } from "@/lib/patients";
import type { Preferences } from "./patient-messages";

const SWITCHES: { key: "reminders" | "followUps" | "labReports" | "marketing"; label: string; hint: string }[] = [
  { key: "reminders", label: "Appointment reminders", hint: "Confirmations, day-before and same-day reminders" },
  { key: "followUps", label: "Follow-ups", hint: "Follow-up reminders, missed-appointment offers" },
  { key: "labReports", label: "Lab reports", hint: "Report ready, sample reminders" },
  { key: "marketing", label: "Promotions", hint: "Birthday greetings — only with the patient's consent" },
];

/** What automated messages this patient gets. Changed by staff only when the patient asks. */
export function PatientPreferences({ patient }: { patient: Patient }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const prefs = patient.preferences;
  const save = useMutation({
    mutationFn: (patch: Partial<Preferences>) =>
      apiFetch<Preferences>(`/patients/${patient.id}/preferences`, { method: "PATCH", body: patch }),
    onSuccess: (p) => {
      queryClient.setQueryData<Patient>(["patient", patient.id], (old) => (old ? { ...old, preferences: p } : old));
      toast.success("Message preferences saved");
    },
  });
  if (!prefs) return null;
  const editable = can("patient:update") && !save.isPending;

  return (
    <SectionCard title="Message preferences" description="Change only when the patient asks. Every change is audited.">
      <div className="space-y-3">
        {prefs.optOutAll && (
          <div className="flex gap-2 rounded-lg border border-status-danger-border bg-status-danger-bg p-3 text-sm text-status-danger-fg">
            <BellOff className="mt-0.5 size-4 shrink-0" />
            <span>
              Opted out of all messages{prefs.optOutReason ? ` (${prefs.optOutReason})` : ""}. Essential messages (e.g. the hospital cancelling a booking) still go.
            </span>
          </div>
        )}
        {SWITCHES.map((s) => (
          <label key={s.key} className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-heading">{s.label}</span>
              <span className="block text-xs text-muted-foreground">{s.hint}</span>
            </span>
            <Switch checked={prefs[s.key]} disabled={!editable || prefs.optOutAll} onCheckedChange={(v) => save.mutate({ [s.key]: v })} />
          </label>
        ))}
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-heading">Message language</span>
          <NativeSelect className="w-32" value={prefs.language} disabled={!editable} onChange={(e) => save.mutate({ language: e.target.value as "bn" | "en" })}>
            <option value="bn">বাংলা</option>
            <option value="en">English</option>
          </NativeSelect>
        </label>
        <label className="flex items-center justify-between gap-3 border-t pt-3">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-heading">Stop all messages</span>
            <span className="block text-xs text-muted-foreground">Same as the patient replying STOP. They can reply START to resume.</span>
          </span>
          <Switch checked={prefs.optOutAll} disabled={!editable} onCheckedChange={(v) => save.mutate({ optOutAll: v })} />
        </label>
      </div>
    </SectionCard>
  );
}
