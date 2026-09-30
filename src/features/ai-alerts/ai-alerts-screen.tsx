"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, CheckCircle2, MessagesSquare, Siren, UserRound } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { TableRowsSkeleton } from "@/components/shared/loading-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { RequirePermission } from "@/components/shared/forbidden";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useLiveEvents } from "@/lib/socket";
import type { ChatMessage, ChatSessionSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const LIVE_EVENTS = ["chat:handoff", "chat:resolved", "appointment:created"];

type SessionDetail = { sessionId: string; messages: ChatMessage[]; emergency: boolean; needsHuman: boolean; handoffReason?: string };

const ago = (iso: string) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  return new Date(iso).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
};

export function AiAlertsScreen() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistant Alerts"
        description="Patients the Testo Life assistant handed over to staff — emergencies first. Call them back, then mark as resolved."
      />
      <RequirePermission permission="inbox:manage">
        <AlertsContent />
      </RequirePermission>
    </div>
  );
}

function AlertsContent() {
  const queryClient = useQueryClient();
  const [onlyFlagged, setOnlyFlagged] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sessions = useQuery({
    queryKey: ["chat-sessions", onlyFlagged],
    queryFn: () => apiFetch<ChatSessionSummary[]>(`/chat/sessions${onlyFlagged ? "?flagged=true" : ""}`),
  });
  const detail = useQuery({
    queryKey: ["chat-session", selectedId],
    queryFn: () => apiFetch<SessionDetail>(`/chat/sessions/${selectedId}`),
    enabled: Boolean(selectedId),
  });

  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["chat-sessions"] }), [queryClient]);
  useLiveEvents(LIVE_EVENTS, refresh);

  const resolve = useMutation({
    mutationFn: (id: string) => apiFetch(`/chat/sessions/${id}/resolve`, { method: "PATCH" }),
    onSuccess: () => {
      toast.success("Marked as resolved");
      refresh();
      queryClient.invalidateQueries({ queryKey: ["chat-session", selectedId] });
    },
  });

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Show" className="inline-flex rounded-lg border bg-muted p-1">
        {[
          [true, "Needs staff"],
          [false, "All chats"],
        ].map(([value, label]) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => setOnlyFlagged(value as boolean)}
            aria-pressed={onlyFlagged === value}
            className={cn(
              "h-9 rounded-md px-4 text-sm font-medium",
              onlyFlagged === value ? "bg-card text-heading shadow-card" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label as string}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="space-y-2">
          {sessions.isPending && (
            <div className="rounded-xl border bg-card">
              <TableRowsSkeleton rows={4} columns={2} />
            </div>
          )}
          {sessions.data?.length === 0 && (
            <div className="rounded-xl border bg-card shadow-card">
              <EmptyState
                icon={onlyFlagged ? CheckCircle2 : MessagesSquare}
                title={onlyFlagged ? "No pending alerts" : "No chats yet"}
                description={onlyFlagged ? "Everyone the assistant handed over has been contacted." : undefined}
              />
            </div>
          )}
          {sessions.data?.map((s) => (
            <button
              key={s.sessionId}
              type="button"
              onClick={() => setSelectedId(s.sessionId)}
              className={cn(
                "w-full rounded-xl border bg-card p-4 text-left shadow-card transition-colors hover:border-primary",
                selectedId === s.sessionId && "border-primary ring-1 ring-primary",
                s.emergency && s.needsHuman && "border-status-danger-border",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                {s.emergency ? (
                  <StatusBadge status="emergency" />
                ) : s.needsHuman ? (
                  <StatusBadge tone="waiting">Needs staff</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">Chat</StatusBadge>
                )}
                {s.appointments > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-status-success-fg">
                    <CalendarCheck className="size-3.5" /> {s.appointments} booked
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">{ago(s.updatedAt)}</span>
              </div>
              {s.handoffReason && <p className="mt-2 text-sm font-medium text-heading">{s.handoffReason}</p>}
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.lastMessage}</p>
            </button>
          ))}
        </div>

        <section className="min-h-[440px] overflow-hidden rounded-xl border bg-card shadow-card">
          {!selectedId ? (
            <EmptyState icon={MessagesSquare} title="Choose a conversation" description="The full chat opens here." className="h-full min-h-[440px]" />
          ) : !detail.data ? (
            <TableRowsSkeleton rows={6} columns={1} />
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
                <div className="flex-1">
                  <p className="font-semibold text-heading">Conversation</p>
                  <p className="font-mono text-xs text-muted-foreground">{detail.data.sessionId.slice(0, 8)}</p>
                </div>
                {detail.data.emergency && <Siren className="size-5 text-status-danger-fg" aria-label="Emergency" />}
                {detail.data.needsHuman ? (
                  <Button onClick={() => resolve.mutate(detail.data.sessionId)} disabled={resolve.isPending}>
                    <CheckCircle2 /> Contacted · Resolve
                  </Button>
                ) : (
                  <StatusBadge status="completed" />
                )}
              </div>
              <div className="chat-wallpaper max-h-[65vh] flex-1 space-y-2 overflow-y-auto px-5 py-4">
                {detail.data.messages.map((m, i) => (
                  <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap shadow-sm", m.role === "user" ? "bg-chat-out" : "bg-white")}>
                      <p className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase">
                        {m.role === "user" ? <UserRound className="size-3" /> : null}
                        {m.role === "user" ? "Patient" : "Testo Life"}
                      </p>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
