"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, ShieldAlert, UserCheck, UserPlus, Users } from "lucide-react";
import { RoleBadge } from "@/components/layout/role-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCardsSkeleton, TableRowsSkeleton } from "@/components/shared/loading-skeleton";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { SystemStatus } from "@/components/shared/system-status";
import { Button } from "@/components/ui/button";
import { ACTION_META, actorName, AuditEntry, formatDateTime, SECURITY_ACTIONS } from "@/features/audit/audit-meta";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { ROLE_ORDER } from "@/lib/navigation";
import type { Role } from "@/lib/permissions";
import { TodayAtAGlance } from "@/features/queue/today-glance";
import { DashboardIntro } from "./dashboard-intro";

type UserSummary = { total: number; active: number; inactive: number; byRole: Partial<Record<Role, number>> };
type SecurityStats = { failedLoginsToday: number; lockoutsToday: number; permissionDeniedToday: number; loginsToday: number };

export function AdminDashboard() {
  const summary = useQuery({ queryKey: ["users-summary"], queryFn: () => apiFetch<UserSummary>("/users/summary") });
  const stats = useQuery({ queryKey: ["audit-stats"], queryFn: () => apiFetch<SecurityStats>("/audit-logs/stats"), refetchInterval: 60_000 });
  const events = useQuery({
    queryKey: ["audit-logs", "security-feed"],
    queryFn: () => apiFetchPage<AuditEntry>(`/audit-logs?action=${SECURITY_ACTIONS.join(",")}&limit=8`),
    refetchInterval: 60_000,
  });

  const maxByRole = Math.max(1, ...Object.values(summary.data?.byRole ?? {}).map(Number));

  return (
    <div className="space-y-6">
      <DashboardIntro
        description="Accounts, access and security for the whole hospital."
        actions={
          <Button size="xl" render={<Link href="/admin/users" />} nativeButton={false}>
            <UserPlus /> Manage users
          </Button>
        }
      />

      <TodayAtAGlance />

      {summary.isPending || stats.isPending ? (
        <StatCardsSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total users" value={summary.data?.total ?? 0} icon={Users} hint={`${summary.data?.inactive ?? 0} deactivated`} />
          <StatCard label="Active users" value={summary.data?.active ?? 0} icon={UserCheck} hint={`${stats.data?.loginsToday ?? 0} sign-ins today`} />
          <StatCard
            label="Failed sign-ins today"
            value={stats.data?.failedLoginsToday ?? 0}
            icon={KeyRound}
            tone={stats.data?.failedLoginsToday ? "danger" : "default"}
            hint={`${stats.data?.lockoutsToday ?? 0} account(s) locked`}
          />
          <StatCard
            label="Access denied today"
            value={stats.data?.permissionDeniedToday ?? 0}
            icon={ShieldAlert}
            tone={stats.data?.permissionDeniedToday ? "danger" : "default"}
            hint="Blocked by role permissions"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="Recent security events"
          description="Failed sign-ins, lockouts, denied access and account changes"
          className="lg:col-span-2"
          bodyClassName="p-0"
          action={
            <Button variant="ghost" size="sm" render={<Link href="/admin/audit-logs" />} nativeButton={false}>
              All audit logs
            </Button>
          }
        >
          {events.isPending ? (
            <TableRowsSkeleton rows={5} columns={3} />
          ) : !events.data?.items.length ? (
            <EmptyState title="All quiet" description="No security events yet. They appear here as they happen." />
          ) : (
            <ul className="divide-y">
              {events.data.items.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3">
                  <StatusBadge tone={ACTION_META[e.action].tone}>{ACTION_META[e.action].label}</StatusBadge>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <span className="font-medium text-heading">{actorName(e)}</span>
                    {e.action === "PERMISSION_DENIED" && typeof e.meta?.path === "string" && (
                      <span className="text-muted-foreground"> tried {e.meta.path}</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{formatDateTime(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Users by role">
            {summary.isPending ? (
              <TableRowsSkeleton rows={4} columns={2} />
            ) : (
              <ul className="space-y-2.5">
                {ROLE_ORDER.map((r) => {
                  const count = summary.data?.byRole[r] ?? 0;
                  return (
                    <li key={r} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <RoleBadge role={r} />
                        <span className="font-semibold text-heading tabular-nums">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted" aria-hidden>
                        <div className="h-1.5 rounded-full bg-chart-1" style={{ width: `${(count / maxByRole) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
          <SectionCard title="System health" description="Live from /api/v1/health">
            <SystemStatus variant="detailed" />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
