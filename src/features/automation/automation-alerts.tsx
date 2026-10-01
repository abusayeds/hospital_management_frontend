"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";

type Alert = { id: string; text: string; loud: boolean; ruleKey: string | null };

// Inbox alerts (waiting chats, emergencies) already have the header bell with sound
const HANDLED_BY_INBOX_BELL = new Set(["chat_no_reply", "staff_emergency_alert"]);

/**
 * In-app staff alerts from automation (daily digest for management, send-failure alerts for admins).
 * The server only sends them to users whose role has the alert's permission. Renders nothing.
 */
export function AutomationAlerts() {
  useEffect(() => {
    const s = getSocket();
    const onAlert = (a: Alert) => {
      if (a.ruleKey && HANDLED_BY_INBOX_BELL.has(a.ruleKey)) return;
      const show = a.loud ? toast.error : toast.info;
      show(a.ruleKey === "daily_digest" ? "Daily digest" : "Automation alert", { description: a.text, duration: 15_000 });
    };
    s.on("automation:alert", onAlert);
    return () => {
      s.off("automation:alert", onAlert);
    };
  }, []);
  return null;
}
