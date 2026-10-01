"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Loader2, MessageSquareText, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { Template, TemplatePreview, when } from "./types";

const CATEGORIES: Record<string, string> = {
  confirmation: "Confirmation",
  reminder: "Reminder",
  follow_up: "Follow-up",
  no_show: "No-show",
  report: "Report",
  promotion: "Promotion",
  alert: "Staff alert",
  service: "Service",
};

/** A phone-like bubble: what the patient will see */
function Bubble({ text, buttons, label }: { text: string; buttons: string[]; label: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="max-w-sm rounded-2xl rounded-tl-sm bg-chat-out p-3 text-sm whitespace-pre-wrap shadow-sm">
        {text || <span className="italic opacity-60">empty</span>}
      </div>
      {buttons.length > 0 && (
        <div className="flex max-w-sm flex-wrap gap-1">
          {buttons.map((b, i) => (
            <span key={i} className="flex-1 rounded-lg border bg-card px-2 py-1.5 text-center text-xs font-medium text-primary">
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateEditor({ template, onClose }: { template: Template; onClose: () => void }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => ({
    description: template.description,
    isActive: template.isActive,
    bodies: { ...template.bodies },
    buttons: template.buttons.map((b) => ({ action: b.action, label: { ...b.label } })),
    whatsappTemplateName: template.whatsappTemplateName,
    whatsappLanguages: { ...template.whatsappLanguages },
    whatsappParams: [...template.whatsappParams],
    variables: template.variables.map((v) => ({ ...v })),
  }));
  const debounced = useDebouncedValue(draft, 400);
  const preview = useQuery({
    queryKey: ["automation", "template-preview", debounced],
    queryFn: () =>
      apiFetch<TemplatePreview>("/automation/templates/preview", {
        method: "POST",
        body: {
          bodies: debounced.bodies,
          buttons: debounced.buttons,
          whatsappTemplateName: debounced.whatsappTemplateName,
          whatsappLanguages: debounced.whatsappLanguages,
          whatsappParams: debounced.whatsappParams,
          variables: debounced.variables,
        },
      }),
    meta: { silent: true },
  });
  const save = useMutation({
    mutationFn: () => apiFetch<Template>(`/automation/templates/${template.key}`, { method: "PATCH", body: draft }),
    onSuccess: (t) => {
      toast.success(`Saved as version ${t.version}`);
      queryClient.invalidateQueries({ queryKey: ["automation", "templates"] });
      onClose();
    },
  });
  const rollback = useMutation({
    mutationFn: (version: number) => apiFetch<Template>(`/automation/templates/${template.key}/rollback`, { method: "POST", body: { version } }),
    onSuccess: (t) => {
      toast.success(`Restored — now version ${t.version}`);
      queryClient.invalidateQueries({ queryKey: ["automation", "templates"] });
      onClose();
    },
  });
  const editable = can("automation:manage");
  const errors = preview.data?.errors ?? [];

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="tpl-desc">Description</Label>
          <Input id="tpl-desc" value={draft.description} disabled={!editable} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </div>
        {(["bn", "en"] as const).map((lang) => (
          <div key={lang} className="space-y-1.5">
            <Label htmlFor={`tpl-${lang}`}>{lang === "bn" ? "বাংলা text" : "English text"}</Label>
            <Textarea
              id={`tpl-${lang}`}
              rows={6}
              className={cn(lang === "bn" && "font-bangla")}
              disabled={!editable}
              value={draft.bodies[lang]}
              onChange={(e) => setDraft({ ...draft, bodies: { ...draft.bodies, [lang]: e.target.value } })}
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Variables (use as {"{{name}}"}) · sample data for the preview</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {draft.variables.map((v, i) => (
              <label key={v.name} className="flex items-center gap-2 rounded-lg border px-2 py-1 text-xs">
                <code className="shrink-0 font-mono text-primary">{v.name}</code>
                <span className="shrink-0 text-muted-foreground">{v.type}</span>
                <input
                  className="min-w-0 flex-1 bg-transparent px-1 py-1 outline-none"
                  value={v.sample}
                  disabled={!editable}
                  aria-label={`Sample for ${v.name}`}
                  onChange={(e) => {
                    const variables = [...draft.variables];
                    variables[i] = { ...v, sample: e.target.value };
                    setDraft({ ...draft, variables });
                  }}
                />
              </label>
            ))}
          </div>
        </div>
        {draft.buttons.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Reply buttons (max 20 characters)</p>
            {draft.buttons.map((b, i) => (
              <div key={b.action} className="flex items-center gap-2">
                <code className="w-24 shrink-0 font-mono text-xs text-muted-foreground">{b.action}</code>
                {(["bn", "en"] as const).map((lang) => (
                  <Input
                    key={lang}
                    maxLength={20}
                    disabled={!editable}
                    className={cn(lang === "bn" && "font-bangla")}
                    aria-label={`${b.action} label ${lang}`}
                    value={b.label[lang]}
                    onChange={(e) => {
                      const buttons = [...draft.buttons];
                      buttons[i] = { ...b, label: { ...b.label, [lang]: e.target.value } };
                      setDraft({ ...draft, buttons });
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-wa">WhatsApp approved template name</Label>
            <Input
              id="tpl-wa"
              disabled={!editable}
              placeholder="none — only inside 24 h"
              value={draft.whatsappTemplateName ?? ""}
              onChange={(e) => setDraft({ ...draft, whatsappTemplateName: e.target.value || null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-params">Parameters {"{{1}}, {{2}} …"}</Label>
            <Input
              id="tpl-params"
              disabled={!editable}
              value={draft.whatsappParams.join(", ")}
              onChange={(e) => setDraft({ ...draft, whatsappParams: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
            />
          </div>
        </div>
        <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
          Active (an inactive template makes its rule&apos;s jobs fail visibly)
          <Switch checked={draft.isActive} disabled={!editable} onCheckedChange={(v) => setDraft({ ...draft, isActive: v })} />
        </label>
        {editable && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button disabled={save.isPending || errors.length > 0} onClick={() => save.mutate()}>
              {save.isPending && <Loader2 className="animate-spin" />} Save as v{template.version + 1}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {errors.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {errors.map((e) => (
              <li key={e}>• {e}</li>
            ))}
          </ul>
        )}
        {!preview.data ? (
          <div className="h-60 animate-pulse rounded-xl bg-muted" />
        ) : (
          (["bn", "en"] as const).map((lang) => {
            const p = preview.data.preview[lang];
            return (
              <div key={lang} className="space-y-3 rounded-xl border bg-muted/30 p-4">
                <p className="text-sm font-semibold text-heading">{lang === "bn" ? "বাংলা" : "English"}</p>
                <Bubble label="Inside WhatsApp's 24-hour window (session message)" text={p.session.text} buttons={p.session.buttons} />
                {p.template ? (
                  <div className="space-y-1 text-xs">
                    <p className="font-medium text-muted-foreground">Outside 24 h → approved template</p>
                    <p className="font-mono">
                      {p.template.name} ({p.template.language})
                    </p>
                    <ol className="list-inside list-decimal text-muted-foreground">
                      {p.template.parameters.map((v, i) => (
                        <li key={i}>
                          {"{{"}
                          {i + 1}
                          {"}}"} = {v}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No approved template: outside 24 h this message falls back to SMS.</p>
                )}
              </div>
            );
          })
        )}
        {template.history.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-heading">
              <History className="size-4" /> Version history
            </p>
            <ul className="divide-y rounded-lg border text-sm">
              {template.history.map((h) => (
                <li key={h.version} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0 truncate">
                    v{h.version} · {when(h.savedAt)} · <span className="text-muted-foreground">{h.bodies.en.slice(0, 50)}…</span>
                  </span>
                  {editable && (
                    <Button variant="ghost" size="xs" disabled={rollback.isPending} onClick={() => rollback.mutate(h.version)}>
                      <RotateCcw /> Restore
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function TemplatesTab() {
  const [category, setCategory] = useState("");
  const templates = useQuery({
    queryKey: ["automation", "templates", category],
    queryFn: () => apiFetch<Template[]>(`/automation/templates${category ? `?category=${category}` : ""}`),
  });
  const [editing, setEditing] = useState<Template | null>(null);

  const columns: DataTableColumn<Template>[] = [
    {
      key: "key",
      header: "Template",
      cell: (t) => (
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium text-heading">{t.key}</p>
          <p className="truncate text-xs text-muted-foreground">{t.description}</p>
        </div>
      ),
    },
    { key: "category", header: "Category", className: "hidden md:table-cell", cell: (t) => CATEGORIES[t.category] ?? t.category },
    {
      key: "wa",
      header: "Outside 24 h",
      className: "hidden lg:table-cell",
      cell: (t) => (t.whatsappTemplateName ? <code className="text-xs">{t.whatsappTemplateName}</code> : <span className="text-xs text-muted-foreground">SMS fallback</span>),
    },
    {
      key: "status",
      header: "Status",
      cell: (t) => <StatusBadge tone={t.isActive ? "success" : "neutral"}>{t.isActive ? `Active · v${t.version}` : "Off"}</StatusBadge>,
    },
  ];

  return (
    <>
      <DataTable
        data={templates.data ?? []}
        columns={columns}
        getRowId={(t) => t.key}
        isLoading={templates.isPending}
        searchText={(t) => `${t.key} ${t.description} ${t.bodies.en} ${t.bodies.bn}`}
        searchPlaceholder="Search templates…"
        onRowClick={setEditing}
        emptyTitle="No templates"
        filters={
          <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className="w-auto">
            <option value="">All categories</option>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </NativeSelect>
        }
      />
      <Sheet open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto data-[side=right]:sm:max-w-5xl">
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-heading">
              <MessageSquareText className="size-5" /> {editing?.key}
            </SheetTitle>
            <SheetDescription>Only declared variables are allowed — a mistake is caught when you save, never when a patient is messaged.</SheetDescription>
          </SheetHeader>
          {editing && <TemplateEditor key={`${editing.key}-${editing.version}`} template={editing} onClose={() => setEditing(null)} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
