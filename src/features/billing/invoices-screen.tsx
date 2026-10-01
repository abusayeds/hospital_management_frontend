"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Eye, FilePlus2, MoreHorizontal, Printer } from "lucide-react";
import { useCallback, useState } from "react";
import { DataTable, DataTableColumn } from "@/components/shared/data-table";
import { RequirePermission } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { todayDhaka } from "@/lib/appointments";
import { useAuth } from "@/lib/auth";
import { Invoice, METHOD_LABEL, PaymentMethod } from "@/lib/billing";
import { Department, DoctorSummary } from "@/lib/master-data";
import { formatPoisha } from "@/lib/money";
import { formatDate, formatPhone } from "@/lib/patients";
import { useLiveEvents } from "@/lib/socket";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { DailyCollectionCard } from "./daily-collection";
import { PaymentDialog } from "./invoice-actions";
import { InvoiceSheet } from "./invoice-sheet";
import { InvoiceStatusBadge } from "./invoice-status";
import { NewInvoiceDialog } from "./new-invoice-dialog";

const LIVE_EVENTS = ["billing:updated"];
const PAGE_SIZE = 20;

type Preset = { status?: string; from?: string; to?: string };

/**
 * The billing work screen. Pages reuse it with a preset:
 *   Invoices (all) · Collect payment (unpaid) · Dues (overdue) — same table, filters and actions.
 */
export function InvoicesScreen({ title, description, preset = {}, showCollection = true }: { title: string; description: string; preset?: Preset; showCollection?: boolean }) {
  return (
    <RequirePermission permission="bill:read">
      <Content title={title} description={description} preset={preset} showCollection={showCollection} />
    </RequirePermission>
  );
}

