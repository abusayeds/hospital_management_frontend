"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Plus, Power } from "lucide-react";
import { ReactNode, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NativeSelect } from "@/components/ui/native-select";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const PAGE_SIZE = 15;

type CatalogRow = { id: string; isActive: boolean };

type Props<T extends CatalogRow> = {
  endpoint: string; // "/services"
  queryKey: string;
  title: string;
  description: string;
  addLabel: string;
  searchPlaceholder: string;
  columns: DataTableColumn<T>[];
  nameOf: (row: T) => string;
  // Extra filter (category, form …): current value, setter and <option>s
  extraFilter?: { param: string; label: string; options: { value: string; label: string }[] };
  renderForm: (props: { open: boolean; onOpenChange: (o: boolean) => void; item: T | null }) => ReactNode;
};

/**
 * One list screen for the simple catalogs (services, lab tests, medicines), matching
 * the one backend factory that serves them: server-side search and paging, status
 * filter, add/edit dialog and activate/deactivate with confirmation.
 */
export function CatalogScreen<T extends CatalogRow>(props: Props<T>) {
  return (
    <RequirePermission permission="master_data:manage">
      <CatalogContent {...props} />
    </RequirePermission>
  );
}

function CatalogContent<T extends CatalogRow>({ endpoint, queryKey, title, description, addLabel, searchPlaceholder, columns, nameOf, extraFilter, renderForm }: Props<T>) {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("active");
  const [extra, setExtra] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [toggling, setToggling] = useState<T | null>(null);
  const debounced = useDebouncedValue(q);

  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (debounced.trim()) params.set("q", debounced.trim());
  if (status) params.set("status", status);
  if (extraFilter && extra) params.set(extraFilter.param, extra);

  const list = useQuery({
    queryKey: [queryKey, params.toString()],
    queryFn: () => apiFetchPage<T>(`${endpoint}?${params}`),
    placeholderData: keepPreviousData,
  });

  const toggle = useMutation({
    mutationFn: (row: T) => apiFetch<T>(`${endpoint}/${row.id}/${row.isActive ? "deactivate" : "activate"}`, { method: "PATCH" }),
    onSuccess: (row) => {
      toast.success(`${nameOf(row)} ${row.isActive ? "activated" : "deactivated"}`);
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });

  const allColumns: DataTableColumn<T>[] = [
    ...columns,
    { key: "status", header: "Status", className: "hidden sm:table-cell", cell: (r) => <StatusBadge status={r.isActive ? "active_user" : "inactive"} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for ${nameOf(r)}`} />}>
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              className="h-9"
              onClick={() => {
                setEditing(r);
                setFormOpen(true);
              }}
            >
              <Pencil className="size-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="h-9" variant={r.isActive ? "destructive" : "default"} onClick={() => setToggling(r)}>
              <Power className="size-4" /> {r.isActive ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button
            size="xl"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus /> {addLabel}
          </Button>
        }
      />
      <DataTable
        data={list.data?.items ?? []}
        columns={allColumns}
        getRowId={(r) => r.id}
        isLoading={list.isPending}
        searchPlaceholder={searchPlaceholder}
        rowClassName={(r) => (!r.isActive ? "opacity-60" : undefined)}
        server={{
          query: q,
          onQueryChange: (v) => {
            setQ(v);
            setPage(1);
          },
          page,
          pageSize: PAGE_SIZE,
          total: list.data?.pagination.total ?? 0,
          totalPages: list.data?.pagination.totalPages ?? 1,
          onPageChange: setPage,
        }}
        filters={
          <>
            {extraFilter && (
              <NativeSelect
                value={extra}
                onChange={(e) => {
                  setExtra(e.target.value);
                  setPage(1);
                }}
                aria-label={extraFilter.label}
                className="w-auto"
              >
                <option value="">All {extraFilter.label.toLowerCase()}</option>
                {extraFilter.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            )}
            <NativeSelect
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Status"
              className="w-auto"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="">Any status</option>
            </NativeSelect>
          </>
        }
        emptyTitle="Nothing here yet"
        emptyDescription="Try another filter or add a new item."
      />
      {renderForm({ open: formOpen, onOpenChange: setFormOpen, item: editing })}
      <ConfirmDialog
        open={Boolean(toggling)}
        onOpenChange={(o) => !o && setToggling(null)}
        tone={toggling?.isActive ? "danger" : "default"}
        title={toggling ? `${toggling.isActive ? "Deactivate" : "Activate"} ${nameOf(toggling)}?` : ""}
        description={toggling?.isActive ? "It is hidden from pickers. Old records that use it are kept unchanged." : "It becomes available in pickers again."}
        confirmLabel={toggling?.isActive ? "Deactivate" : "Activate"}
        onConfirm={async () => {
          if (toggling) await toggle.mutateAsync(toggling);
        }}
      />
    </div>
  );
}

/** Save hook shared by the catalog dialogs: create or update, refresh the list, close */
export function useCatalogSave<T>(endpoint: string, queryKey: string, item: { id: string } | null, onDone: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => (item ? apiFetch<T>(`${endpoint}/${item.id}`, { method: "PATCH", body }) : apiFetch<T>(endpoint, { method: "POST", body })),
    meta: { silent: true },
    onSuccess: () => {
      toast.success(item ? "Saved" : "Added");
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      onDone();
    },
  });
}
