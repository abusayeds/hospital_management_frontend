"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FlaskConical, Inbox, Loader2, MessageCircle, RefreshCw, Send, Smartphone, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE, apiFetch, apiFetchPage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLiveEvents } from "@/lib/socket";
import { Job, OUTBOX_TONE, OutboxRow, REASON_LABEL, Rule, when } from "./types";

const CHANNEL_ICON = { whatsapp: MessageCircle, sms: Smartphone, web: MessageCircle, inapp: Inbox } as const;
const SOURCE_LABEL: Record<OutboxRow["source"], string> = {
  automation: "Automation",
  chatbot: "Assistant",
  staff: "Staff",
  system: "System",
  test: "Test",
};

export function DecisionTimeline({ job }: { job: Job }) {
  return (
    <ol className="space-y-2 border-l pl-4 text-sm">
      {job.decisions.map((d, i) => (
        <li key={i} className="relative">
          <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-card bg-primary" />
          <span className="font-medium text-heading">{d.action}</span> · {REASON_LABEL[d.reason] ?? d.reason}
          {d.detail && <span className="text-muted-foreground"> — {d.detail}</span>}
          <span className="block text-xs text-muted-foreground">{when(d.at, true)}</span>
        </li>
      ))}
      {!job.decisions.length && <li className="text-muted-foreground">Planned {when(job.scheduledFor)} — nothing decided yet.</li>}
    </ol>
  );
}

function OutboxDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const detail = useQuery({
    queryKey: ["automation", "outbox", id],
    queryFn: () => apiFetch<OutboxRow & { job: Job | null }>(`/automation/outbox/${id}`),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["automation"] });
  const retry = useMutation({
    mutationFn: () => apiFetch<{ result: string }>(`/automation/outbox/${id}/retry`, { method: "POST" }),
    onSuccess: (r) => {
      toast.success(`Retried: ${r.result}`);
      refresh();
      onClose();
    },
  });
  const cancel = useMutation({
    mutationFn: () => apiFetch(`/automation/outbox/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Cancelled");
      refresh();
    },
  });
  const test = useMutation({
    mutationFn: () => apiFetch<{ outbox: { status: string } }>(`/automation/outbox/${id}/test`, { method: "POST", body: { phone } }),
    onSuccess: (r) => toast.success(`Test copy ${r.outbox.status}`),
  });
  const o = detail.data;
  if (!o) return <Skeleton className="m-5 h-80" />;
  return (
    <div className="space-y-6 p-5">
      <div className="flex flex-wrap gap-1.5">
        <StatusBadge tone={OUTBOX_TONE[o.status]}>{o.status}</StatusBadge>
        <StatusBadge tone="neutral">{o.channel}</StatusBadge>
        <StatusBadge tone="neutral">{o.messageKind === "template" ? `template ${o.whatsappTemplateName}` : o.messageKind}</StatusBadge>
        <StatusBadge tone="info">{SOURCE_LABEL[o.source]}</StatusBadge>
        {o.replyAction && <StatusBadge tone="success">Patient replied: {o.replyAction}</StatusBadge>}
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">To</dt>
          <dd className="font-medium">
            {o.patient?.name ? (
              <>
                {o.patient.name} <span className="text-muted-foreground">({o.patient.patientCode})</span>
              </>
            ) : (
              o.toType
            )}{" "}
            · {o.to}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Rule / template</dt>
          <dd className="font-mono text-xs">
            {o.ruleKey ?? "—"} / {o.templateKey ? `${o.templateKey} v${o.templateVersion}` : "—"}
          </dd>
        </div>
      </dl>
      <div>
        <p className="mb-1 text-sm font-medium">Exact text sent ({o.language})</p>
        <div className="rounded-xl bg-muted p-3 text-sm whitespace-pre-wrap">{o.text}</div>
        {o.buttons.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Buttons: {o.buttons.join(" · ")}</p>}
        {o.error && <p className="mt-2 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{o.error}</p>}
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Delivery</p>
        <ol className="space-y-1 text-sm">
          {o.deliveryUpdates.map((u, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-32 shrink-0 text-xs text-muted-foreground tabular-nums">{when(u.at, true)}</span>
              <StatusBadge tone={OUTBOX_TONE[u.status as OutboxRow["status"]] ?? "neutral"}>{u.status}</StatusBadge>
              {u.error && <span className="text-xs text-destructive">{u.error}</span>}
            </li>
          ))}
        </ol>
      </div>
      {o.job && (
        <div>
          <p className="mb-2 text-sm font-medium">
            Why · job <code className="text-xs">{o.job.dedupeKey}</code>
          </p>
          <DecisionTimeline job={o.job} />
        </div>
      )}
      {can("automation:manage") && (
        <div className="space-y-3 border-t pt-4">
          <div className="flex flex-wrap gap-2">
            {o.status === "failed" && o.jobId && (
              <Button disabled={retry.isPending} onClick={() => retry.mutate()}>
                {retry.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />} Retry now
              </Button>
            )}
            {o.status === "queued" && (
              <Button variant="destructive" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
                <XCircle /> Cancel
              </Button>
            )}
            {o.conversationId && (
              <Button variant="outline" render={<Link href="/admin/inbox" />} nativeButton={false}>
                Open conversation
              </Button>
            )}
          </div>
          {o.channel !== "inapp" && (
            <div className="flex flex-wrap gap-2">
              <Input className="min-w-40 flex-1" placeholder="Your phone 01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Your phone" />
              <Button variant="secondary" disabled={!phone || test.isPending} onClick={() => test.mutate()}>
                <FlaskConical /> Duplicate as test to me
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function OutboxTab() {
  const [f, setF] = useState({ q: "", from: "", to: "", channel: "", status: "", ruleKey: "", source: "" });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const params = new URLSearchParams(Object.entries({ ...f, page: String(page), limit: "25" }).filter(([, v]) => v));
  const filterOnly = new URLSearchParams(Object.entries(f).filter(([k, v]) => v && k !== "page"));
  const list = useQuery({
    queryKey: ["automation", "outbox", params.toString()],
    queryFn: () => apiFetchPage<OutboxRow>(`/automation/outbox?${params}`),
    refetchInterval: 15_000,
  });
  const rules = useQuery({ queryKey: ["automation", "rules"], queryFn: () => apiFetch<Rule[]>("/automation/rules") });
  useLiveEvents(["automation:alert"], () => queryClient.invalidateQueries({ queryKey: ["automation", "outbox"] }));
  const set = (k: keyof typeof f, v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setPage(1);
  };

  const columns: DataTableColumn<OutboxRow>[] = [
    { key: "time", header: "Time", cell: (o) => <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">{when(o.createdAt)}</span> },
    {
      key: "to",
      header: "To",
      cell: (o) => {
        const Icon = CHANNEL_ICON[o.channel];
        return (
          <div className="flex min-w-0 items-center gap-2">
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-label={o.channel} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-heading">{o.patient?.name ?? (o.toType === "patient" ? o.to : `Staff · ${o.to.replace("perm:", "")}`)}</p>
              <p className="truncate text-xs text-muted-foreground">{o.patient?.patientCode ? `${o.patient.patientCode} · ${o.to}` : o.to}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "text",
      header: "Message",
      className: "hidden md:table-cell max-w-md",
      cell: (o) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{o.text}</p>
          <p className="text-xs text-muted-foreground">
            {SOURCE_LABEL[o.source]}
            {o.ruleKey && ` · ${o.ruleKey}`}
            {o.messageKind === "template" && " · template"}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (o) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge tone={OUTBOX_TONE[o.status]}>{o.status}</StatusBadge>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={list.data?.items ?? []}
        columns={columns}
        getRowId={(o) => o.id}
        isLoading={list.isPending}
        onRowClick={(o) => setOpen(o.id)}
        searchPlaceholder="Search message text…"
        emptyTitle="No messages"
        emptyDescription="Every message the hospital sends — reminders, assistant replies, staff replies, alerts — appears here."
        server={{
          query: f.q,
          onQueryChange: (v) => set("q", v),
          page,
          pageSize: 25,
          total: list.data?.pagination.total ?? 0,
          totalPages: list.data?.pagination.totalPages ?? 1,
          onPageChange: setPage,
        }}
        filters={
          <>
            <Input type="date" className="w-auto" value={f.from} onChange={(e) => set("from", e.target.value)} aria-label="From date" />
            <Input type="date" className="w-auto" value={f.to} onChange={(e) => set("to", e.target.value)} aria-label="To date" />
            <NativeSelect className="w-auto" value={f.channel} onChange={(e) => set("channel", e.target.value)} aria-label="Channel">
              <option value="">All channels</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="web">Web chat</option>
              <option value="inapp">In-app (staff)</option>
            </NativeSelect>
            <NativeSelect className="w-auto" value={f.status} onChange={(e) => set("status", e.target.value)} aria-label="Status">
              <option value="">Any status</option>
              {Object.keys(OUTBOX_TONE).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect className="w-auto" value={f.source} onChange={(e) => set("source", e.target.value)} aria-label="Source">
              <option value="">All sources</option>
              {Object.entries(SOURCE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect className="w-auto" value={f.ruleKey} onChange={(e) => set("ruleKey", e.target.value)} aria-label="Rule">
              <option value="">All rules</option>
              {rules.data?.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.title}
                </option>
              ))}
            </NativeSelect>
          </>
        }
        toolbarActions={
          <Button variant="outline" render={<a href={`${API_BASE}/automation/outbox/export.csv?${filterOnly}`} download />} nativeButton={false}>
            <Download /> CSV
          </Button>
        }
      />
      <Sheet open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto data-[side=right]:sm:max-w-xl">
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-heading">
              <Send className="size-5" /> Message
            </SheetTitle>
            <SheetDescription>The exact text, its delivery timeline and why it was sent.</SheetDescription>
          </SheetHeader>
          {open && <OutboxDetail key={open} id={open} onClose={() => setOpen(null)} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

