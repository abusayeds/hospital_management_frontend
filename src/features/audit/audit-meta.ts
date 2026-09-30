import type { StatusTone } from "@/components/shared/status-badge";

export const AUDIT_ACTIONS = [
  "LOGIN",
  "LOGIN_FAILED",
  "ACCOUNT_LOCKED",
  "LOGOUT",
  "LOGOUT_ALL",
  "TOKEN_REUSE_DETECTED",
  "CREATE",
  "UPDATE",
  "DELETE",
  "VIEW",
  "ROLE_CHANGE",
  "ACTIVATE",
  "DEACTIVATE",
  "PASSWORD_CHANGE",
  "PASSWORD_RESET",
  "PERMISSION_DENIED",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// Security-relevant events are warm/red; routine ones calm. Always shown with the text label.
export const ACTION_META: Record<AuditAction, { label: string; tone: StatusTone }> = {
  LOGIN: { label: "Signed in", tone: "success" },
  LOGIN_FAILED: { label: "Failed sign-in", tone: "waiting" },
  ACCOUNT_LOCKED: { label: "Account locked", tone: "danger" },
  LOGOUT: { label: "Signed out", tone: "neutral" },
  LOGOUT_ALL: { label: "Signed out everywhere", tone: "neutral" },
  TOKEN_REUSE_DETECTED: { label: "Stolen session blocked", tone: "danger" },
  CREATE: { label: "Created", tone: "info" },
  UPDATE: { label: "Updated", tone: "active" },
  DELETE: { label: "Deleted", tone: "danger" },
  VIEW: { label: "Viewed", tone: "neutral" },
  ROLE_CHANGE: { label: "Role changed", tone: "waiting" },
  ACTIVATE: { label: "Activated", tone: "success" },
  DEACTIVATE: { label: "Deactivated", tone: "neutral" },
  PASSWORD_CHANGE: { label: "Password changed", tone: "active" },
  PASSWORD_RESET: { label: "Password reset", tone: "waiting" },
  PERMISSION_DENIED: { label: "Access denied", tone: "danger" },
};

export const SECURITY_ACTIONS: AuditAction[] = [
  "LOGIN_FAILED",
  "ACCOUNT_LOCKED",
  "TOKEN_REUSE_DETECTED",
  "PERMISSION_DENIED",
  "PASSWORD_RESET",
  "ROLE_CHANGE",
  "DEACTIVATE",
];

export type AuditEntry = {
  id: string;
  actor: { _id: string; name: string; email: string; role: string } | null;
  actorRole: string | null;
  actorLabel: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Dhaka",
  });

export const actorName = (e: AuditEntry) => e.actor?.name ?? e.actorLabel ?? (e.meta?.email as string | undefined) ?? "Unknown";
