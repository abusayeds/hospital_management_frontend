"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, KeyRound, Lock, LogIn, ShieldAlert, ShieldOff, UserCog } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ColumnChart } from "@/components/shared/charts";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Overview = {
  last24h: { logins: number; failedLogins: number; lockedAccounts: number; permissionDenied: number; tokenReuse: number; ipBlocks: number; exports: number };
  failedLoginsByHour: { hour: string; failed: number }[];
  topFailingIps: { ip: string; count: number; last: string; blocked: boolean }[];
  blocks: {
    ip: string;
    reason: "request_flood" | "failed_logins";
    hits: number;
    blockedAt: string;
    until: string;
    active: boolean;
    timesBlocked: number;
    liftedAt: string | null;
  }[];
  permissionChanges: {
    action: string;
    actor: string;
    actorRole: string | null;
    entityType: string;
    entityId: string | null;
    meta: Record<string, unknown> | null;
    at: string;
  }[];
  limits: Record<string, number>;
};

const REASON: Record<string, string> = { request_flood: "Too many requests", failed_logins: "Failed sign-ins" };
const ACTION: Record<string, string> = {
  ROLE_CHANGE: "Role changed",
  ACTIVATE: "Account activated",
  DEACTIVATE: "Account deactivated",
  PASSWORD_RESET: "Password reset",
};
const LIMIT_LABEL: Record<string, string> = {
  loginPer15Min: "Sign-in attempts / 15 min (per IP + email)",
  refreshPer15Min: "Session refreshes / 15 min",
  changePasswordPer15Min: "Password changes / 15 min",
  userWritesPerHour: "Changes per user / hour",
  userReadsPerHour: "Reads per user / hour",
  chatPerHour: "Assistant answers per chat / hour",
  ipRequestsPerHour: "Requests per IP / hour before block",
  failedLoginsPerHour: "Failed sign-ins per IP / hour before block",
  blockMinutes: "Block length (minutes)",
};
const time = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Admin → Security: sign-in health, blocked networks and permission changes (all from the audit log) */
export function SecurityScreen() {
  return (
    <RequirePermission permission="audit:read">
      <Content />
    </RequirePermission>
  );
}