function Content({ title, description, preset, showCollection }: { title: string; description: string; preset: Preset; showCollection: boolean }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(preset.status ?? "");
  const [from, setFrom] = useState(preset.from ?? "");
  const [to, setTo] = useState(preset.to ?? "");
  const [doctorId, setDoctorId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [method, setMethod] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<Invoice | null>(null);
  const [quickPay, setQuickPay] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const debouncedQ = useDebouncedValue(q.trim());

  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  for (const [k, v] of Object.entries({ status, from, to, doctorId, departmentId, method, q: debouncedQ })) if (v) params.set(k, v);

  const list = useQuery({ queryKey: ["invoices", params.toString()], queryFn: () => apiFetchPage<Invoice>(`/invoices?${params}`), placeholderData: keepPreviousData });
  const doctors = useQuery({ queryKey: ["doctors", "billing-filter"], queryFn: () => apiFetchPage<DoctorSummary>("/doctors?limit=100"), meta: { silent: true } });
  const departments = useQuery({ queryKey: ["departments", "billing-filter"], queryFn: () => apiFetch<Department[]>("/departments"), meta: { silent: true } });
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    queryClient.invalidateQueries({ queryKey: ["invoice"] });
    queryClient.invalidateQueries({ queryKey: ["daily-collection"] });
  }, [queryClient]);
  useLiveEvents(LIVE_EVENTS, refresh);

  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const columns: DataTableColumn<Invoice>[] = [
    {
      key: "patient",
      header: "Patient",
      cell: (i) => (
        <div>
          <p className="font-medium text-heading">{i.patient.name}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {i.patient.patientCode} · {formatPhone(i.patient.phone)}
          </p>
        </div>
      ),
    },
    {
      key: "no",
      header: "Invoice",
      cell: (i) => (
        <div>
          <p className="font-mono text-sm font-semibold text-heading">{i.invoiceNo}</p>
          <p className="text-xs text-muted-foreground">{formatDate(i.date)}</p>
        </div>
      ),
    },
    { key: "doctor", header: "Doctor / dept", className: "hidden xl:table-cell text-sm", cell: (i) => (i.doctor ? `${i.doctor.displayName}${i.department ? ` · ${i.department.name}` : ""}` : (i.department?.name ?? "Counter")) },
    {
      key: "amount",
      header: "Amount",
      className: "text-right tabular-nums",
      cell: (i) => (
        <div>
          <p className="font-semibold text-heading">{formatPoisha(i.total)}</p>
          {i.amountDue > 0 && i.status !== "void" && <p className="text-xs text-status-danger-fg">Due {formatPoisha(i.amountDue)}</p>}
        </div>
      ),
    },
    { key: "status", header: "Status", cell: (i) => <InvoiceStatusBadge invoice={i} /> },
    { key: "due", header: "Due date", className: "hidden lg:table-cell text-sm tabular-nums", cell: (i) => <span className={i.overdue ? "font-semibold text-status-danger-fg" : ""}>{formatDate(i.dueDate)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (i) => (
        <div className="flex items-center justify-end gap-1.5">
          {can("bill:collect") && i.amountDue > 0 && ["draft", "issued", "partial"].includes(i.status) && (
            <Button size="sm" onClick={() => setPayFor(i)}>
              <CreditCard /> Pay
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`More for ${i.invoiceNo}`} />}>
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="h-9" onClick={() => setOpenId(i.id)}>
                <Eye className="size-4" /> View · issue · refund
              </DropdownMenuItem>
              <DropdownMenuItem className="h-9" render={<a href={`/api/v1/invoices/${i.id}/receipt.pdf`} target="_blank" rel="noopener" />}>
                <Printer className="size-4" /> {i.status === "paid" ? "Receipt" : "Invoice"} PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          can("bill:collect") && (
            <>
              <Button size="xl" variant="outline" onClick={() => setNewOpen(true)}>
                <FilePlus2 /> New bill
              </Button>
              <Button size="xl" onClick={() => setQuickPay(true)}>
                <CreditCard /> Take payment
              </Button>
            </>
          )
        }
      />

      <div className={showCollection ? "grid gap-6 xl:grid-cols-[1fr_320px]" : ""}>
        <DataTable
          data={list.data?.items ?? []}
          columns={columns}
          getRowId={(i) => i.id}
          isLoading={list.isPending}
          onRowClick={(i) => setOpenId(i.id)}
          rowClassName={(i) => (i.status === "void" ? "opacity-50" : i.overdue ? "bg-status-danger-bg/40" : undefined)}
          searchPlaceholder="Invoice no., patient, code or phone"
          server={{
            query: q,
            onQueryChange: (v) => reset(() => setQ(v)),
            page,
            pageSize: PAGE_SIZE,
            total: list.data?.pagination.total ?? 0,
            totalPages: list.data?.pagination.totalPages ?? 1,
            onPageChange: setPage,
          }}
          filters={
            <>
              <NativeSelect value={status} onChange={(e) => reset(() => setStatus(e.target.value))} aria-label="Status" className="w-auto">
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="issued">Issued (unpaid)</option>
                <option value="partial">Partially paid</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
                <option value="void">Void</option>
              </NativeSelect>
              <Input type="date" value={from} max={to || undefined} onChange={(e) => reset(() => setFrom(e.target.value))} aria-label="From date" className="w-auto" />
              <Input type="date" value={to} min={from || undefined} onChange={(e) => reset(() => setTo(e.target.value))} aria-label="To date" className="w-auto" />
              <NativeSelect value={departmentId} onChange={(e) => reset(() => setDepartmentId(e.target.value))} aria-label="Department" className="w-auto max-w-44">
                <option value="">All departments</option>
                {departments.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect value={doctorId} onChange={(e) => reset(() => setDoctorId(e.target.value))} aria-label="Doctor" className="w-auto max-w-48">
                <option value="">All doctors</option>
                {doctors.data?.items.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.displayName}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect value={method} onChange={(e) => reset(() => setMethod(e.target.value))} aria-label="Payment method" className="w-auto">
                <option value="">Any method</option>
                {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {METHOD_LABEL[m].label}
                  </option>
                ))}
              </NativeSelect>
            </>
          }
          emptyTitle="No invoices match"
          emptyDescription="Invoices appear automatically when a doctor closes a visit or a lab report is verified."
        />
        {showCollection && (
          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            <DailyCollectionCard date={todayDhaka()} compact />
          </aside>
        )}
      </div>

      <InvoiceSheet invoiceId={openId} onClose={() => setOpenId(null)} />
      <PaymentDialog open={Boolean(payFor) || quickPay} onOpenChange={(o) => !o && (setPayFor(null), setQuickPay(false))} invoice={payFor} />
      <NewInvoiceDialog open={newOpen} onOpenChange={setNewOpen} onCreated={(inv) => setOpenId(inv.id)} />
    </div>
  );
}
