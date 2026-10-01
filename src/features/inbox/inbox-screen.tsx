"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Globe,
  Hand,
  Loader2,
  MessageCircle,
  MessagesSquare,
  Search,
  SendHorizontal,
  ShieldCheck,
  StickyNote,
  Undo2,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { RequirePermission } from "@/components/shared/forbidden";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLiveEvents } from "@/lib/socket";
import { cn } from "@/lib/utils";

type Status = "bot_active" | "needs_human" | "human_active" | "resolved";
type ListItem = {
  id: string;
  channel: "web" | "whatsapp";
  displayName: string;
  verified: boolean;
  status: Status;
  emergency: boolean;
  tags: string[];
  lastPreview: string;
  lastMessageAt: string;
  unreadCount: number;
  handoverReason: string | null;
  assignedTo: { id: string; name: string } | null;
};
type Msg = {
  id: string;
  direction: "inbound" | "outbound";
  sender: "patient" | "bot" | "staff" | "system";
  staffName: string | null;
  text: string;
  toolCalls: { name: string; resultSummary: string; success: boolean }[];
  guardFlags: string[];
  deliveryStatus: string | null;
  deliveryError: string | null;
  createdAt: string;
};
type Detail = {
  conversation: ListItem & {
    phone: string | null;
    language: string;
    notes: { id: string; text: string; byName: string; at: string }[];
    metrics: { messageCount: number; toolCallCount: number; bookingsCreated: number; handoverCount: number };
    withinWhatsAppWindow: boolean;
  };
  messages: Msg[];
  context: {
    patients: { id: string; name: string; patientCode: string; age: number; gender: string }[];
    appointments: { id: string; patient: string; doctor: string; date: string; slotTime: string; serialNo: number; status: string; source: string }[];
  };
};

const FILTERS: { id: string; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "needs_human", label: "Needs human" },
  { id: "emergency", label: "Emergency" },
  { id: "human_active", label: "Human active" },
  { id: "bot_active", label: "Bot active" },
  { id: "resolved", label: "Resolved" },
  { id: "all", label: "All" },
];

const STATUS_TONE: Record<Status, { tone: "waiting" | "active" | "info" | "neutral"; label: string }> = {
  needs_human: { tone: "waiting", label: "Needs human" },
  human_active: { tone: "active", label: "Staff handling" },
  bot_active: { tone: "info", label: "Assistant" },
  resolved: { tone: "neutral", label: "Resolved" },
};

// Friendly names for the "Assistant checked …" chips
const TOOL_TEXT: Record<string, string> = {
  get_hospital_info: "hospital info",
  search_knowledge_base: "the knowledge base",
  list_departments: "departments",
  search_doctors: "doctors",
  get_available_slots: "doctor availability",
  get_test_preparation: "test preparation",
  start_verification: "sent a verification code",
  verify_code: "the verification code",
  list_my_patients: "patients on this phone",
  register_patient: "registered a patient",
  book_appointment: "a booking summary",
  get_my_appointments: "appointments",
  cancel_appointment: "a cancellation",
  reschedule_appointment: "a new time",
  get_queue_status: "the live queue",
  get_lab_report_status: "lab report status",
  request_human: "asked for a staff member",
};

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (m < 60 * 24) return `${Math.floor(m / 60)}h`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit" });

