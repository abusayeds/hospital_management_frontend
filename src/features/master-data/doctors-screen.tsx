"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DoorOpen, Link2Off, MoreHorizontal, Pencil, Plus, Power, Search, Stethoscope } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { RequirePermission } from "@/components/shared/forbidden";
import { StatCardsSkeleton } from "@/components/shared/loading-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { Department, DoctorSummary, HospitalSettings, initials } from "@/lib/master-data";
import { formatPoisha } from "@/lib/money";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { DoctorFormDialog } from "./doctor-form-dialog";

export function DoctorsScreen() {
  return (
    <RequirePermission permission="master_data:manage">
      <DoctorsContent />
    </RequirePermission>
  );
}

export function DoctorAvatar({ doctor, className }: { doctor: Pick<DoctorSummary, "name" | "photoUrl">; className?: string }) {
  if (doctor.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- admin-provided URL from any host
    return <img src={doctor.photoUrl} alt="" className={cn("size-14 shrink-0 rounded-full object-cover", className)} />;
  }
  return (
    <span aria-hidden className={cn("flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-semibold text-primary", className)}>
      {initials(doctor.name)}
    </span>
  );
}

/** "Today 09:00–13:00" / "Not today" / "On leave" — from the doctor's schedule and leaves */
export function TodayChip({ doctor }: { doctor: DoctorSummary }) {
  if (doctor.today.onLeave) return <StatusBadge tone="neutral">On leave today</StatusBadge>;
  if (!doctor.today.sits) return <StatusBadge tone="neutral">Not today</StatusBadge>;
  return <StatusBadge tone="success">Today {doctor.today.sessions.map((s) => `${s.startTime}–${s.endTime}`).join(", ")}</StatusBadge>;
}

function DoctorsContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [editing, setEditing] = useState<DoctorSummary | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toggling, setToggling] = useState<DoctorSummary | null>(null);
  const debounced = useDebouncedValue(search);

  const params = new URLSearchParams({ status, limit: "100" });
  if (departmentId) params.set("departmentId", departmentId);
  if (debounced.trim()) params.set("search", debounced.trim());

  const departments = useQuery({ queryKey: ["departments", "all"], queryFn: () => apiFetch<Department[]>("/departments") });
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => apiFetch<HospitalSettings>("/settings") });
  const doctors = useQuery({
    queryKey: ["doctors", params.toString()],
    queryFn: () => apiFetchPage<DoctorSummary>(`/doctors?${params}`),
    placeholderData: keepPreviousData,
  });

  const toggle = useMutation({
    mutationFn: (d: DoctorSummary) => apiFetch<DoctorSummary>(`/doctors/${d.id}/${d.isActive ? "deactivate" : "activate"}`, { method: "PATCH" }),
    onSuccess: (d) => {
      toast.success(d.isActive ? `${d.displayName} is active again` : `${d.displayName} was deactivated`);
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  const openForm = (d: DoctorSummary | null) => {
    setEditing(d);
    setFormOpen(true);
  };

  const list = doctors.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctors"
        description="Profiles, fees, weekly schedules, leaves and login accounts. The schedule decides which slots reception and patients can book."
        actions={
          <Button size="xl" onClick={() => openForm(null)}>
            <Plus /> Add doctor
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-card sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or specialization" aria-label="Search doctors" className="pl-9" />
        </div>
        <NativeSelect value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} aria-label="Department" className="sm:w-56">
          <option value="">All departments</option>
          {departments.data?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")} aria-label="Status" className="sm:w-40">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </NativeSelect>
        <p className="text-sm text-muted-foreground sm:ml-auto">{doctors.data ? `${doctors.data.pagination.total} doctors` : ""}</p>
      </div>

      {doctors.isPending ? (
        <StatCardsSkeleton count={8} />
      ) : list.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-card">
          <EmptyState icon={Stethoscope} title="No doctors match" description="Try another department or search, or add a new doctor." />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((d) => (
            <article key={d.id} className={cn("flex flex-col rounded-xl border bg-card p-5 shadow-card", !d.isActive && "opacity-60")}>
              <div className="flex items-start gap-4">
                <DoctorAvatar doctor={d} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold text-heading">{d.displayName}</h2>
                  {d.nameBn && <p className="font-bangla text-sm text-muted-foreground">{d.nameBn}</p>}
                  <p className="mt-0.5 text-sm font-medium text-primary">{d.department.name}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for ${d.displayName}`} />}>
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem className="h-9" onClick={() => openForm(d)}>
                      <Pencil className="size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="h-9" variant={d.isActive ? "destructive" : "default"} onClick={() => setToggling(d)}>
                      <Power className="size-4" /> {d.isActive ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {d.degrees && <p className="mt-3 line-clamp-1 text-xs text-muted-foreground">{d.degrees}</p>}
              {d.specialization && <p className="text-sm text-foreground">{d.specialization}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <TodayChip doctor={d} />
                {!d.account && d.isActive && (
                  <StatusBadge tone="waiting">
                    <Link2Off className="size-3" /> No login
                  </StatusBadge>
                )}
              </div>
              <dl className="mt-auto grid grid-cols-3 gap-2 border-t pt-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Fee</dt>
                  <dd className="font-semibold text-heading tabular-nums">{formatPoisha(d.consultationFee)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Follow-up</dt>
                  <dd className="font-semibold text-heading tabular-nums">{formatPoisha(d.followUpFee)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Room</dt>
                  <dd className="flex items-center gap-1 font-semibold text-heading">
                    <DoorOpen className="size-3.5 text-muted-foreground" aria-hidden />
                    {d.roomNo ?? "—"}
                  </dd>
                </div>
              </dl>
              <Button variant="outline" className="mt-4" onClick={() => openForm(d)}>
                Edit profile & schedule
              </Button>
            </article>
          ))}
        </div>
      )}

      <DoctorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        doctor={editing}
        departments={departments.data ?? []}
        defaultSlotMinutes={settings.data?.defaultSlotMinutes ?? 10}
      />
      <ConfirmDialog
        open={Boolean(toggling)}
        onOpenChange={(o) => !o && setToggling(null)}
        tone={toggling?.isActive ? "danger" : "default"}
        title={toggling?.isActive ? `Deactivate ${toggling?.displayName}?` : `Activate ${toggling?.displayName}?`}
        description={toggling?.isActive ? "No new appointments can be booked with this doctor. Existing appointments and history stay." : "The doctor can be booked again."}
        confirmLabel={toggling?.isActive ? "Deactivate" : "Activate"}
        onConfirm={async () => {
          if (toggling) await toggle.mutateAsync(toggling);
        }}
      />
    </div>
  );
}
