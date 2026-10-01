"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Inbox, MessageCircle, Smartphone } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OUTBOX_TONE, OutboxRow, when } from "@/features/automation/types";
import { apiFetch } from "@/lib/api";

export type Preferences = {
  reminders: boolean;
  followUps: boolean;
  labReports: boolean;
  marketing: boolean;
  language: "bn" | "en";
  optOutAll: boolean;
  optOutAt?: string | null;
  optOutReason?: string | null;
};

type TimelineItem =
  | (OutboxRow & { kind: "outbox"; direction: "outbound" })
  | { kind: "chat"; direction: "inbound"; id: string; createdAt: string; channel: string; text: string; conversationId: string };

export type PatientMessagesData = { preferences: Preferences; items: TimelineItem[]; includesChats: boolean };

const CHANNEL_LABEL: Record<string, string> = { whatsapp: "WhatsApp", sms: "SMS", web: "Web chat", inapp: "In-app" };

const SOURCE_LABEL: Record<string, string> = {
  automation: "Automatic",
  chatbot: "Assistant",
  staff: "Staff",
  system: "System",
  test: "Test",
};

/** Every message to this patient's phone (reminders, assistant and staff replies) and their replies */
export function PatientMessages({ patientId, preferences }: { patientId: string; preferences?: React.ReactNode }) {
  const data = useQuery({
    queryKey: ["patient", patientId, "messages"],
    queryFn: () => apiFetch<PatientMessagesData>(`/automation/patients/${patientId}/messages`),
    staleTime: 30_000,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <SectionCard
        title="Messages"
        description={
          data.data?.includesChats
            ? "Everything sent to this patient's phone, and their replies, newest first."
            : "Everything sent to this patient's phone, newest first."
        }
        bodyClassName="p-0"
      >
        {!data.data ? (
          <Skeleton className="m-5 h-60" />
        ) : data.data.items.length === 0 ? (
          <EmptyState icon={Inbox} title="No messages yet" description="Confirmations, reminders and replies will appear here." />
        ) : (
          <ul className="divide-y">
            {data.data.items.map((m) => (
              <li key={`${m.kind}-${m.id}`} className={`flex gap-3 px-5 py-3 ${m.direction === "inbound" ? "bg-muted/30" : ""}`}>
                <span className="mt-0.5 shrink-0 text-muted-foreground">
                  {m.direction === "inbound" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="tabular-nums">{when(m.createdAt)}</span>
                    {m.channel === "sms" ? <Smartphone className="size-3.5" /> : <MessageCircle className="size-3.5" />}
                    <span>{CHANNEL_LABEL[m.channel] ?? m.channel}</span>
                    {m.kind === "outbox" ? (
                      <>
                        <span>· {SOURCE_LABEL[m.source] ?? m.source}</span>
                        {m.ruleKey && <span className="font-mono">· {m.ruleKey}</span>}
                        <StatusBadge tone={OUTBOX_TONE[m.status]}>{m.status}</StatusBadge>
                        {m.simulated && <StatusBadge tone="waiting">simulated</StatusBadge>}
                        {m.replyAction && <StatusBadge tone="success">replied: {m.replyAction}</StatusBadge>}
                      </>
                    ) : (
                      <span>· from the patient</span>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                  {m.kind === "outbox" && m.error && <p className="text-xs text-destructive">{m.error}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      {preferences}
    </div>
  );
}
