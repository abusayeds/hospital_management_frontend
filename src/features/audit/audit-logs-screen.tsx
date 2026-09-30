"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FilterX } from "lucide-react";
import { useState } from "react";
import { RoleBadge } from "@/components/layout/role-badge";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { apiFetchPage } from "@/lib/api";
import type { Role } from "@/lib/permissions";
import type { ManagedUser } from "../users/types";
import { ACTION_META, actorName, AUDIT_ACTIONS, AuditEntry, formatDateTime } from "./audit-meta";
import { AuditDetailSheet } from "./audit-detail-sheet";

const PAGE_SIZE = 15;
const ENTITY_TYPES = ["User", "Auth", "Route"];

export function AuditLogsScreen() {
  return (
    <RequirePermission permission="audit:read">
      <AuditContent />
    </RequirePermission>
  );
}

function AuditContent() {
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (actor) params.set("actor", actor);
  if (action) params.set("action", action);
  if (entityType) params.set("entityType", entityType);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const logs = useQuery({
    queryKey: ["audit-logs", params.toString()],
    queryFn: () => apiFetchPage<AuditEntry>(`/audit-logs?${params}`),
    placeholderData: keepPreviousData,
  });
  // For the "user" filter (staff count is small; Phase 7 can switch to a search box)
  const users = useQuery({ queryKey: ["users", "all-for-filter"], queryFn: () => apiFetchPage<ManagedUser>("/users?limit=100") });

  const hasFilters = Boolean(actor || action || entityType || from || to);
  const setFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const columns: DataTableColumn<AuditEntry>[] = [
    { key: "time", header: "When", className: "whitespace-nowrap text-xs tabular-nums", cell: (e) => formatDateTime(e.createdAt) },
    {
      key: "actor",
      header: "Who",
      cell: (e) => (
        <div className="min-w-0 space-y-0.5">
          <p className="truncate font-medium text-heading">{actorName(e)}</p>
          {e.actorRole && <RoleBadge role={e.actorRole as Role} />}
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      cell: (e) => (
        <StatusBadge tone={ACTION_META[e.action]?.tone ?? "neutral"}>{ACTION_META[e.action]?.label ?? e.action}</StatusBadge>
      ),
    },
    {
      key: "entity",
      header: "What",
      className: "hidden md:table-cell",
      cell: (e) => (
        <div className="text-xs">
          <p className="text-heading">{e.entityType}</p>
          <p className="truncate text-muted-foreground">
            {(e.meta?.path as string | undefined) ?? (e.entityId ? `…${e.entityId.slice(-6)}` : "")}
          </p>
        </div>
      ),
    },
    { key: "ip", header: "IP", className: "hidden lg:table-cell font-mono text-xs", cell: (e) => e.ip ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="A permanent record of sign-ins, account changes and denied access. Click any row to see exactly what changed."
      />

      <DataTable
        data={logs.data?.items ?? []}
        columns={columns}
        getRowId={(e) => e.id}
        isLoading={logs.isPending}
        onRowClick={setSelected}
        rowClassName={(e) => (ACTION_META[e.action]?.tone === "danger" ? "bg-status-danger-bg/40" : undefined)}
        server={{
          page,
          pageSize: PAGE_SIZE,
          total: logs.data?.pagination.total ?? 0,
          totalPages: logs.data?.pagination.totalPages ?? 1,
          onPageChange: setPage,
        }}
        filters={
          <>
            <NativeSelect value={actor} onChange={(e) => setFilter(setActor)(e.target.value)} aria-label="Filter by user" className="w-auto max-w-52">
              <option value="">All users</option>
              {users.data?.items.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect value={action} onChange={(e) => setFilter(setAction)(e.target.value)} aria-label="Filter by action" className="w-auto">
              <option value="">All actions</option>
              {AUDIT_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {ACTION_META[a].label}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect value={entityType} onChange={(e) => setFilter(setEntityType)(e.target.value)} aria-label="Filter by record type" className="w-auto">
              <option value="">All records</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </NativeSelect>
            <Input type="date" value={from} max={to || undefined} onChange={(e) => setFilter(setFrom)(e.target.value)} aria-label="From date" className="w-auto" />
            <Input type="date" value={to} min={from || undefined} onChange={(e) => setFilter(setTo)(e.target.value)} aria-label="To date" className="w-auto" />
            {hasFilters && (
              <Button
                variant="ghost"
                onClick={() => {
                  [setActor, setAction, setEntityType, setFrom, setTo].forEach((s) => s(""));
                  setPage(1);
                }}
              >
                <FilterX /> Clear
              </Button>
            )}
          </>
        }
        emptyTitle={hasFilters ? "No events match these filters" : "No events yet"}
        emptyDescription={hasFilters ? "Try a wider date range or clear the filters." : "Sign-ins and account changes will appear here."}
      />

      <AuditDetailSheet entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