function ToolChips({ calls }: { calls: Msg["toolCalls"] }) {
  const [open, setOpen] = useState(false);
  if (!calls.length) return null;
  return (
    <div className="mt-1 text-xs">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
        <Wrench className="size-3" /> Assistant checked {calls.map((c) => TOOL_TEXT[c.name] ?? c.name).join(", ")}
        <ChevronDown className={cn("size-3 transition", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5 rounded-md bg-muted px-2 py-1.5 font-mono text-[11px]">
          {calls.map((c, i) => (
            <li key={i} className={c.success ? "" : "text-status-danger-fg"}>
              {c.name} → {c.resultSummary}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Transcript({ messages }: { messages: Msg[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);
  return (
    <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 px-4 py-4" role="log" aria-label="Transcript">
      {messages.map((m) =>
        m.sender === "system" ? (
          <p key={m.id} className="mx-auto max-w-md rounded-full bg-muted px-3 py-1 text-center text-xs text-muted-foreground">
            {m.text}
          </p>
        ) : (
          <div key={m.id} className={cn("flex flex-col", m.sender === "patient" ? "items-start" : "items-end")}>
            <span className="mb-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              {m.sender === "patient" ? "Patient" : m.sender === "bot" ? (
                <>
                  <Bot className="size-3" /> Assistant
                </>
              ) : (
                m.staffName ?? "Staff"
              )}{" "}
              · {clock(m.createdAt)}
              {m.deliveryStatus && m.deliveryStatus !== "pending" && ` · ${m.deliveryStatus}`}
            </span>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap",
                m.sender === "patient" && "rounded-bl-md border bg-card",
                m.sender === "bot" && "rounded-br-md bg-status-info-bg text-status-info-fg",
                m.sender === "staff" && "rounded-br-md bg-primary text-primary-foreground",
              )}
            >
              {m.text}
            </div>
            {m.sender === "bot" && <ToolChips calls={m.toolCalls} />}
            {m.guardFlags.filter((f) => !["pre_check"].includes(f)).length > 0 && (
              <span className="mt-0.5 text-[11px] text-status-waiting-fg">Safety: {m.guardFlags.join(", ")}</span>
            )}
            {m.deliveryError && <span className="mt-0.5 text-[11px] text-status-danger-fg">Not delivered: {m.deliveryError}</span>}
          </div>
        ),
      )}
      <div ref={endRef} />
    </div>
  );
}

function ContextPane({ d, onChanged }: { d: Detail; onChanged: () => void }) {
  const { can } = useAuth();
  const [note, setNote] = useState("");
  const [tags, setTags] = useState(d.conversation.tags.join(", "));
  const c = d.conversation;
  const saveTags = useMutation({
    mutationFn: () => apiFetch(`/assistant/inbox/conversations/${c.id}/tags`, { method: "PUT", body: { tags: tags.split(",").map((t) => t.trim()).filter(Boolean) } }),
    onSuccess: () => {
      toast.success("Tags saved");
      onChanged();
    },
  });
  const addNote = useMutation({
    mutationFn: () => apiFetch(`/assistant/inbox/conversations/${c.id}/notes`, { method: "POST", body: { text: note } }),
    onSuccess: () => {
      setNote("");
      onChanged();
    },
  });
  return (
    <aside className="space-y-5 overflow-y-auto border-l p-4 text-sm">
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Contact</p>
        <p className="flex items-center gap-1.5">
          {c.channel === "whatsapp" ? <MessageCircle className="size-4" /> : <Globe className="size-4" />}
          {c.channel === "whatsapp" ? "WhatsApp" : "Web chat"}
        </p>
        <p>
          {c.phone ?? "No phone yet"}{" "}
          {c.verified && (
            <span className="inline-flex items-center gap-0.5 text-status-success-fg">
              <ShieldCheck className="size-3.5" /> verified
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {c.metrics.messageCount} messages · {c.metrics.bookingsCreated} bookings · language {c.language}
        </p>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Patients on this phone</p>
        {d.context.patients.length === 0 ? (
          <p className="text-muted-foreground">None</p>
        ) : (
          d.context.patients.map((p) => (
            <p key={p.id}>
              {can("patient:read_basic") ? (
                <Link href={`/reception/patients/${p.id}`} className="font-medium text-primary underline">
                  {p.name}
                </Link>
              ) : (
                <span className="font-medium">{p.name}</span>
              )}{" "}
              <span className="text-muted-foreground">
                · {p.patientCode} · {p.age} y
              </span>
            </p>
          ))
        )}
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Upcoming appointments</p>
        {d.context.appointments.length === 0 ? (
          <p className="text-muted-foreground">None</p>
        ) : (
          d.context.appointments.map((a) => (
            <div key={a.id} className="rounded-lg border px-2.5 py-1.5">
              <p className="font-medium">
                {a.date} {a.slotTime} · Serial {a.serialNo}
              </p>
              <p className="text-xs text-muted-foreground">
                {a.patient} · {a.doctor} · {a.source}
              </p>
            </div>
          ))
        )}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="inbox-tags" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Tags
        </label>
        <div className="flex gap-2">
          <Input id="inbox-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="billing, callback" />
          <Button size="sm" variant="outline" disabled={saveTags.isPending} onClick={() => saveTags.mutate()}>
            Save
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="flex items-center gap-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <StickyNote className="size-3.5" /> Internal notes
        </p>
        {c.notes.map((n) => (
          <p key={n.id} className="rounded-lg bg-status-waiting-bg/50 px-2.5 py-1.5">
            {n.text}
            <span className="block text-[11px] text-muted-foreground">
              {n.byName} · {clock(n.at)}
            </span>
          </p>
        ))}
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Only staff see notes" aria-label="New note" />
        <Button size="sm" variant="outline" disabled={!note.trim() || addNote.isPending} onClick={() => addNote.mutate()}>
          Add note
        </Button>
      </div>
    </aside>
  );
}

function ConversationPane({ id, onChanged }: { id: string; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const key = ["inbox", "conversation", id];
  const detail = useQuery({ queryKey: key, queryFn: () => apiFetch<Detail>(`/assistant/inbox/conversations/${id}`) });
  const canned = useQuery({ queryKey: ["inbox", "canned"], queryFn: () => apiFetch<{ id: string; label: string; text: string }[]>("/assistant/inbox/canned"), staleTime: Infinity });
  const [text, setText] = useState("");
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: key });
    onChanged();
  };
  const action = useMutation({
    mutationFn: (path: "takeover" | "handback" | "resolve") => apiFetch<Detail>(`/assistant/inbox/conversations/${id}/${path}`, { method: "POST" }),
    onSuccess: (d, path) => {
      queryClient.setQueryData(key, d);
      onChanged();
      toast.success(path === "takeover" ? "You are handling this chat — the assistant is paused" : path === "handback" ? "Handed back to the assistant" : "Marked as resolved");
    },
  });
  const reply = useMutation({
    mutationFn: () => apiFetch(`/assistant/inbox/conversations/${id}/reply`, { method: "POST", body: { text } }),
    onSuccess: () => {
      setText("");
      refresh();
    },
    onError: () => refresh(),
  });

  if (!detail.data) return <Skeleton className="m-4 h-96" />;
  const d = detail.data;
  const c = d.conversation;
  const mine = c.assignedTo?.id === user?.id;

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_300px]">
      <section className="flex min-h-0 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
          <p className="font-semibold text-heading">{c.displayName}</p>
          <StatusBadge tone={STATUS_TONE[c.status].tone}>{STATUS_TONE[c.status].label}</StatusBadge>
          {c.emergency && (
            <StatusBadge tone="danger">
              <AlertTriangle className="size-3" /> Emergency
            </StatusBadge>
          )}
          {c.handoverReason && c.status !== "resolved" && <span className="text-xs text-muted-foreground">· {c.handoverReason}</span>}
          <div className="ml-auto flex gap-1.5">
            {c.status !== "human_active" && (
              <Button size="sm" disabled={action.isPending} onClick={() => action.mutate("takeover")}>
                <Hand /> Take over
              </Button>
            )}
            {c.status === "human_active" && (
              <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => action.mutate("handback")}>
                <Undo2 /> Hand back to bot
              </Button>
            )}
            {c.status !== "resolved" && (
              <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => action.mutate("resolve")}>
                <CheckCircle2 /> Resolve
              </Button>
            )}
          </div>
        </div>
        <Transcript messages={d.messages} />
        <form
          className="space-y-2 border-t p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) reply.mutate();
          }}
        >
          {!c.withinWhatsAppWindow && (
            <p className="text-xs text-status-waiting-fg">The patient&apos;s last WhatsApp message is older than 24 hours — free text cannot be sent (templates come in Phase 6).</p>
          )}
          {c.status === "human_active" && !mine && c.assignedTo && <p className="text-xs text-muted-foreground">{c.assignedTo.name} is handling this chat.</p>}
          <div className="flex flex-wrap gap-1.5">
            {canned.data?.map((q) => (
              <button key={q.id} type="button" onClick={() => setText(q.text)} className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted">
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <Textarea
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && text.trim()) reply.mutate();
              }}
              placeholder={c.status === "human_active" ? "Reply to the patient (Ctrl+Enter to send)" : "Replying takes over the chat from the assistant"}
              aria-label="Reply"
              className="font-bangla"
            />
            <Button type="submit" size="lg" disabled={!text.trim() || reply.isPending || !c.withinWhatsAppWindow}>
              {reply.isPending ? <Loader2 className="animate-spin" /> : <SendHorizontal />} Send
            </Button>
          </div>
        </form>
      </section>
      <ContextPane d={d} onChanged={refresh} />
    </div>
  );
}

