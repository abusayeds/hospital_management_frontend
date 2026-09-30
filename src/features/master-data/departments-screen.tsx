"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { RequirePermission } from "@/components/shared/forbidden";
import { StatCardsSkeleton } from "@/components/shared/loading-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiFetch, getErrorMessage } from "@/lib/api";
import { Department, DEPARTMENT_ICONS, departmentIcon } from "@/lib/master-data";
import { cn } from "@/lib/utils";
import { FormError, FieldError } from "./form-bits";

export function DepartmentsScreen() {
  return (
    <RequirePermission permission="master_data:manage">
      <DepartmentsContent />
    </RequirePermission>
  );
}

function DepartmentsContent() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Department | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toggling, setToggling] = useState<Department | null>(null);

  const departments = useQuery({ queryKey: ["departments", "all"], queryFn: () => apiFetch<Department[]>("/departments") });

  const toggle = useMutation({
    mutationFn: (d: Department) => apiFetch<Department>(`/departments/${d.id}/${d.isActive ? "deactivate" : "activate"}`, { method: "PATCH" }),
    onSuccess: (d) => {
      toast.success(d.isActive ? `${d.name} is active again` : `${d.name} was deactivated`);
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  const list = departments.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Departments appear in the booking flow in this order. A department with active doctors cannot be deactivated."
        actions={
          <Button
            size="xl"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus /> Add department
          </Button>
        }
      />

      {departments.isPending ? (
        <StatCardsSkeleton count={8} />
      ) : list.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-card">
          <EmptyState icon={Building2} title="No departments yet" description="Add the first department to start adding doctors." />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((d) => {
            const Icon = departmentIcon(d.icon);
            return (
              <article key={d.id} className={cn("flex flex-col rounded-xl border bg-card p-5 shadow-card", !d.isActive && "opacity-60")}>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <StatusBadge status={d.isActive ? "active_user" : "inactive"} />
                </div>
                <h2 className="mt-4 text-base font-semibold text-heading">{d.name}</h2>
                <p className="font-bangla text-sm text-muted-foreground">{d.nameBn}</p>
                {d.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{d.description}</p>}
                <p className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-medium text-foreground">
                  <Users className="size-4 text-muted-foreground" aria-hidden />
                  {d.doctorCount} {d.doctorCount === 1 ? "doctor" : "doctors"}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditing(d);
                      setFormOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setToggling(d)}>
                    {d.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <DepartmentFormDialog open={formOpen} onOpenChange={setFormOpen} department={editing} />
      <ConfirmDialog
        open={Boolean(toggling)}
        onOpenChange={(o) => !o && setToggling(null)}
        tone={toggling?.isActive ? "danger" : "default"}
        title={toggling?.isActive ? `Deactivate ${toggling?.name}?` : `Activate ${toggling?.name}?`}
        description={
          toggling?.isActive
            ? "It disappears from booking screens. Past appointments and history stay unchanged."
            : "It appears in booking screens again."
        }
        confirmLabel={toggling?.isActive ? "Deactivate" : "Activate"}
        onConfirm={async () => {
          if (toggling) await toggle.mutateAsync(toggling);
        }}
      />
    </div>
  );
}

const schema = z.object({
  name: z.string().trim().min(2, "Enter the department name"),
  nameBn: z.string().trim().min(2, "বাংলা নাম লিখুন"),
  description: z.string().trim().max(300),
  icon: z.string(),
  displayOrder: z.coerce.number().int().min(0).max(1000),
});
type Values = z.input<typeof schema>;

function DepartmentFormDialog({ open, onOpenChange, department }: { open: boolean; onOpenChange: (o: boolean) => void; department: Department | null }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, control, setValue, setError, formState } = useForm<Values>({ resolver: zodResolver(schema) });
  const icon = useWatch({ control, name: "icon" });

  useEffect(() => {
    if (!open) return;
    reset(
      department
        ? { name: department.name, nameBn: department.nameBn, description: department.description ?? "", icon: department.icon, displayOrder: department.displayOrder }
        : { name: "", nameBn: "", description: "", icon: "stethoscope", displayOrder: 100 },
    );
  }, [open, department, reset]);

  const save = useMutation({
    mutationFn: (v: Values) => {
      const body = schema.parse(v);
      return department
        ? apiFetch<Department>(`/departments/${department.id}`, { method: "PATCH", body })
        : apiFetch<Department>("/departments", { method: "POST", body });
    },
    meta: { silent: true },
    onSuccess: () => {
      toast.success(department ? "Department updated" : "Department added");
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      onOpenChange(false);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.fieldErrors.length) {
        err.fieldErrors.forEach((f) => setError(f.path.replace(/^body\./, "") as keyof Values, { message: f.message }));
      } else setError("root", { message: getErrorMessage(err) });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !save.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">{department ? "Edit department" : "Add department"}</DialogTitle>
          <DialogDescription>Changes are recorded in the audit log.</DialogDescription>
        </DialogHeader>
        <form id="department-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="dep-name">Name (English)</Label>
            <Input id="dep-name" aria-invalid={Boolean(formState.errors.name)} {...register("name")} />
            <FieldError error={formState.errors.name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dep-nameBn">নাম (বাংলা)</Label>
            <Input id="dep-nameBn" className="font-bangla" aria-invalid={Boolean(formState.errors.nameBn)} {...register("nameBn")} />
            <FieldError error={formState.errors.nameBn} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="dep-desc">
              Description <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea id="dep-desc" rows={2} {...register("description")} />
          </div>
          <fieldset className="space-y-1.5 sm:col-span-2">
            <legend className="text-sm font-medium">Icon</legend>
            <div className="flex flex-wrap gap-2">
              {Object.entries(DEPARTMENT_ICONS).map(([key, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setValue("icon", key)}
                  aria-pressed={icon === key}
                  aria-label={key}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-lg border transition-colors",
                    icon === key ? "border-primary bg-accent text-primary" : "bg-card text-muted-foreground hover:border-primary",
                  )}
                >
                  <Icon className="size-5" />
                </button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="dep-order">Display order</Label>
            <Input id="dep-order" type="number" min={0} {...register("displayOrder")} />
          </div>
          <FormError message={formState.errors.root?.message} className="sm:col-span-2" />
        </form>
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="department-form" size="lg" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {department ? "Save changes" : "Add department"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
