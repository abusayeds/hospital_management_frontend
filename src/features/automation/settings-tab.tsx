"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, FlaskConical, Loader2, MoonStar, Save, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AutomationSettings, PreviewItem, when } from "./types";

type Editable = Omit<AutomationSettings, "whatsappConfigured" | "sms">;

function Toggle({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <span>
        <span className="text-sm font-medium text-heading">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </label>
  );
}

function NumberField({ id, label, value, onChange, disabled, min = 0 }: { id: string; label: string; value: number; onChange: (v: number) => void; disabled?: boolean; min?: number }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" min={min} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function SettingsForm({ initial }: { initial: AutomationSettings }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const editable = can("automation:manage");
  const [s, setS] = useState<Editable>(() => ({
    automationPaused: initial.automationPaused,
    quietHoursStart: initial.quietHoursStart,
    quietHoursEnd: initial.quietHoursEnd,
    messageNumerals: initial.messageNumerals,
    automationDailyBudget: initial.automationDailyBudget,
    perPhoneDailyCap: initial.perPhoneDailyCap,
    dedupeWindowMinutes: initial.dedupeWindowMinutes,
    simulateWhatsApp: initial.simulateWhatsApp,
    simulateSms: initial.simulateSms,
    smsFallbackEnabled: initial.smsFallbackEnabled,
    failureAlertThreshold: initial.failureAlertThreshold,
  }));
  const set = <K extends keyof Editable>(k: K, v: Editable[K]) => setS((x) => ({ ...x, [k]: v }));
  const save = useMutation({
    mutationFn: () => apiFetch<AutomationSettings>("/automation/settings", { method: "PATCH", body: s }),
    onSuccess: () => {
      toast.success("Automation settings saved");
      queryClient.invalidateQueries({ queryKey: ["automation"] });
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <FlaskConical className="size-4" /> Simulation and channels
          </span>
        }
        description="Simulation sends nothing to real phones: messages go to the WhatsApp simulator and get fake delivered/read ticks."
      >
        <div className="space-y-3">
          <Toggle label="Pause all automation" hint="Planners and sending stop until switched back on." checked={s.automationPaused} disabled={!editable} onChange={(v) => set("automationPaused", v)} />
          <Toggle
            label="Simulate WhatsApp"
            hint={initial.whatsappConfigured ? "Meta credentials are set — switching this off sends REAL messages." : "Meta credentials are not set, so real WhatsApp is unavailable."}
            checked={s.simulateWhatsApp}
            disabled={!editable}
            onChange={(v) => set("simulateWhatsApp", v)}
          />
          <Toggle label="Simulate SMS" hint={`SMS provider: ${initial.sms.provider}${initial.sms.real ? "" : " (stub — logs only)"}`} checked={s.simulateSms} disabled={!editable} onChange={(v) => set("simulateSms", v)} />
          <Toggle label="SMS fallback" hint="Try SMS when WhatsApp cannot deliver." checked={s.smsFallbackEnabled} disabled={!editable} onChange={(v) => set("smsFallbackEnabled", v)} />
        </div>
      </SectionCard>

      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <MoonStar className="size-4" /> Quiet hours and limits
          </span>
        }
        description="Messages are deferred, never dropped, when a limit is reached."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="qh-start">Quiet hours start</Label>
            <Input id="qh-start" type="time" value={s.quietHoursStart} disabled={!editable} onChange={(e) => set("quietHoursStart", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qh-end">Quiet hours end</Label>
            <Input id="qh-end" type="time" value={s.quietHoursEnd} disabled={!editable} onChange={(e) => set("quietHoursEnd", e.target.value)} />
          </div>
          <NumberField id="budget" label="Global daily budget (patient messages)" value={s.automationDailyBudget} disabled={!editable} onChange={(v) => set("automationDailyBudget", v)} />
          <NumberField id="cap" label="Per-phone daily cap (reminder-style)" min={1} value={s.perPhoneDailyCap} disabled={!editable} onChange={(v) => set("perPhoneDailyCap", v)} />
          <NumberField id="dedupe" label="Duplicate window (minutes)" value={s.dedupeWindowMinutes} disabled={!editable} onChange={(v) => set("dedupeWindowMinutes", v)} />
          <NumberField id="failures" label="Alert admins after N failures / hour" min={1} value={s.failureAlertThreshold} disabled={!editable} onChange={(v) => set("failureAlertThreshold", v)} />
          <div className="space-y-1.5">
            <Label htmlFor="numerals">Numerals in Bangla messages</Label>
            <NativeSelect id="numerals" value={s.messageNumerals} disabled={!editable} onChange={(e) => set("messageNumerals", e.target.value as "bn" | "en")}>
              <option value="bn">বাংলা (১২৩)</option>
              <option value="en">English (123)</option>
            </NativeSelect>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4" /> Opt-out categories
          </span>
        }
        description="What each patient switch controls."
        className="lg:col-span-2"
      >
        <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <li className="rounded-lg border p-3">
            <b>Reminders</b> — confirmations, day-before and same-day reminders.
          </li>
          <li className="rounded-lg border p-3">
            <b>Follow-ups</b> — follow-up reminders and no-show rebooking offers.
          </li>
          <li className="rounded-lg border p-3">
            <b>Lab reports</b> — report ready, sample reminders.
          </li>
          <li className="rounded-lg border p-3">
            <b>Marketing</b> — birthday greetings. Opt-in only; never after STOP.
          </li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          STOP / &quot;Don&apos;t contact me&quot; turns everything off except essential messages (the hospital cancelling a booking, emergencies). Patients reply START or ask reception to opt back in.
        </p>
      </SectionCard>

      {editable && (
        <div className="flex justify-end lg:col-span-2">
          <Button size="lg" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save settings
          </Button>
        </div>
      )}
    </div>
  );
}

/** Pick a moment in the next 24 hours: which rules would fire, to whom, with which text (dry run) */
function PreviewWorld() {
  const [hours, setHours] = useState(12);
  const preview = useMutation({
    mutationFn: () =>
      apiFetch<PreviewItem[]>("/automation/preview-world", {
        method: "POST",
        body: { at: new Date(Date.now() + hours * 3600e3).toISOString() },
      }),
  });
  const tone = (d: string) => (d === "send" ? "success" : d.startsWith("defer") ? "waiting" : d.startsWith("error") ? "danger" : "neutral");
  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Eye className="size-4" /> Preview world
        </span>
      }
      description="A dry run: nothing is saved or sent. Shows queued jobs and what the planners would add, checked against preferences and quiet hours."
      action={
        <div className="flex items-center gap-2">
          <NativeSelect className="w-44" value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label="Until">
            {[1, 3, 6, 12, 18, 23].map((h) => (
              <option key={h} value={h}>
                Until +{h} hour{h > 1 ? "s" : ""}
              </option>
            ))}
          </NativeSelect>
          <Button disabled={preview.isPending} onClick={() => preview.mutate()}>
            {preview.isPending ? <Loader2 className="animate-spin" /> : <Eye />} Preview
          </Button>
        </div>
      }
      className="mt-6"
    >
      {!preview.data ? (
        <p className="text-sm text-muted-foreground">Choose a time and press Preview.</p>
      ) : preview.data.length === 0 ? (
        <EmptyState icon={Eye} title="Nothing would be sent" description="No rule would fire in this window." />
      ) : (
        <ul className="divide-y rounded-lg border">
          {preview.data.map((p, i) => (
            <li key={i} className="space-y-1 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-28 shrink-0 text-xs text-muted-foreground tabular-nums">{when(p.scheduledFor)}</span>
                <span className="font-medium text-heading">{p.title}</span>
                <span className="text-muted-foreground">→ {p.patient ? `${p.patient.name} (${p.patient.patientCode})` : p.to}</span>
                <StatusBadge tone={tone(p.decision)}>{p.decision}</StatusBadge>
                {!p.alreadyQueued && <StatusBadge tone="info">would be planned</StatusBadge>}
              </div>
              {p.text && <p className="line-clamp-2 pl-0 text-xs whitespace-pre-wrap text-muted-foreground sm:pl-30">{p.text}</p>}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function SettingsTab() {
  const { can } = useAuth();
  const settings = useQuery({ queryKey: ["automation", "settings"], queryFn: () => apiFetch<AutomationSettings>("/automation/settings") });
  if (!settings.data) return <Skeleton className="h-96" />;
  return (
    <>
      <SettingsForm key={settings.dataUpdatedAt} initial={settings.data} />
      {can("automation:manage") && <PreviewWorld />}
    </>
  );
}