function Content() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [unblockIp, setUnblockIp] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["security"], queryFn: () => apiFetch<Overview>("/security/overview"), refetchInterval: 60_000 });
  const unblock = useMutation({
    mutationFn: (ip: string) => apiFetch(`/security/blocks/${encodeURIComponent(ip)}`, { method: "DELETE" }),
    meta: { silent: true },
    onSuccess: () => {
      toast.success("Block lifted");
      setUnblockIp(null);
      queryClient.invalidateQueries({ queryKey: ["security"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const d = q.data;
  const active = d?.blocks.filter((b) => b.active) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security · নিরাপত্তা"
        description="Sign-in activity, automatically blocked networks and account permission changes in the last 24 hours."
        actions={
          <Button size="lg" variant="outline" render={<Link href="/admin/audit-logs" />} nativeButton={false}>
            Search the audit log
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Sign-ins" value={d?.last24h.logins ?? "…"} icon={LogIn} hint="Successful, last 24 h" />
        <StatCard
          label="Failed sign-ins"
          value={d?.last24h.failedLogins ?? "…"}
          icon={KeyRound}
          tone={(d?.last24h.failedLogins ?? 0) > 50 ? "danger" : "default"}
          hint={d ? `${d.last24h.lockedAccounts} accounts locked` : undefined}
        />
        <StatCard
          label="Blocked networks"
          value={d ? active.length : "…"}
          icon={Ban}
          tone={active.length ? "danger" : "default"}
          hint={d ? `${d.last24h.ipBlocks} blocks in 24 h` : undefined}
        />
        <StatCard
          label="Access denied"
          value={d?.last24h.permissionDenied ?? "…"}
          icon={ShieldAlert}
          hint={d ? `${d.last24h.tokenReuse} stolen-token alarms · ${d.last24h.exports} exports` : undefined}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <SectionCard title="Failed sign-ins per hour" description="Last 24 hours (Dhaka time)" className="xl:col-span-3">
          {q.isPending ? (
            <div className="h-56 animate-pulse rounded-lg bg-muted" />
          ) : (
            <ColumnChart
              data={(d?.failedLoginsByHour ?? []).map((h) => ({ label: h.hour.slice(11, 13), value: h.failed }))}
              caption="Failed sign-ins per hour"
              highlightLast
            />
          )}
        </SectionCard>
        <SectionCard title="Most failed sign-ins by IP" className="xl:col-span-2" bodyClassName="p-0">
          {!d?.topFailingIps.length ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">No failed sign-ins in the last 24 hours.</p>
          ) : (
            <ul className="divide-y">
              {d.topFailingIps.map((r) => (
                <li key={r.ip} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <span className="flex-1 font-mono">{r.ip}</span>
                  {r.blocked && <Badge variant="destructive">Blocked</Badge>}
                  <span className="text-xs text-muted-foreground">{time(r.last)}</span>
                  <span className="w-10 text-right font-semibold tabular-nums">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Blocked networks"
        description="Blocked automatically for an hour; lift a block if it is the hospital's own network."
        bodyClassName="p-0"
      >
        {!d?.blocks.length ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">No IP has been blocked in the last 7 days.</p>
        ) : (
          <ul className="divide-y">
            {d.blocks.map((b) => (
              <li key={b.ip} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <Lock className={b.active ? "size-4 text-status-danger-fg" : "size-4 text-muted-foreground"} />
                <span className="font-mono font-medium">{b.ip}</span>
                <span className="text-muted-foreground">
                  {REASON[b.reason]} ({b.hits}) · {time(b.blockedAt)}
                  {b.timesBlocked > 1 && ` · blocked ${b.timesBlocked}×`}
                </span>
                <span className="flex-1" />
                {b.active ? (
                  <>
                    <Badge variant="destructive">Until {time(b.until)}</Badge>
                    {can("settings:manage") && (
                      <Button size="sm" variant="outline" onClick={() => setUnblockIp(b.ip)}>
                        <ShieldOff /> Lift block
                      </Button>
                    )}
                  </>
                ) : (
                  <Badge variant="secondary">{b.liftedAt ? "Lifted by an admin" : "Expired"}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Permission changes" description="Roles, activations and password resets (latest 20)" bodyClassName="p-0">
          {!d?.permissionChanges.length ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">No permission changes recorded.</p>
          ) : (
            <ul className="divide-y">
              {d.permissionChanges.map((p, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-3 text-sm">
                  <UserCog className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-heading">
                      {ACTION[p.action] ?? p.action}
                      {p.meta && typeof p.meta.to === "string" && <span className="font-normal text-muted-foreground"> → {String(p.meta.to)}</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      by {p.actor}
                      {p.actorRole && ` (${p.actorRole})`} · {p.entityType} {p.entityId?.slice(-6)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{time(p.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title="Active limits" description="Set in the server configuration">
          <dl className="space-y-2 text-sm">
            {Object.entries(d?.limits ?? {}).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{LIMIT_LABEL[k] ?? k}</dt>
                <dd className="font-semibold tabular-nums">{k === "chatPerHour" && v === 0 ? "Unlimited" : v}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      </div>

      <ConfirmDialog
        open={Boolean(unblockIp)}
        onOpenChange={(o) => !o && setUnblockIp(null)}
        title={`Lift the block on ${unblockIp}?`}
        description="Requests from this network will be accepted again at once. The action is recorded in the audit log."
        confirmLabel="Lift block"
        onConfirm={async () => {
          if (unblockIp) await unblock.mutateAsync(unblockIp).catch(() => undefined);
        }}
      />
    </div>
  );
}