/** Staff inbox: assistant conversations, live — take over, reply, hand back, resolve */
export function InboxScreen() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("open");
  const [channel, setChannel] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const params = new URLSearchParams({ filter, limit: "50", ...(channel && { channel }), ...(q && { q }) });
  const list = useQuery({ queryKey: ["inbox", "list", filter, channel, q], queryFn: () => apiFetchPage<ListItem>(`/assistant/inbox/conversations?${params}`) });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["inbox"] }), [queryClient]);
  useLiveEvents(["inbox:updated", "inbox:alert"], refresh);

  return (
    <RequirePermission permission="inbox:manage">
      <div className="flex h-[calc(100dvh-9rem)] min-h-[520px] flex-col overflow-hidden rounded-xl border bg-card shadow-card lg:h-[calc(100dvh-11rem)] lg:flex-row">
        <aside className={cn("flex min-h-0 flex-col border-r bg-card lg:w-80", openId && "hidden lg:flex")}>
          <div className="space-y-2 border-b p-3">
            <h1 className="flex items-center gap-2 text-lg font-semibold text-heading">
              <MessagesSquare className="size-5" /> Inbox
            </h1>
            <div className="flex flex-wrap gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={cn("rounded-full border px-2.5 py-1 text-xs", filter === f.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-9 pl-8" aria-label="Search conversations" />
              </div>
              <NativeSelect value={channel} onChange={(e) => setChannel(e.target.value)} aria-label="Channel" className="h-9 w-28 text-sm">
                <option value="">All</option>
                <option value="web">Web</option>
                <option value="whatsapp">WhatsApp</option>
              </NativeSelect>
            </div>
          </div>
          <ul className="flex-1 divide-y overflow-y-auto">
            {!list.data ? (
              <Skeleton className="m-3 h-40" />
            ) : list.data.items.length === 0 ? (
              <EmptyState icon={MessagesSquare} title="Nothing here" description="Conversations appear live as patients write." />
            ) : (
              list.data.items.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(c.id)}
                    className={cn(
                      "flex w-full gap-2 px-3 py-2.5 text-left hover:bg-muted/60",
                      openId === c.id && "bg-muted",
                      c.emergency && "border-l-4 border-l-status-danger-dot bg-status-danger-bg/40",
                    )}
                  >
                    {c.channel === "whatsapp" ? <MessageCircle className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <Globe className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-heading">
                        <span className="truncate">{c.displayName}</span>
                        {c.emergency && <AlertTriangle className="size-3.5 shrink-0 text-status-danger-fg" aria-label="Emergency" />}
                        <span className="ml-auto shrink-0 text-[11px] font-normal text-muted-foreground">{ago(c.lastMessageAt)}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{c.lastPreview}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <StatusBadge tone={STATUS_TONE[c.status].tone}>{STATUS_TONE[c.status].label}</StatusBadge>
                        {c.unreadCount > 0 && <span className="ml-auto rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">{c.unreadCount}</span>}
                      </div>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>
        <main className={cn("flex min-h-0 flex-1 flex-col bg-card", !openId && "hidden lg:flex")}>
          {openId ? (
            <>
              <button type="button" onClick={() => setOpenId(null)} className="border-b px-4 py-2 text-left text-sm text-primary lg:hidden">
                ← Conversations
              </button>
              <ConversationPane key={openId} id={openId} onChanged={refresh} />
            </>
          ) : (
            <EmptyState icon={MessagesSquare} title="Choose a conversation" description="Emergencies are pinned at the top in red." className="m-auto" />
          )}
        </main>
      </div>
    </RequirePermission>
  );
}
