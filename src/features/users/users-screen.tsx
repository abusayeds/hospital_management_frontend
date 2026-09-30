"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, MoreHorizontal, Pencil, UserCheck, UserPlus, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RoleBadge } from "@/components/layout/role-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NativeSelect } from "@/components/ui/native-select";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLabel } from "@/lib/language";
import { ROLE_ORDER, ROLES } from "@/lib/navigation";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { TempPasswordDialog } from "./temp-password-dialog";
import { ManagedUser, UserWithTempPassword } from "./types";
import { UserFormDialog } from "./user-form-dialog";

const PAGE_SIZE = 10;

type PendingAction = { kind: "deactivate" | "activate" | "reset"; user: ManagedUser } | null;

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }) : "Never";

export function UsersScreen() {
  return (
    <RequirePermission permission="user:manage">
      <UsersContent />
    </RequirePermission>
  );
}

function UsersContent() {
  const t = useLabel();
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [tempPassword, setTempPassword] = useState<{ name: string; email: string; password: string; reason: "created" | "reset" } | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
  if (role) params.set("role", role);
  if (status) params.set("status", status);

  const users = useQuery({
    queryKey: ["users", params.toString()],
    queryFn: () => apiFetchPage<ManagedUser>(`/users?${params}`),
    placeholderData: keepPreviousData, // keep the old page visible while the next one loads
  });

  const act = useMutation({
    mutationFn: async ({ kind, user }: NonNullable<PendingAction>) => {
      if (kind === "reset") return apiFetch<UserWithTempPassword>(`/users/${user.id}/reset-password`, { method: "POST" });
      return apiFetch<ManagedUser>(`/users/${user.id}/${kind}`, { method: "PATCH" });
    },
    onSuccess: (result, { kind, user }) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users-summary"] });
      if (kind === "reset") {
        setTempPassword({ name: user.name, email: user.email, password: (result as UserWithTempPassword).temporaryPassword, reason: "reset" });
      } else {
        toast.success(kind === "deactivate" ? `${user.name} was deactivated and signed out` : `${user.name} can sign in again`);
      }
    },
  });

  const onCreated = ({ user, temporaryPassword }: UserWithTempPassword) =>
    setTempPassword({ name: user.name, email: user.email, password: temporaryPassword, reason: "created" });

  const columns: DataTableColumn<ManagedUser>[] = [
    {
      key: "name",
      header: "Name",
      cell: (u) => (
        <div className="min-w-0">
          <p className="font-medium text-heading">
            {u.name}
            {u.id === me?.id && <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
        </div>
      ),
    },
    { key: "phone", header: "Mobile", className: "hidden lg:table-cell tabular-nums", cell: (u) => u.phone || "—" },
    { key: "role", header: "Role", cell: (u) => <RoleBadge role={u.role} /> },
    {
      key: "status",
      header: "Status",
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge status={u.isActive ? "active_user" : "inactive"} />
          {u.mustChangePassword && u.isActive && <StatusBadge tone="waiting">Must set password</StatusBadge>}
          {u.lockUntil && new Date(u.lockUntil) > new Date() && <StatusBadge tone="danger">Locked</StatusBadge>}
        </div>
      ),
    },
    { key: "last", header: "Last sign-in", className: "hidden md:table-cell text-xs", cell: (u) => formatDate(u.lastLoginAt) },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (u) => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for ${u.name}`} />}>
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              className="h-9"
              onClick={() => {
                setEditing(u);
                setFormOpen(true);
              }}
            >
              <Pencil className="size-4" /> Edit details
            </DropdownMenuItem>
            <DropdownMenuItem className="h-9" onClick={() => setPending({ kind: "reset", user: u })}>
              <KeyRound className="size-4" /> Reset password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {u.isActive ? (
              <DropdownMenuItem className="h-9" variant="destructive" disabled={u.id === me?.id} onClick={() => setPending({ kind: "deactivate", user: u })}>
                <UserX className="size-4" /> Deactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="h-9" onClick={() => setPending({ kind: "activate", user: u })}>
                <UserCheck className="size-4" /> Activate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const confirmCopy = {
    deactivate: {
      title: `Deactivate ${pending?.user.name}?`,
      description: "They are signed out on every device immediately and cannot sign in until an administrator activates the account again. Nothing is deleted.",
      confirm: "Deactivate",
      tone: "danger" as const,
    },
    activate: {
      title: `Activate ${pending?.user.name}?`,
      description: "They will be able to sign in again with their existing password.",
      confirm: "Activate",
      tone: "default" as const,
    },
    reset: {
      title: `Reset password for ${pending?.user.name}?`,
      description: "A new temporary password is created and shown once. They are signed out everywhere and must choose a new password at next sign-in.",
      confirm: "Reset password",
      tone: "danger" as const,
    },
  };
  const copy = pending ? confirmCopy[pending.kind] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Staff"
        description="Create staff accounts, choose each person's role and control who can sign in. Every change is recorded in the audit log."
        actions={
          <Button
            size="xl"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <UserPlus /> Add user
          </Button>
        }
      />

      <DataTable
        data={users.data?.items ?? []}
        columns={columns}
        getRowId={(u) => u.id}
        isLoading={users.isPending}
        searchPlaceholder="Search name, email or mobile"
        rowClassName={(u) => (!u.isActive ? "opacity-60" : undefined)}
        server={{
          query: search,
          onQueryChange: (q) => {
            setSearch(q);
            setPage(1);
          },
          page,
          pageSize: PAGE_SIZE,
          total: users.data?.pagination.total ?? 0,
          totalPages: users.data?.pagination.totalPages ?? 1,
          onPageChange: setPage,
        }}
        filters={
          <>
            <NativeSelect
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by role"
              className="w-auto"
            >
              <option value="">All roles</option>
              {ROLE_ORDER.map((r) => (
                <option key={r} value={r}>
                  {t(ROLES[r])}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by status"
              className="w-auto"
            >
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </NativeSelect>
          </>
        }
        emptyTitle="No users match these filters"
        emptyDescription="Try another role or status, or add a new user."
      />

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} onCreated={onCreated} />
      <TempPasswordDialog data={tempPassword} onClose={() => setTempPassword(null)} />
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title={copy?.title ?? ""}
        description={copy?.description}
        confirmLabel={copy?.confirm}
        cancelLabel="Cancel"
        tone={copy?.tone}
        onConfirm={async () => {
          if (pending) await act.mutateAsync(pending);
        }}
      />
    </div>
  );
}
