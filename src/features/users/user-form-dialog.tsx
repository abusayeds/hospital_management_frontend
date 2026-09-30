"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ApiError, apiFetch, getErrorMessage } from "@/lib/api";
import { useLabel } from "@/lib/language";
import { ROLE_ORDER, ROLES } from "@/lib/navigation";
import type { Role } from "@/lib/permissions";
import { generateTemporaryPassword, ManagedUser, UserWithTempPassword } from "./types";

const baseSchema = z.object({
  name: z.string().trim().min(2, "Enter the full name (at least 2 characters)").max(100),
  email: z.string().trim().min(1, "Enter an email address").email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^(\+?88)?01[3-9]\d{8}$/.test(v), "Enter a valid mobile number (01XXXXXXXXX)"),
  role: z.string().min(1, "Choose a role"),
  temporaryPassword: z.string(),
});
const createSchema = baseSchema.extend({
  temporaryPassword: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Za-z]/, "Add a letter")
    .regex(/\d/, "Add a number"),
});
type Values = z.infer<typeof baseSchema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: ManagedUser | null; // present = edit mode
  onCreated: (result: UserWithTempPassword) => void;
};

export function UserFormDialog({ open, onOpenChange, user, onCreated }: Props) {
  const t = useLabel();
  const queryClient = useQueryClient();
  const editing = Boolean(user);
  const [showPassword, setShowPassword] = useState(true);

  const { register, handleSubmit, reset, setValue, setError, formState } = useForm<Values>({
    resolver: zodResolver(editing ? baseSchema : createSchema),
  });

  // Fresh values every time the dialog opens
  useEffect(() => {
    if (!open) return;
    reset(
      user
        ? { name: user.name, email: user.email, phone: user.phone ?? "", role: user.role, temporaryPassword: "" }
        : { name: "", email: "", phone: "", role: "", temporaryPassword: generateTemporaryPassword() },
    );
  }, [open, user, reset]);

  const save = useMutation<ManagedUser | UserWithTempPassword, Error, Values>({
    mutationFn: (v) => {
      const body = { name: v.name, email: v.email, phone: v.phone, role: v.role as Role };
      return editing
        ? apiFetch<ManagedUser | UserWithTempPassword>(`/users/${user!.id}`, { method: "PATCH", body })
        : apiFetch<ManagedUser | UserWithTempPassword>("/users", { method: "POST", body: { ...body, temporaryPassword: v.temporaryPassword } });
    },
    meta: { silent: true }, // shown next to the fields instead
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users-summary"] });
      onOpenChange(false);
      if (editing) toast.success("User updated");
      else onCreated(result as UserWithTempPassword);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.fieldErrors.length) {
        err.fieldErrors.forEach((f) => setError(f.path.replace(/^body\./, "") as keyof Values, { message: f.message }));
      } else {
        setError("root", { message: getErrorMessage(err) });
      }
    },
  });

  const fieldError = (name: keyof Values) =>
    formState.errors[name] && (
      <p id={`user-${name}-error`} className="text-xs text-destructive">
        {formState.errors[name]?.message}
      </p>
    );

  return (
    <Dialog open={open} onOpenChange={(o) => !save.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">{editing ? "Edit user" : "Add user"}</DialogTitle>
          <DialogDescription>
            {editing ? "Changes are recorded in the audit log." : "The new user signs in with a temporary password and must choose their own."}
          </DialogDescription>
        </DialogHeader>

        <form id="user-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="user-name">Full name · পুরো নাম</Label>
            <Input id="user-name" autoComplete="off" aria-invalid={Boolean(formState.errors.name)} {...register("name")} />
            {fieldError("name")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-email">Email</Label>
            <Input id="user-email" type="email" autoComplete="off" aria-invalid={Boolean(formState.errors.email)} {...register("email")} />
            {fieldError("email")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-phone">
              Mobile <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="user-phone" inputMode="tel" placeholder="01XXXXXXXXX" aria-invalid={Boolean(formState.errors.phone)} {...register("phone")} />
            {fieldError("phone")}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="user-role">Role · রোল</Label>
            <NativeSelect id="user-role" aria-invalid={Boolean(formState.errors.role)} {...register("role")}>
              <option value="">Choose a role…</option>
              {ROLE_ORDER.map((r) => (
                <option key={r} value={r}>
                  {t(ROLES[r])} — {ROLES[r].summary}
                </option>
              ))}
            </NativeSelect>
            {fieldError("role")}
          </div>

          {!editing && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="user-temp">Temporary password</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="user-temp"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="pr-10 font-mono"
                    aria-invalid={Boolean(formState.errors.temporaryPassword)}
                    {...register("temporaryPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setValue("temporaryPassword", generateTemporaryPassword(), { shouldValidate: true })}
                >
                  <Wand2 /> Generate
                </Button>
              </div>
              {fieldError("temporaryPassword")}
            </div>
          )}

          {formState.errors.root && (
            <p role="alert" className="rounded-lg border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm text-status-danger-fg sm:col-span-2">
              {formState.errors.root.message}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" size="lg" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {editing ? "Save changes" : "Create user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
