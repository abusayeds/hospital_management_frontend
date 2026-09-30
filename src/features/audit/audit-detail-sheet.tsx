"use client";

import { ArrowRight, Globe, MonitorSmartphone, UserRound } from "lucide-react";
import { ReactNode } from "react";
import { RoleBadge } from "@/components/layout/role-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ACTION_META, actorName, AuditEntry, formatDateTime } from "./audit-meta";

const show = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

// Human names for common fields
const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  phone: "Mobile",
  role: "Role",
  isActive: "Active",
  mustChangePassword: "Must change password",
};

/** Field-by-field before/after table. Changed rows are highlighted. */
function ChangesTable({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]));
  if (!keys.length) return null;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
          <tr>
            <th className="px-3 py-2 font-semibold">Field</th>
            {before && <th className="px-3 py-2 font-semibold">Before</th>}
            {after && <th className="px-3 py-2 font-semibold">After</th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {keys.map((k) => {
            const b = before?.[k];
            const a = after?.[k];
            const changed = before && after && show(b) !== show(a);
            return (
              <tr key={k} className={cn(changed && "bg-status-waiting-bg/60")}>
                <td className="px-3 py-2 font-medium text-heading">
                  {FIELD_LABELS[k] ?? k}
                  {changed && <span className="sr-only"> (changed)</span>}
                </td>
                {before && <td className={cn("px-3 py-2 break-all", changed && "text-status-danger-fg line-through decoration-1")}>{show(b)}</td>}
                {after && <td className={cn("px-3 py-2 break-all", changed && "font-semibold text-status-success-fg")}>{show(a)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof Globe; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="break-words text-heading">{children}</div>
      </div>
    </div>
  );
}

export function AuditDetailSheet({ entry, onClose }: { entry: AuditEntry | null; onClose: () => void }) {
  const meta = entry ? ACTION_META[entry.action] : null;
  return (
    <Sheet open={Boolean(entry)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg data-[side=right]:sm:max-w-lg">
        {entry && meta && (
          <>
            <SheetHeader className="border-b">
              <div className="flex items-center gap-2 pr-8">
                <StatusBadge tone={meta.tone} size="md">
                  {meta.label}
                </StatusBadge>
                <span className="text-xs text-muted-foreground">{entry.entityType}</span>
              </div>
              <SheetTitle className="text-lg font-semibold text-heading">{formatDateTime(entry.createdAt)}</SheetTitle>
              <SheetDescription>Audit entries are permanent and cannot be edited or deleted.</SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-6">
              <section className="space-y-3">
                <Row icon={UserRound} label="Who">
                  <span className="font-medium">{actorName(entry)}</span>
                  {entry.actor?.email && <span className="block text-xs text-muted-foreground">{entry.actor.email}</span>}
                  {entry.actorRole && <RoleBadge role={entry.actorRole as Role} className="mt-1" />}
                </Row>
                <Row icon={Globe} label="IP address">
                  <span className="font-mono text-xs">{entry.ip ?? "—"}</span>
                </Row>
                <Row icon={MonitorSmartphone} label="Device / browser">
                  <span className="text-xs">{entry.userAgent ?? "—"}</span>
                </Row>
                {entry.entityId && (
                  <Row icon={ArrowRight} label="Record">
                    <span className="font-mono text-xs">
                      {entry.entityType} · {entry.entityId}
                    </span>
                  </Row>
                )}
              </section>

              {(entry.before || entry.after) && (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-heading">What changed</h3>
                  <ChangesTable before={entry.before} after={entry.after} />
                </section>
              )}

              {entry.meta && Object.keys(entry.meta).length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-heading">Details</h3>
                  <dl className="divide-y rounded-lg border text-sm">
                    {Object.entries(entry.meta).map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[140px_1fr] gap-3 px-3 py-2">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="font-mono text-xs break-all text-heading">{show(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
