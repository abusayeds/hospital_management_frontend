"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Loader2, Play, Send, Settings2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CATEGORY_LABEL, CONFIG_LABELS, Rule, RuleConfig, Template, when } from "./types";

const CHANNEL_CHOICES: Record<string, RuleConfig["channels"]> = {
  "whatsapp,sms": ["whatsapp", "sms"],
  whatsapp: ["whatsapp"],
  sms: ["sms"],
};
const BASE_KEYS = ["quietHoursOverride", "dailyLimit", "channels", "templateKey"];

function RuleCard({ rule, onEdit }: { rule: Rule; onEdit: () => void }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => apiFetch(`/automation/rules/${rule.key}`, { method: "PATCH", body: { enabled } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation"] }),
  });
  const run = useMutation({
    mutationFn: () => apiFetch<{ created: number; planned: number }>(`/automation/rules/${rule.key}/run`, { method: "POST" }),
    onSuccess: (r) => {
      toast.success(`Planner ran: ${r.planned} candidate(s), ${r.created} new job(s)`);
      queryClient.invalidateQueries({ queryKey: ["automation"] });
    },
  });
  const s = rule.last24h;
  return (
    <article className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-card">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-heading">{rule.title}</h3>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{rule.trigger}</p>
        </div>
        <Switch
          checked={rule.enabled}
          disabled={!can("automation:manage") || toggle.isPending}
          onCheckedChange={(v) => toggle.mutate(v)}
          aria-label={`${rule.enabled ? "Disable" : "Enable"} ${rule.title}`}
        />
      </header>
      <p className="line-clamp-3 text-sm text-muted-foreground">{rule.description}</p>
      <div className="flex flex-wrap gap-1.5">
        <StatusBadge tone={rule.enabled ? "success" : "neutral"}>{rule.enabled ? "Enabled" : "Off"}</StatusBadge>
        <StatusBadge tone={rule.category === "marketing" ? "waiting" : rule.essential ? "danger" : "info"}>
          {CATEGORY_LABEL[rule.category]}
        </StatusBadge>
        {rule.lastRun && <StatusBadge tone={rule.lastRun.ok ? "success" : "danger"}>Last run {rule.lastRun.ok ? "ok" : "failed"}</StatusBadge>}
      </div>
      <dl className="grid grid-cols-4 gap-2 rounded-lg bg-muted/50 p-2 text-center text-xs">
        {(
          [
            ["Planned", s.planned],
            ["Sent", s.sent],
            ["Cancelled", s.cancelled],
            ["Failed", s.failed],
          ] as const
        ).map(([label, n]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={`text-base font-semibold tabular-nums ${label === "Failed" && n ? "text-destructive" : "text-heading"}`}>{n}</dd>
          </div>
        ))}
      </dl>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        Next send: {when(rule.nextSendAt)} {rule.openJobs ? `· ${rule.openJobs} queued` : ""}
        {rule.lastRun && ` · last run ${when(rule.lastRun.at)}`}
      </p>
      {can("automation:manage") && (
        <div className="mt-auto flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Settings2 /> Edit
          </Button>
          {rule.cadenceMinutes && (
            <Button variant="ghost" size="sm" disabled={run.isPending || !rule.enabled} onClick={() => run.mutate()} title="Run the planner now">
              {run.isPending ? <Loader2 className="animate-spin" /> : <Play />} Run now
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

function RuleEditor({ rule, templates, onClose }: { rule: Rule; templates: Template[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(rule.enabled);
  const [config, setConfig] = useState<Record<string, unknown>>(() => ({ ...rule.config }));
  const [phone, setPhone] = useState("");
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const set = (k: string, v: unknown) => setConfig((c) => ({ ...c, [k]: v }));

  const save = useMutation({
    mutationFn: () => apiFetch(`/automation/rules/${rule.key}`, { method: "PATCH", body: { enabled, config } }),
    onSuccess: () => {
      toast.success("Rule saved");
      queryClient.invalidateQueries({ queryKey: ["automation"] });
      onClose();
    },
  });
  const test = useMutation({
    mutationFn: () =>
      apiFetch<{ outbox: { status: string; channel: string; error: string | null } }>(`/automation/rules/${rule.key}/test`, {
        method: "POST",
        body: { phone, language: lang },
      }),
    onSuccess: (r) =>
      r.outbox.status === "failed"
        ? toast.error(`Test not delivered: ${r.outbox.error ?? "unknown error"}`)
        : toast.success(`Test sent via ${r.outbox.channel} — check the phone`),
  });
  const fieldError = (k: string) =>
    save.error instanceof ApiError ? save.error.fieldErrors.find((f) => f.path.endsWith(`.${k}`))?.message : undefined;

  const own = Object.keys(rule.defaults).filter((k) => !BASE_KEYS.includes(k));
  const isStaff = rule.category === "internal";

  return (
    <div className="space-y-6 p-5">
      <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
        <span>
          <span className="font-medium text-heading">Enabled</span>
          <span className="block text-sm text-muted-foreground">Off = nothing is planned and queued jobs are cancelled when due.</span>
        </span>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </label>

      {own.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-heading">Timing and details</h3>
          {own.map((k) => {
            const v = config[k];
            const meta = CONFIG_LABELS[k] ?? { label: k };
            const err = fieldError(k);
            return (
              <div key={k} className="space-y-1.5">
                <Label htmlFor={`cfg-${k}`}>{meta.label}</Label>
                <Input
                  id={`cfg-${k}`}
                  type={typeof rule.defaults[k] === "number" ? "number" : k === "sendAt" ? "time" : "text"}
                  value={Array.isArray(v) ? v.join(", ") : String(v ?? "")}
                  aria-invalid={Boolean(err)}
                  onChange={(e) =>
                    set(
                      k,
                      typeof rule.defaults[k] === "number"
                        ? Number(e.target.value)
                        : Array.isArray(rule.defaults[k])
                          ? e.target.value.split(",").map((x) => x.trim()).filter(Boolean)
                          : e.target.value,
                    )
                  }
                />
                {err ? <p className="text-xs text-destructive">{err}</p> : meta.hint && <p className="text-xs text-muted-foreground">{meta.hint}</p>}
              </div>
            );
          })}
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-heading">Delivery</h3>
        {!isStaff && (
          <div className="space-y-1.5">
            <Label htmlFor="cfg-channels">Channel order</Label>
            <NativeSelect
              id="cfg-channels"
              value={(config.channels as string[]).join(",")}
              onChange={(e) => set("channels", CHANNEL_CHOICES[e.target.value])}
            >
              <option value="whatsapp,sms">WhatsApp, then SMS fallback</option>
              <option value="whatsapp">WhatsApp only</option>
              <option value="sms">SMS only</option>
            </NativeSelect>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="cfg-template">Template</Label>
          <NativeSelect id="cfg-template" value={String(config.templateKey)} onChange={(e) => set("templateKey", e.target.value)}>
            {templates.map((t) => (
              <option key={t.key} value={t.key}>
                {t.key} — {t.description}
              </option>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">Each template has Bangla and English text; the patient&apos;s language preference decides.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cfg-limit">{CONFIG_LABELS.dailyLimit.label}</Label>
          <Input id="cfg-limit" type="number" min={1} value={Number(config.dailyLimit)} onChange={(e) => set("dailyLimit", Number(e.target.value))} />
        </div>
        {!isStaff && (
          <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
            <span className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-warn" /> {CONFIG_LABELS.quietHoursOverride.label}
            </span>
            <Switch checked={Boolean(config.quietHoursOverride)} onCheckedChange={(v) => set("quietHoursOverride", v)} />
          </label>
        )}
      </section>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending && <Loader2 className="animate-spin" />} Save rule
        </Button>
      </div>

      {!isStaff && (
        <section className="space-y-3 rounded-lg border border-dashed p-4">
          <h3 className="text-sm font-semibold text-heading">Test send to me</h3>
          <p className="text-xs text-muted-foreground">Sends the template with sample data, marked [TEST], to a real WhatsApp number.</p>
          <div className="flex flex-wrap gap-2">
            <Input className="min-w-40 flex-1" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Your phone" />
            <NativeSelect className="w-28" value={lang} onChange={(e) => setLang(e.target.value as "bn" | "en")} aria-label="Language">
              <option value="bn">বাংলা</option>
              <option value="en">English</option>
            </NativeSelect>
            <Button variant="secondary" disabled={!phone || test.isPending} onClick={() => test.mutate()}>
              {test.isPending ? <Loader2 className="animate-spin" /> : <Send />} Send test
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

export function RulesTab() {
  const rules = useQuery({ queryKey: ["automation", "rules"], queryFn: () => apiFetch<Rule[]>("/automation/rules"), refetchInterval: 30_000 });
  const templates = useQuery({ queryKey: ["automation", "templates"], queryFn: () => apiFetch<Template[]>("/automation/templates") });
  const [editing, setEditing] = useState<Rule | null>(null);

  if (!rules.data)
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    );
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rules.data.map((r) => (
          <RuleCard key={r.key} rule={r} onEdit={() => setEditing(r)} />
        ))}
      </div>
      <Sheet open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto data-[side=right]:sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle className="text-lg font-semibold text-heading">{editing?.title}</SheetTitle>
            <SheetDescription>{editing?.description}</SheetDescription>
          </SheetHeader>
          {editing && <RuleEditor key={editing.key} rule={editing} templates={templates.data ?? []} onClose={() => setEditing(null)} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
