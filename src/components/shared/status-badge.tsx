"use client";

import { ReactNode } from "react";
import { useLabel } from "@/lib/language";
import { cn } from "@/lib/utils";

/**
 * Semantic status colors — used the same way on every screen:
 *   waiting = amber · active (in consultation) = blue · success = green
 *   neutral (cancelled / no-show) = gray · danger (emergency / unpaid) = red
 *   info (booked / scheduled) = teal
 * A dot + text label is always shown, so status never relies on color alone.
 */
export type StatusTone = "waiting" | "active" | "success" | "neutral" | "danger" | "info";

const TONE_CLASSES: Record<StatusTone, { badge: string; dot: string }> = {
  waiting: { badge: "bg-status-waiting-bg text-status-waiting-fg border-status-waiting-border", dot: "bg-status-waiting-dot" },
  active: { badge: "bg-status-active-bg text-status-active-fg border-status-active-border", dot: "bg-status-active-dot" },
  success: { badge: "bg-status-success-bg text-status-success-fg border-status-success-border", dot: "bg-status-success-dot" },
  neutral: { badge: "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border", dot: "bg-status-neutral-dot" },
  danger: { badge: "bg-status-danger-bg text-status-danger-fg border-status-danger-border", dot: "bg-status-danger-dot" },
  info: { badge: "bg-status-info-bg text-status-info-fg border-status-info-border", dot: "bg-status-info-dot" },
};

// Every domain status in the system maps to one tone + a bilingual label.
export const STATUS_CONFIG = {
  // appointments & queue
  booked: { tone: "info", label: "Booked", labelBn: "বুক করা" },
  checked_in: { tone: "waiting", label: "Waiting", labelBn: "অপেক্ষমাণ" },
  waiting: { tone: "waiting", label: "Waiting", labelBn: "অপেক্ষমাণ" },
  in_consultation: { tone: "active", label: "In consultation", labelBn: "ডাক্তারের কাছে" },
  completed: { tone: "success", label: "Completed", labelBn: "সম্পন্ন" },
  cancelled: { tone: "neutral", label: "Cancelled", labelBn: "বাতিল" },
  no_show: { tone: "neutral", label: "No-show", labelBn: "আসেননি" },
  emergency: { tone: "danger", label: "Emergency", labelBn: "জরুরি" },
  // billing
  paid: { tone: "success", label: "Paid", labelBn: "পরিশোধিত" },
  partial: { tone: "waiting", label: "Partially paid", labelBn: "আংশিক" },
  unpaid: { tone: "danger", label: "Unpaid", labelBn: "বকেয়া" },
  // lab
  pending: { tone: "waiting", label: "Pending", labelBn: "অপেক্ষমাণ" },
  sample_collected: { tone: "active", label: "Sample collected", labelBn: "স্যাম্পল নেওয়া হয়েছে" },
  processing: { tone: "active", label: "Processing", labelBn: "প্রক্রিয়াধীন" },
  ready: { tone: "success", label: "Report ready", labelBn: "রিপোর্ট প্রস্তুত" },
  ordered: { tone: "info", label: "Ordered", labelBn: "অর্ডার হয়েছে" },
  awaiting_verification: { tone: "waiting", label: "To verify", labelBn: "যাচাই বাকি" },
  delivered: { tone: "neutral", label: "Delivered", labelBn: "হস্তান্তরিত" },
  // pharmacy
  in_stock: { tone: "success", label: "In stock", labelBn: "স্টকে আছে" },
  low_stock: { tone: "waiting", label: "Low stock", labelBn: "স্টক কম" },
  out_of_stock: { tone: "danger", label: "Out of stock", labelBn: "স্টক নেই" },
  expiring: { tone: "waiting", label: "Expiring soon", labelBn: "মেয়াদ শেষ হচ্ছে" },
  expired: { tone: "danger", label: "Expired", labelBn: "মেয়াদোত্তীর্ণ" },
  // vitals / triage
  normal: { tone: "success", label: "Normal", labelBn: "স্বাভাবিক" },
  abnormal: { tone: "waiting", label: "Abnormal", labelBn: "অস্বাভাবিক" },
  critical: { tone: "danger", label: "Critical", labelBn: "সংকটাপন্ন" },
  // generic
  active_user: { tone: "success", label: "Active", labelBn: "সক্রিয়" },
  inactive: { tone: "neutral", label: "Inactive", labelBn: "নিষ্ক্রিয়" },
} as const satisfies Record<string, { tone: StatusTone; label: string; labelBn: string }>;

export type StatusKey = keyof typeof STATUS_CONFIG;

type StatusBadgeProps =
  | { status: StatusKey; tone?: never; children?: never; className?: string; size?: "sm" | "md" }
  | { tone: StatusTone; children: ReactNode; status?: never; className?: string; size?: "sm" | "md" };

export function StatusBadge({ status, tone, children, className, size = "sm" }: StatusBadgeProps) {
  const t = useLabel();
  const config = status ? STATUS_CONFIG[status] : undefined;
  const resolvedTone: StatusTone = config?.tone ?? tone ?? "neutral";
  const classes = TONE_CLASSES[resolvedTone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        classes.badge,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", classes.dot)} />
      {config ? t(config) : children}
    </span>
  );
}
