import type { StatusTone } from "@/components/shared/status-badge";

/** Shapes returned by /api/v1/automation (mirror backend/src/modules/automation/automation.service.ts) */

export type RuleConfig = Record<string, unknown> & {
  quietHoursOverride: boolean;
  dailyLimit: number;
  channels: ("whatsapp" | "sms")[];
  templateKey: string;
};

export type Rule = {
  key: string;
  title: string;
  description: string;
  trigger: string;
  category: "reminders" | "followUps" | "labReports" | "marketing" | "essential" | "internal";
  essential: boolean;
  cadenceMinutes: number | null;
  enabled: boolean;
  config: RuleConfig;
  defaults: RuleConfig;
  nextSendAt: string | null;
  openJobs: number;
  nextPlannerRun: string | null;
  lastRun: { at: string; kind: string; ok: boolean; errors: string[] } | null;
  last24h: { planned: number; sent: number; cancelled: number; failed: number };
};

export type TemplateVariable = { name: string; type: "string" | "date" | "time" | "number" | "money" | "url"; required: boolean; sample: string };
export type TemplateButton = { action: string; label: { bn: string; en: string } };
export type TemplateContent = {
  bodies: { bn: string; en: string };
  buttons: TemplateButton[];
  whatsappTemplateName: string | null;
  whatsappLanguages: { bn: string; en: string };
  whatsappParams: string[];
};
export type Template = TemplateContent & {
  id: string;
  key: string;
  description: string;
  category: string;
  channels: string[];
  variables: TemplateVariable[];
  isActive: boolean;
  version: number;
  history: (TemplateContent & { version: number; savedAt: string })[];
  updatedAt: string;
};
export type TemplatePreview = {
  errors: string[];
  preview: Record<
    "bn" | "en",
    {
      session: { text: string; buttons: string[] };
      template: { name: string; language: string; parameters: string[]; buttons: string[] } | null;
      missing: string[];
    }
  >;
};

export type OutboxStatus = "queued" | "sending" | "sent" | "delivered" | "read" | "failed" | "cancelled";
export type OutboxRow = {
  id: string;
  createdAt: string;
  sentAt: string | null;
  scheduledFor: string | null;
  status: OutboxStatus;
  channel: "whatsapp" | "sms" | "web" | "inapp";
  source: "automation" | "chatbot" | "staff" | "system" | "test";
  messageKind: "session" | "template" | "sms" | "inapp";
  ruleKey: string | null;
  templateKey: string | null;
  templateVersion: number | null;
  whatsappTemplateName: string | null;
  toType: string;
  to: string;
  patient: { id: string; name?: string; patientCode?: string } | null;
  language: "bn" | "en";
  text: string;
  buttons: string[];
  error: string | null;
  deliveryUpdates: { status: string; at: string; error?: string | null }[];
  related: { type: string; id: string } | null;
  jobId: string | null;
  conversationId: string | null;
  replyAction: string | null;
  repliedAt: string | null;
};

export type Decision = { at: string; action: string; reason: string; detail?: string };
export type Job = {
  id: string;
  ruleKey: string;
  title: string;
  dedupeKey: string;
  scope: { type: string; id: string };
  patient: { id: string; name: string; patientCode: string } | null;
  scheduledFor: string;
  originalScheduledFor: string;
  status: string;
  urgent: boolean;
  deferCount: number;
  cancelReason: string | null;
  lastError: string | null;
  sentAt: string | null;
  decisions: Decision[];
  sendAttempts: { at: string; channel: string; result: string; error?: string | null }[];
  supersededBy: string | null;
  outboxMessageId: string | null;
};

export type Run = {
  id: string;
  ruleKey: string;
  title: string;
  kind: string;
  trigger: string | null;
  startedAt: string;
  durationMs: number | null;
  scanned: number;
  created: number;
  cancelled: number;
  sent: number;
  deferred: number;
  skipped: number;
  failed: number;
  errors: string[];
};

export type AutomationSettings = {
  automationPaused: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  messageNumerals: "bn" | "en";
  automationDailyBudget: number;
  perPhoneDailyCap: number;
  dedupeWindowMinutes: number;
  smsFallbackEnabled: boolean;
  failureAlertThreshold: number;
  whatsappConfigured: boolean;
  sms: { provider: string; connected: boolean };
};

export type Health = {
  scheduler: { running: boolean; startedAt: string | null; lastTickAt: string | null; workerId: string };
  paused: boolean;
  sms: { provider: string; connected: boolean; fallbackEnabled: boolean };
  whatsappConfigured: boolean;
  failedLastHour: number;
  failureAlertThreshold: number;
  queueDepth: number;
  nextHour: number;
  overdue: number;
};

export type PreviewItem = {
  ruleKey: string;
  title: string;
  scheduledFor: string;
  alreadyQueued: boolean;
  to: string;
  patient: { id: string; name: string; patientCode: string } | null;
  decision: string;
  text: string;
};

// ------------------------------------------------------------------ display helpers

export const when = (iso: string | null | undefined, withSeconds = false) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        timeZone: "Asia/Dhaka",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        ...(withSeconds && { second: "2-digit" }),
      })
    : "—";

export const OUTBOX_TONE: Record<OutboxStatus, StatusTone> = {
  queued: "waiting",
  sending: "active",
  sent: "info",
  delivered: "success",
  read: "success",
  failed: "danger",
  cancelled: "neutral",
};

export const JOB_TONE: Record<string, StatusTone> = {
  draft: "neutral",
  scheduled: "info",
  ready: "waiting",
  sending: "active",
  sent: "success",
  failed: "danger",
  cancelled: "neutral",
  superseded: "neutral",
};

export const CATEGORY_LABEL: Record<Rule["category"], string> = {
  reminders: "Reminders",
  followUps: "Follow-ups",
  labReports: "Lab reports",
  marketing: "Marketing",
  essential: "Essential",
  internal: "Internal",
};

export const REASON_LABEL: Record<string, string> = {
  sent: "Sent",
  optOut: "Patient opted out",
  quietHours: "Quiet hours",
  rateLimit: "Daily limit",
  budgetExceeded: "Daily budget",
  preconditionFailed: "No longer needed",
  duplicateSuppressed: "Duplicate suppressed",
  ruleDisabled: "Rule switched off",
  noRecipient: "No recipient",
  superseded: "Superseded",
  manual: "Manual",
  sendFailed: "Send failed",
};

/** Friendly names for rule-specific settings */
export const CONFIG_LABELS: Record<string, { label: string; hint?: string }> = {
  sendAt: { label: "Send at (HH:mm)", hint: "Asia/Dhaka time" },
  minutesBefore: { label: "Minutes before the slot" },
  delayMinutes: { label: "Delay after the no-show (minutes)" },
  daysBefore: { label: "Days before the follow-up date" },
  windowDays: { label: "Already booked within ± days → skip" },
  hoursAfter: { label: "Hours after ordering" },
  labHours: { label: "Lab hours (shown to patients)" },
  labLocation: { label: "Lab location (shown to patients)" },
  staffAlertMinutes: { label: "Staff alert after (minutes)" },
  patientMessageMinutes: { label: "Courtesy message to patient after (minutes)" },
  daysAhead: { label: "Days ahead to notify (1 = today only)" },
  directionsUrl: { label: "Directions link (optional)" },
  queueLink: { label: "Live queue link (optional)" },
  onCallPhones: { label: "On-call WhatsApp numbers (comma separated)", hint: "+8801XXXXXXXXX" },
  dailyLimit: { label: "Max sends per day for this rule" },
  quietHoursOverride: { label: "Urgent messages may send during quiet hours" },
};
