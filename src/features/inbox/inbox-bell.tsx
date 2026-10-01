"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getSocket } from "@/lib/socket";

export type InboxSummary = {
  needsHuman: number;
  emergency: number;
  humanActive: number;
  unreadChats: number; // chats with staff that have patient messages nobody has opened
  unreadMessages: number;
  waitingChats: number; // waiting for a staff member, or with unread messages
  attention: number;
};

/** Inbox counts for the header bell, the sidebar badge and the inbox filters (one shared query) */
export const useInboxSummary = (enabled: boolean) =>
  useQuery({
    queryKey: ["inbox", "summary"],
    queryFn: () => apiFetch<InboxSummary>("/assistant/inbox/summary"),
    enabled,
    refetchInterval: 60_000,
    meta: { silent: true },
  });

/** Short beep with the Web Audio API (no sound file); emergencies beep three times */
const beep = (times: number) => {
  try {
    const ctx = new AudioContext();
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = times > 1 ? 880 : 660;
      gain.gain.value = 0.08;
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.25);
      osc.stop(ctx.currentTime + i * 0.25 + 0.15);
    }
  } catch {
    // Browsers block audio until the user has interacted with the page — the badge still shows
  }
};

/**
 * Header bell. For staff with inbox:manage it shows how many chats need a human, beeps on new
 * hand-over requests (three beeps + a red toast for emergencies) and links to the inbox.
 */
export function InboxBell({ inboxHref }: { inboxHref: string }) {
  const { can } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const allowed = can("inbox:manage");
  const summary = useInboxSummary(allowed);

  useEffect(() => {
    if (!allowed) return;
    const s = getSocket();
    const onAlert = (e: { emergency?: boolean; reminder?: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      beep(e.emergency ? 3 : 1);
      if (e.emergency && !e.reminder)
        toast.error("Emergency message from a patient", {
          description: "Open the inbox now.",
          action: { label: "Open", onClick: () => router.push(inboxHref) },
          duration: 15_000,
        });
      else if (e.reminder) toast.warning("A patient is waiting for a staff reply", { action: { label: "Open", onClick: () => router.push(inboxHref) } });
    };
    const onUpdate = () => queryClient.invalidateQueries({ queryKey: ["inbox", "summary"] });
    s.on("inbox:alert", onAlert);
    s.on("inbox:updated", onUpdate);
    return () => {
      s.off("inbox:alert", onAlert);
      s.off("inbox:updated", onUpdate);
    };
  }, [allowed, queryClient, router, inboxHref]);

  const n = summary.data?.waitingChats ?? summary.data?.attention ?? 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative" aria-label={n ? `Notifications: ${n} chats need a staff member` : "Notifications"} />}>
        <Bell className="size-5" />
        {n > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white ${summary.data?.emergency ? "bg-status-danger-dot" : "bg-primary"}`}>
            {n}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {allowed ? (
          <div className="space-y-2 px-3 py-3 text-sm">
            {summary.data?.emergency ? <p className="font-medium text-status-danger-fg">{summary.data.emergency} emergency chat(s)</p> : null}
            <p>{summary.data?.needsHuman ?? 0} chat(s) need a staff member</p>
            <p className={summary.data?.unreadMessages ? "font-medium text-heading" : "text-muted-foreground"}>
              {summary.data?.unreadMessages ?? 0} unread message(s) in {summary.data?.unreadChats ?? 0} chat(s)
            </p>
            <p className="text-muted-foreground">{summary.data?.humanActive ?? 0} being handled by staff</p>
            <Link href={inboxHref} className="block font-medium text-primary underline">
              Open inbox
            </Link>
          </div>
        ) : (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">Queue updates are live; reminders and follow-up notifications arrive in Phase 6.</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
