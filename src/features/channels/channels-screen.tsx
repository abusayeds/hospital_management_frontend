"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Copy, Globe, KeyRound, Loader2, MessageCircle, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch } from "@/lib/api";

type Channels = {
  web: { enabled: boolean; lastMessageAt: string | null; widgetScript: string };
  whatsapp: { configured: boolean; apiVersion: string; phoneNumberId: string | null; webhookUrl: string; lastMessageAt: string | null };
};

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <code className="flex-1 truncate rounded-lg border bg-muted px-3 py-2 font-mono text-xs">{value}</code>
        <Button
          variant="outline"
          size="icon"
          aria-label={`Copy ${label}`}
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}

function DevOtps() {
  const otps = useQuery({
    queryKey: ["dev-otps"],
    queryFn: () => apiFetch<{ phone: string; code: string; expiresAt: string; attempts: number }[]>("/assistant/admin/dev-otps"),
    refetchInterval: 5000,
    retry: false,
    meta: { silent: true },
  });
  if (otps.error instanceof ApiError && otps.error.status === 404) return null; // production
  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <KeyRound className="size-4" /> Development verification codes
        </span>
      }
      description="SMS is not connected yet. In development the web chat's one-time codes appear here (never in production)."
    >
      {!otps.data?.length ? (
        <p className="text-sm text-muted-foreground">No active codes.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {otps.data.map((o, i) => (
            <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{o.phone}</span>
              <span className="font-mono text-lg font-bold tracking-widest">{o.code}</span>
              <span className="text-xs text-muted-foreground">expires {when(o.expiresAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function ChannelsScreen() {
  const channels = useQuery({ queryKey: ["channels"], queryFn: () => apiFetch<Channels>("/assistant/admin/channels") });
  const [to, setTo] = useState("");
  const test = useMutation({
    mutationFn: () => apiFetch("/assistant/admin/channels/whatsapp/test", { method: "POST", body: { to } }),
    onSuccess: () => toast.success("Test message sent"),
  });
  const c = channels.data;
  return (
    <RequirePermission permission="settings:manage">
      <div className="space-y-6">
        <PageHeader title="Channels · চ্যানেল" description="Where patients can talk to the Testo Life Assistant." />
        {!c ? (
          <Skeleton className="h-64" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title={
                <span className="flex items-center gap-2">
                  <Globe className="size-4" /> Web chat
                </span>
              }
              action={<StatusBadge tone="success">Active</StatusBadge>}
            >
              <div className="space-y-4 text-sm">
                <p>
                  Public page: <Link href="/chat" className="font-medium text-primary underline" target="_blank">/chat</Link> · last patient message: {when(c.web.lastMessageAt)}
                </p>
                <CopyField label="Website widget (paste before </body>)" value={`<script src="${c.web.widgetScript}" async></script>`} />
              </div>
            </SectionCard>

            <SectionCard
              title={
                <span className="flex items-center gap-2">
                  <MessageCircle className="size-4" /> WhatsApp Cloud API
                </span>
              }
              action={c.whatsapp.configured ? <StatusBadge tone="success">Configured</StatusBadge> : <StatusBadge tone="neutral">Not configured</StatusBadge>}
            >
              <div className="space-y-4 text-sm">
                {!c.whatsapp.configured && (
                  <p className="rounded-lg bg-muted px-3 py-2">
                    Set <code>WHATSAPP_PHONE_NUMBER_ID</code>, <code>WHATSAPP_ACCESS_TOKEN</code>, <code>WHATSAPP_VERIFY_TOKEN</code> and{" "}
                    <code>WHATSAPP_APP_SECRET</code> in backend/.env (see the backend guide), then restart the backend.
                  </p>
                )}
                <CopyField label="Webhook URL (Meta → WhatsApp → Configuration)" value={c.whatsapp.webhookUrl} />
                <p className="text-muted-foreground">
                  Phone number id: {c.whatsapp.phoneNumberId ?? "—"} · API {c.whatsapp.apiVersion} · last message: {when(c.whatsapp.lastMessageAt)}
                </p>
                {c.whatsapp.configured && (
                  <form
                    className="flex items-end gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      test.mutate();
                    }}
                  >
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="wa-test">Send a test message to</Label>
                      <Input id="wa-test" value={to} onChange={(e) => setTo(e.target.value)} placeholder="01711223344" />
                    </div>
                    <Button type="submit" disabled={test.isPending || to.length < 8}>
                      {test.isPending ? <Loader2 className="animate-spin" /> : <Send />} Send
                    </Button>
                  </form>
                )}
              </div>
            </SectionCard>
          </div>
        )}
        <DevOtps />
      </div>
    </RequirePermission>
  );
}
